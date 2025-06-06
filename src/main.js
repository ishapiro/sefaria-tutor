import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import App from './App.vue'
import './assets/main.css'

// PrimeVue components
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Paginator from 'primevue/paginator'

// PrimeVue styles
import 'primevue/resources/themes/lara-light-blue/theme.css'
import 'primevue/resources/primevue.min.css'
import 'primeicons/primeicons.css'

const app = createApp(App)

// Register PrimeVue components
app.use(PrimeVue)
app.component('DataTable', DataTable)
app.component('Column', Column)
app.component('Button', Button)
app.component('Card', Card)
app.component('Paginator', Paginator)

app.mount('#app') 