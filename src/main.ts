import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import VueKonva from 'vue-konva'
import App from './App.vue'
import 'vfonts/Lato.css'
import 'vfonts/FiraCode.css'

const app = createApp(App)
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.use(pinia)
app.use(VueKonva)
app.mount('#app')
