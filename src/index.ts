import { ref } from './reactive/ref'
import { effect } from "./reactive/effect";
import { reactive } from './reactive/reactive'

const animal = ref('dog')
const person = reactive({
  name: 'job'
})

effect(() => {
  console.log(animal.value)
  console.log(person.name)
})

setTimeout(() => {
  animal.value = 'dog'
  person.name = 'bob'
  // console.log(animal);
}, 1000)
