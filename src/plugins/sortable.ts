import SortableJs, { MultiDrag } from 'sortablejs'
import VueSortable from 'vue3-sortablejs'

SortableJs.mount(new MultiDrag())

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(VueSortable)
})
