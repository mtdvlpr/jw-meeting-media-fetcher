import { createVuetify } from 'vuetify'
import { aliases, fa } from 'vuetify/iconsets/fa-svg'
import 'vuetify/styles' // pre-build css styles

export default defineNuxtPlugin((nuxtApp) => {
  const vuetify = createVuetify({
    icons: {
      defaultSet: 'fa',
      aliases,
      sets: {
        fa,
      },
    },
    theme: {
      themes: {
        light: {
          dark: false,
          colors: {
            bg: '#fff',
            regular: '#000',
            primary: '#0d6efd',
            song: '#055160',
            paragraph: '#41464b',
            secondary: '#6c757d',
            accent: '#f8f9fa',
            error: '#dc3545',
            info: '#0dcaf0',
            success: '#4caf50',
            warning: '#ffc107',
            btn: '#424242',
            treasures: '#626262',
            apply: '#9d5d07',
            living: '#942926',
          },
        },
        dark: {
          dark: true,
          colors: {
            bg: '#121212',
            regular: '#fff',
            primary: '#375a7f',
            song: '#5dbecd',
            paragraph: '#c1c1c1',
            secondary: '#626262',
            accent: '#9e9e9e',
            error: '#e74c3c',
            info: '#17a2b8',
            success: '#00e676',
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
})
