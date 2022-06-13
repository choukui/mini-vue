import { createApp, h, ref } from "../src/runtime-dom";

const Grandson: any = {
  name: 'grandson',
  inject: ['user'],
  render() {
    return h('div', `this from grandpa count: ${this.user}`)
  }
}

const Child: any = {
  name: 'child',
  inject: ['user'],
  render() {
    return h(
      'div',
      [
        `this from parent count: ${this.user}`,
        h(Grandson)
      ])
  }
}

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
  provide: {
    user: 'John Doe'
  },
  render() {
    return h(
      'div',
      [
        h('div', `this parent count: ${this.count}`),
        h(Child)
      ]
    )
  }
}

createApp(App, { username: 'Evan' }).mixin({
  mounted() {
    console.log('app mixin mounted!')
  }
}).provide('user', 'administrator').mount('#app')

