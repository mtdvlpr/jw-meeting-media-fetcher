import 'vue3-treeview/dist/style.css'
// @ts-expect-error
import Tree from 'vue3-treeview'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('TreeView', Tree)
})
