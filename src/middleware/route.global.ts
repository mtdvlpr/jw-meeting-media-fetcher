export default defineNuxtRouteMiddleware((to, from) => {
  log.debug('from', from)
  log.debug('to', to)
  if (from.query.cong && !to.query.cong) {
    to.query.cong = from.query.cong
  } else if (!from.query.cong && !to.query.cong) {
    const ignoreList = ['/', '/media', '/browser']
    if (!ignoreList.includes(to.path)) {
      return navigateTo('/')
    }
  }
})
