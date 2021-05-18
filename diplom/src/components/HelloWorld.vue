<template>
  <div class="hello">
    <nav>
      <ul>
        <li><a href="/login">Логин</a></li>
        <li><a href="/registration">Регистрация</a></li>
        <li><a href="/private">Приват</a></li>
      </ul>
    </nav>
    <button v-if="isLogined" v-on:click="exit">Выход</button>
    <div v-if="isLogined">
      Вы авторизированны.<br>
      Неудачные попытки авторизации:
      <div class="log__list">
        <div class="log__list-item" v-for="log in logList" :key="log._id" v-on:click="selectItem(log)">
          <span>{{log.time}}</span>
          <span>{{log.login}}</span>
        </div>
        <div style="cursor: pointer" v-on:click="moreLoaded" v-if="!last">Подгрузить ещё</div>
      </div>
    </div>
    <div v-if="!isLogined">
      Вы не авторизированны
    </div>
    <section class="background-loader" v-if="selectedLog">
      <div class="background-loader-center">
        <img class="background-loader-image" v-bind:src="selectedLog.photo"  alt=""/>
        <div>time: {{selectedLog.time}}</div>
        <div>login: {{selectedLog.login}}</div>
        <div>password: {{selectedLog.password}}</div>
        <div>single pass: {{selectedLog.singlePass}}</div>
        <button v-on:click="selectedLog=null">Ок</button>
      </div>
    </section>
  </div>
</template>

<script>
  import axios from "axios";

export default {
  name: 'HelloWorld',
  props: {
  },
  data: () => ( {
    anyProps: 1,
    start: 0,
    end: 5,
    defaultCount: 5,
    countPage: 5,
    logList: [],
    selectedLog: null,
    last: false,
  }),
  computed: {
    isLogined () {
      console.log(this.anyProps)
      return !!localStorage.getItem("token");
    }
  },
  mounted() {
    const token = localStorage.getItem("token");
    const config = {
      headers: { Authorization: `Bearer ${token}` }
    };
    axios.get(`http://localhost:3000/api/logs/${this.start}/${this.end}`, config).then(response => {
      this.logList = response.data;
    }).catch(error => {
      this.exit();
      console.log(error);
    });
  },
  methods: {
    exit(){
      localStorage.removeItem("token");
      this.anyProps = Math.random();
    },
    selectItem(item){
      this.selectedLog = item;
    },
    moreLoaded(){
      this.start += this.countPage;
      this.end += this.countPage;
      const token = localStorage.getItem("token");

      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      axios.get(`http://localhost:3000/api/logs/${this.start}/${this.end}`, config).then(response => {
        if(response.data.length === 0){
          this.last = true;
        }
        this.logList = [...this.logList, ...response.data];
      }).catch(error => {
        console.log(error);
        this.exit();
      });
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  .log__list-item{
    cursor: pointer;
  }

  .background-loader-center{

    padding: 10px;
    background: #fff;
    border-radius: 5px;
    color: black;
    display: flex;
    flex-direction: column;
  }

  .background-loader-image{
    width: 300px;
  }

</style>
