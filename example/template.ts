import { createApp, h, ref } from "../src/runtime-dom";
const Child:any = {
  name: 'child',
  setup() {
    const count = ref(1)
    return {
      count
    }
  },
  render() {
    return h('div', `this is children count: ${this.class}`)
  }
}
const App: any = {
  name: 'helloWorld',
  setup() {
    const count = ref(1)
    return {
      count
    }
  },
  render() {
    const foo = `${this.count}`
    return h(
      'div',
      [
        h(Child, { class: foo })
      ]
    )
  }
}
createApp(App, { username: 'Evan' }).mount('#app')
