<script>
import HelloWorld from './components/HelloWorld.vue'
import Registration from "@/components/Registration";
import Login from "@/components/Login";
import NotFound from "@/components/NotFound";

const routes = {
  '/private': HelloWorld,
  '/registration': Registration,
  '/login': Login,
}

export default {
  name: 'App',
  data: () => ({
    currentRoute: window.location.pathname
  }),
  computed: {// computed вычисляемые значения
    ViewComponent () {
      return routes[this.currentRoute] || NotFound
    }
  },
  render (h) { return h(this.ViewComponent) }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
