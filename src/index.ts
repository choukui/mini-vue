import { ref } from './reactive/ref'
import { effect } from "./reactive/effect";

const animal = ref('dog')

effect(() => {
  console.log(animal.value)
})

setTimeout(() => {
  animal.value = 'dog'
  // console.log(animal);
}, 1000)
