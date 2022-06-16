import { createApp, h, ref, watch } from "../src/runtime-dom";
import {reactive} from "../src/reactive/reactive";
import { effect } from "../src/reactive/effect";
import {computed} from "../src/reactive/computed";
const App: any = {
  name: 'helloWorld',
  setup() {

    // const state = reactive({ count: 1 })
    const count = ref(1)
    // const plus = computed(() => count.value + 1)

    // watch([() => state.count, count, plus],
    //   (numbers, prevNumbers) => {
    //     // assert types
    //     numbers.concat(1)
    //     prevNumbers.concat(1)
    //     console.log(numbers, prevNumbers)
    //   }
    // )
    // state.count++

    setTimeout(() => {
      // numbers.push(5)
      count.value++
    },1000)

    return {
      count
    }
  },
  // methods: {
  //   handler() {
  //
  //   }
  // },
  watch: {
    count() {
      console.log('option watch')
    }
  },
  render() {
    return h('div','是')
  }
}
createApp(App).mount('#app')
