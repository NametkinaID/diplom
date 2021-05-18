<template>
    <div>
        <nav>
            <ul>
                <li><a href="/login">Логин</a></li>
                <li><a href="/registration">Регистрация</a></li>
                <li><a href="/private">Приват</a></li>
            </ul>
        </nav>
        <div class="container">
            <video class="video" width="720" height="560" autoplay muted></video> <!-- для вебкамеры -->
            <canvas class="draw-canvas"></canvas>
        </div>
        <label>
            <span class="select-photo" v-on:click="checkImage">Сканировать</span>
        </label>
        <div>
            <label><span>Логин:</span>
                <input type="text" name="login" v-model="login"/>
            </label>
        </div>
        <div>
            <label><span>Одноразовый пароль:</span>
                <input type="text" name="login" v-model="password"/>
            </label>
        </div>
        <div>
            <button v-on:click="loginCall" :disabled="!descriptor || login.length === 0 || password.length === 0">
                Войти
            </button>
        </div>
        <section class="background-loader" v-if="!allModelLoaded || findFaceProcess">
            <div class="loader">
            </div>
            <div v-if="!allModelLoaded">Загрузка моделей</div>
            <div v-if="findFaceProcess">Поиск лиц на фото</div>
        </section>
        <section class="background-loader" v-if="first">
            <div class="background-loader-center">
                <img v-bind:src="qrCode"  alt=""/>
                Код для авторизации
                <input type="text" v-model="tokenCode" />
                <button v-on:click="verifyCode">Отправить</button>
            </div>
        </section>
    </div>
</template>

<script>
    // ща будем импортировать библиотеку
    import * as faceapi from "face-api.js"; // импортируем первую библиотеку для распознования лиц
    import axios from "axios"; // импортируем вторую библиотеку для работы с бэкендом для отправки запросов на бэкенд

    const MODEL_URL = '/models' // папка с обучеными моделями

    export default {
        name: "Login",

        data: () => ({
            allModelLoaded: false,
            findFaceProcess: false,
            descriptor: null,
            photo: null,
            login: '',
            password: '',
            qrCode: '',
            tokenCode: '',
            first: false,
        }),

        async created() {
            if(localStorage.getItem('token')){
                window.location = "/private";
                return ;
            }

            await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
            await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
            await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
            await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
            await faceapi.loadSsdMobilenetv1Model(MODEL_URL);
            await faceapi.loadFaceLandmarkModel(MODEL_URL);
            await faceapi.loadFaceRecognitionModel(MODEL_URL);
            this.allModelLoaded = true;
        },

        methods: {
            checkImage() {
                if(this.findFaceProcess){
                    return
                }
                this.findFaceProcess = true;
                this.descriptor = null;
                let timeout;
                const video = this.$el.querySelector('.video')
                const canvas = this.$el.querySelector('.draw-canvas')
                const container = this.$el.querySelector('.container')
                const self = this;
                try{
                     navigator.mediaDevices.getUserMedia({video: true}).then(stream => video.srcObject = stream);
                }catch (e) {
                    console.error(e)
                }

                const plaedCalc = () => {
                    faceapi.createCanvasFromMedia(video).getContext('2d').drawImage(canvas, 0, 0);
                    container.style.width = video.clientWidth + "px";
                    container.style.height = video.clientHeight + "px";
                    const displaySize = {width: video.width, height: video.height}
                    faceapi.matchDimensions(canvas, displaySize)
                    const func = async () => { // ищет лицо с камеры и определяет его
                        const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();
                        if (!detections) { // если лица на камеры не найдено повторить функцию через 100 микросекунд
                            timeout = setTimeout(func, 100);
                            return;
                        }
                        const resizedDetections = faceapi.resizeResults(detections, displaySize);
                        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
                        faceapi.draw.drawDetections(canvas, resizedDetections);
                        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
                        faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
                        if (detections.detection.score > 0.9) { // если качество распознования лучше 90% выполняем
                            console.log(detections);
                            this.findFaceProcess = false;
                            video.pause();
                            self.descriptor = await faceapi.detectSingleFace(video)
                                .withFaceLandmarks().withFaceExpressions().withFaceDescriptor();
                            const canvas = faceapi.createCanvasFromMedia(video);
                            self.photo = canvas.toDataURL();
                                canvas.getContext('2d').drawImage(canvas, 0, 0);
                            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
                            const resizedDetections = faceapi.resizeResults([self.descriptor], displaySize);
                            faceapi.draw.drawDetections(canvas, resizedDetections);
                            faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
                            faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
                        } else {
                            timeout = setTimeout(func, 100);
                        }
                    };
                    timeout = setTimeout(func, 100);
                };

                clearTimeout(timeout);
                video.removeEventListener('play', plaedCalc);
                video.addEventListener('play', plaedCalc)

            },
            loginCall() {
                const self = this;
                const data = {
                    descriptor:  Object.values(self.descriptor.descriptor),
                    username:  self.login,
                    password:  self.password,
                    photo: self.photo,
                }
                axios.post(`http://localhost:3000/api/users/${this.login}`, data).then(async (result) => {
                    const {data} = result;

                    if(data.first) {
                        this.first = true;
                        this.qrCode = data.qr;
                    }
                    if(data.token) {
                        localStorage.setItem('token', data.token);
                        window.location = "/private";
                    }
                    console.log(data);
                    //const faceMatcher = new faceapi.FaceMatcher(results);
                }).catch(a => alert(a.response.data.errmsg));
            },
            verifyCode() {
                const data = {
                    token:  this.tokenCode,
                }
                axios.put(`http://localhost:3000/api/users/${this.login}/verify`, data).then(async (result) => {
                    const {data} = result;
                    if(data.ok) {
                        this.first = false;
                        localStorage.setItem('token', data.token);
                        window.location = "/private";
                    }
                }).catch(a => alert(a.response.data.errmsg));
            }
        },
    }
</script>

<style scoped>
    .container {
        position: relative;
        width: 100%;
        height: 700px;
    }
    .background-loader-center{

        padding: 10px;
        background: #fff;
        border-radius: 5px;
        color: black;
        display: flex;
        flex-direction: column;
    }

    .photo-input {
        display: none;
    }

    .select-photo {
        background: aqua;
        padding: 4px;
        border-radius: 4px;
        display: inline-block;
        cursor: pointer;
    }
</style>