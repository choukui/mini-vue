import { createApp, h } from "./runtime-dom";
const App = {
  name: 'helloWorld',
  render() {
    return h('div')
  }
}
createApp(App).mount('#app')
