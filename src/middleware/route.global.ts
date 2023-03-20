export default defineNuxtRouteMiddleware((to, from) => {
  log.debug('from', from)
  log.debug('to', to)
  const ignoreList = ['/', '/media', '/browser']
  const ignore = ignoreList.includes(to.path)

  // Redirect on hard refresh
  if (!ignore && from.fullPath === to.fullPath) {
    log.debug('Redirecting to /')
    return navigateTo({ path: '/', query: { cong: undefined } })
  }

  // Add cong if missing
  if (from.query.cong && !to.query.cong) {
    to.query.cong = from.query.cong
  }
})
