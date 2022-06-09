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
  name: 'helloWorld',
  setup() {
    const count = ref(1)
    return {
      count
    }
  },
  data() {
    return {
      name: 'job'
    }
  },
  render() {
    const foo = `${this.count}`
    const name = `${this.name}`
    return h(
      'div',
      [
        h(Child, { class: foo }),
        h('div', name)
      ]
    )
  }
}
createApp(App, { username: 'Evan' }).mount('#app')
