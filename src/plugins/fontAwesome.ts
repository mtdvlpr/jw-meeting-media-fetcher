// eslint-disable-next-line import/named
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
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
