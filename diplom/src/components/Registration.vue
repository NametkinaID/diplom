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
            <img class="img-preview">
            <canvas class="draw-canvas" v-on:mousemove="faceSelect" v-on:click="faceSelectClick"></canvas>
        </div>
        <label>
            <input class="photo-input" type="file" name="image" v-on:change="updateImage" :disabled="!allModelLoaded">
            <span class="select-photo">Выбрать фото</span>
        </label>
        <div class="background-loader" v-if="!allModelLoaded || findFaceProcess">
            <div class="loader">
            </div>
            <div v-if="!allModelLoaded">Загрузка моделей</div>
            <div v-if="findFaceProcess">Поиск лиц на фото</div>
        </div>
        <div>
            <label><span>Логин:</span>
                <input type="text" name="login" v-model="login" />
            </label>
        </div>
        <div>
            <button type="submit" v-bind:disabled="selectedIndex === -1 || login.length < 3" v-on:click="createUser">Создать</button>
        </div>
    </div>
</template>

<script>
    //Импортируем библиотеки
    import * as faceapi from 'face-api.js';
    import axios from 'axios';
    const MODEL_URL = '/models'

    function checkPointOnLine(point, lineStart, lineEnd){ // проверить точку на линии
        return Math.max(lineStart, lineEnd) >= point && point >=  Math.min(lineStart, lineEnd);
    }

    export default {
        name: "Registration",
        data: () => ({
            allModelLoaded: false,
            findFaceProcess: false,
            fullFaceDescriptions: [],
            selectedIndex: -1,
            login: '',
        }),
        async created() {
            await faceapi.loadSsdMobilenetv1Model(MODEL_URL);
            await faceapi.loadFaceLandmarkModel(MODEL_URL);
            await faceapi.loadFaceRecognitionModel(MODEL_URL);
            this.allModelLoaded = true;
        },
        methods: {
            updateImage(event){
                const outImage = this.$el.querySelector(".img-preview");
                var tgt = event.target || window.event.srcElement,
                    files = tgt.files;

                // FileReader support
                if (FileReader && files && files.length) {
                    const fr = new FileReader();
                    const canvas = this.$el.querySelector(".draw-canvas");
                    fr.onload = async () => {
                        this.findFaceProcess = true;
                        this.selectedIndex = -1;
                        outImage.src = fr.result;
                        const displaySize = {width: outImage.width, height: outImage.height};

                        let fullFaceDescriptions = await faceapi
                            .detectAllFaces(outImage) // передаём картинку в библиотеку
                            .withFaceLandmarks() // ищем ландмарки,
                            .withFaceDescriptors() || []; // ищем дескриптор лица (128 чисел с плавобщей точкой)
                        this.fullFaceDescriptions = fullFaceDescriptions;
                        fullFaceDescriptions = faceapi.resizeResults(fullFaceDescriptions, displaySize);


                        faceapi.matchDimensions(canvas, displaySize);
                        faceapi.draw.drawDetections(canvas, fullFaceDescriptions);
                        if(fullFaceDescriptions.length === 1){
                            this.selectPhoto(canvas, 0);
                        }
                        this.findFaceProcess = false;
                    }
                    fr.readAsDataURL(files[0]);
                }

                // Not supported
                else {
                    // fallback -- perhaps submit the input to an iframe and temporarily store
                    // them on the server until the user's session ends.
                }
            //    debugger;
            },
            faceSelect(event) {
                if(this.fullFaceDescriptions.length === 0){ // если нет ни одного найденного лица то выходим из функции
                    return;
                }
                const canvas = event.target;
                canvas.style.cursor='default';

                if(this.fullFaceDescriptions.some( // пройдись по всем лицам, и если хоть одно значение верно выполни код внутри
                    ({detection}) => checkPointOnLine(event.layerX/canvas.clientWidth, detection.relativeBox.left, detection.relativeBox.right) &&
                        checkPointOnLine(event.layerY/canvas.clientHeight, detection.relativeBox.top, detection.relativeBox.bottom)
                )) {
                    canvas.style.cursor='pointer';
                }
            },
            faceSelectClick(event){
                if(this.fullFaceDescriptions.length === 0){
                    return;
                }
                const canvas = event.target;
// see DrawBoxOptions below
                const index = this.fullFaceDescriptions.findIndex(
                    ({detection}) => checkPointOnLine(event.layerX/canvas.clientWidth, detection.relativeBox.left, detection.relativeBox.right) &&
                        checkPointOnLine(event.layerY/canvas.clientHeight, detection.relativeBox.top, detection.relativeBox.bottom)
                );
                this.selectPhoto(canvas, index);
            },

            selectPhoto(canvas, index){ // функция для выбора лица и отрисовки на холсте

                const drawOptions = {
                    label: 'Selected!',
                    boxColor: 'green',
                }
                if(index>=0) {
                    const displaySize = {width: canvas.clientWidth, height: canvas.clientHeight};
                    const fullFaceDescriptions = faceapi.resizeResults(this.fullFaceDescriptions, displaySize);
                    const drawBox = new faceapi.draw.DrawBox(fullFaceDescriptions[index].detection.box, drawOptions);
                    fullFaceDescriptions.splice(index,0); // удаляем зелёное лицо из массива

                    faceapi.matchDimensions(canvas, displaySize);
                    faceapi.draw.drawDetections(canvas, fullFaceDescriptions); // рисуем на канвасе синим

                    if(this.selectedIndex === index){
                        delete drawOptions.boxColor;
                        this.selectedIndex = -1;
                    } else {
                        drawBox.draw(canvas)
                        this.selectedIndex = index;
                    }
                }
            },

            createUser(){
                const data = {username: this.login, descriptor: Object.values(this.fullFaceDescriptions[this.selectedIndex].descriptor)}
                axios.post('http://localhost:3000/api/users', data).then(user => {
                    alert("Одноразовый пароль: "+user.data.singPass);
                });
            }
        },
    }
</script>

<style scoped>
.img-preview{
    width: 100%;
    height: 100%;
}
    .draw-canvas{
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
    }
    .container{
        position: relative;
        width: 100%;
        height: 700px;
    }.photo-input{
             display: none;
         }
    .select-photo{
        background: aqua;
        padding: 4px;
        border-radius: 4px;
        display: inline-block;
        cursor: pointer;
    }
</style>