import { createApp, h, ref, watch } from "../src/runtime-dom";
const App: any = {
  name: 'helloWorld',
  setup() {
    const count = ref(1)
    setTimeout(() => {
      count.value ++
    }, 1000)

    watch(count, (value, oldValue) => {
      console.log(value, oldValue);
    })

    return {
      count
    }
  },
  render() {
    return h(
      'div',
      h('div', this.count)
    )
  }
}
createApp(App).mount('#app')
