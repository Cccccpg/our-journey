import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './styles/variables.css'
import './styles/global.css'
import './styles/animations.css'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')