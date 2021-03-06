import { createApp, h, ref } from "../src/runtime-dom";
const App: any = {
  name: 'helloWorld',
  setup() {
    const count = ref(1)
    setTimeout(() => {
      count.value ++
    }, 1000)
    return {
      count
    }
  },
  computed: {
    getName (): number {
      // @ts-ignore
      console.log(this.count)
      // @ts-ignore
      return this.count
    }
  },
  render() {
    return h(
      'div',
      h('div', this.getName)
    )
  }
}
createApp(App, { username: 'Evan' }).mount('#app')
