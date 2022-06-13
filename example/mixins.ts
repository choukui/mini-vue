import { createApp, h, ref } from "../src/runtime-dom";
const testMixin = {
  beforeCreate() {
    console.log('mixin beforeCreate')
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
  mixins: [ testMixin ],
  // beforeCreate(){
  //   console.log('instance: beforeCreated')
  // },
  // created(){
  //   console.log('instance: created')
  // },
  // beforeMount(){
  //   console.log('instance: beforeMount')
  // },
  // mounted(){
  //   console.log('instance: mounted')
  // },
  // beforeUpdate(){
  //   console.log('instance: beforeUpdate')
  // },
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
