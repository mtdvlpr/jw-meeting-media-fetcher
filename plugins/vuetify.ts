import { createVuetify } from 'vuetify'
// @ts-ignore
import colors from 'vuetify/lib/util/colors'
import 'vuetify/styles' // pre-build css styles

/* Add build-in icon used internally in various components */
/* Described in https://next.vuetifyjs.com/en/features/icon-fonts/ */
import { mdi, aliases as allAliases } from 'vuetify/iconsets/mdi-svg'
// const aliases = allAliases

const aliases = {
  /* Only used icon aliases here */
  menu: allAliases.menu,
  close: allAliases.close,
  info: allAliases.info,
}

export default defineNuxtPlugin((nuxtApp) => {
  const vuetify = createVuetify({
    icons: {
      defaultSet: 'mdi',
      aliases,
      sets: { mdi },
    },
    theme: {
      themes: {
        light: {
          dark: false,
          colors: {
            primary: '#0d6efd',
            secondary: '#6c757d',
            accent: '#f8f9fa',
            error: '#dc3545',
            info: '#0dcaf0',
            success: colors.green.base,
            warning: '#ffc107',
            // btn: '#212529',
            btn: colors.grey.darken3,
            treasures: '#626262',
            apply: '#9d5d07',
            living: '#942926',
          },
        },
        dark: {
          dark: true,
          colors: {
            primary: '#375a7f',
            secondary: '#626262',
            accent: '#9e9e9e',
            error: '#e74c3c',
            info: '#17a2b8',
            success: colors.green.accent3,
            warning: '#f39c12',
            btn: '#3b3b3b',
            treasures: '#a7a7a7',
            apply: '#ecb368',
            living: '#d27674',
          },
        },
      },
    },
  })

  nuxtApp.vueApp.use(vuetify)

  if (!process.server) console.log('❤️ Initialized Vuetify 3', vuetify)
})
