export default defineNuxtRouteMiddleware((to, from) => {
  log.debug('from', from)
  log.debug('to', to)
})
