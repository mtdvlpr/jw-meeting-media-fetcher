/* eslint-disable import/named */
import {
  FontAwesomeIcon,
  FontAwesomeLayers,
} from '@fortawesome/vue-fontawesome'
import { library, config } from '@fortawesome/fontawesome-svg-core'
import {
  faChevronLeft,
  faChevronRight,
  faChevronDown,
  faCaretDown,
  faExclamationCircle,
  faBuildingUser,
  faXmark,
  faCircleCheck,
  faInfoCircle,
  faPause,
  faPersonRunning,
  faTimesCircle,
} from '@fortawesome/free-solid-svg-icons'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('font-awesome-icon', FontAwesomeIcon)
  nuxtApp.vueApp.component('font-awesome-layers', FontAwesomeLayers)
  config.autoAddCss = false
  library.add(
    faChevronDown,
    faChevronLeft,
    faBuildingUser,
    faExclamationCircle,
    faCircleCheck,
    faInfoCircle,
    faXmark,
    faChevronRight,
    faCaretDown,
    faPause,
    faPersonRunning,
    faTimesCircle
  )
})
