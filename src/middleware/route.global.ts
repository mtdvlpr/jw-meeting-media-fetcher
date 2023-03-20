export default defineNuxtRouteMiddleware((to, from) => {
  log.debug('from', from)
  log.debug('to', to)
  if (from.fullPath === to.fullPath && from.path !== '/') {
    log.debug('Redirecting to /')
    return navigateTo({ path: '/', query: { cong: undefined } })
  } else if (from.query.cong && !to.query.cong) {
    to.query.cong = from.query.cong
  } else if (!from.query.cong && !to.query.cong) {
    const ignoreList = ['/', '/media', '/browser']
    if (!ignoreList.includes(to.path)) {
      log.debug('Redirecting to /')
      return navigateTo('/')
    }
  }
})
