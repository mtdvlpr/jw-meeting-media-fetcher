export default defineNuxtRouteMiddleware((to, from) => {
  log.debug('from', from)
  log.debug('to', to)
  if (from.query.cong && !to.query.cong) {
    to.query.cong = from.query.cong
  }
})
