import { createApp, h, ref } from "../src/runtime-dom";
const Child:any = {
  name: 'child',
  props: ['class'],
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
  name: 'App',
  setup() {
    const count = ref(1)
    setTimeout(() => {
      count.value ++
    },1000)
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
