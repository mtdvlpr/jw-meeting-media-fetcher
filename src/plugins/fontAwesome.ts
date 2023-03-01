// eslint-disable-next-line import/named
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { library, config } from '@fortawesome/fontawesome-svg-core'
import {
  faChevronLeft,
  faChevronRight,
  faChevronDown,
  faCaretDown,
  faBuildingUser,
  faTimesCircle,
} from '@fortawesome/free-solid-svg-icons'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('font-awesome-icon', FontAwesomeIcon)
  config.autoAddCss = false
  library.add(
    faChevronDown,
    faChevronLeft,
    faBuildingUser,
    faChevronRight,
    faCaretDown,
    faTimesCircle
  )
})
