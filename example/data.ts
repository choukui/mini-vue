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
    return h(
      'div',
      [
        h(Child, { class: this.count }),
        h('div', this.name)
      ]
    )
  }
}
createApp(App, { username: 'Evan' }).mount('#app')
