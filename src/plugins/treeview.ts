import 'vue3-treeview/dist/style.css'
// @ts-ignore
import Tree from 'vue3-treeview'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('TreeView', Tree)
})
