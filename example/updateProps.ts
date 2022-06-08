import { createApp, h, ref } from "../src/runtime-dom";
const Child:any = {
  name: 'child',
  setup() {
    const count = ref(1)
    setInterval(() => {
      count.value ++
    },1000)
    return {
      count
    }
  },
  render() {
    return h('div', `I is children count: ${this.class}`)
  }
}
const App: any = {
  name: 'helloWorld',
  setup() {
    const count = ref(1)
    setInterval(() => {
      count.value ++
    }, 1000)
    return {
      count
    }
  },
  render() {
    const foo = `${this.count}`
    return h(
      'div',
      [
        h(Child,
          {
            class: foo
          })]
    )
  }
}
createApp(App, { username: 'Evan' }).mount('#app')
