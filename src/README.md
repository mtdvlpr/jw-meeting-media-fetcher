# Renderer Process

For detailed explanation on how things work, check out the [documentation](https://nuxt.com).

## Special Directories

You can create the following extra directories, some of which have special behaviors.

### `assets`

The assets directory contains your uncompiled assets such as Stylus or Sass files, images, or fonts.

More information about the usage of this directory in [the documentation](https://nuxt.com/docs/guide/directory-structure/assets).

### `components`

The components directory contains your Vue.js components. Components make up the different parts of your page and can be reused and imported into your pages, layouts and even other components.

More information about the usage of this directory in [the documentation](https://nuxt.com/docs/guide/directory-structure/components).

### `composables`

Nuxt uses the composables directory to automatically import your Vue composables into your application using auto-imports!

More information about the usage of this directory in [the documentation](https://nuxt.com/docs/guide/directory-structure/composables).

### `constants`

The constants directory is not a directory from Nuxt, but a self made one that contains constants that are used throughout the application. They are automatically imported into the application using auto-imports.

### `layouts`

Layouts are a great help when you want to change the look and feel of your Nuxt app, whether you want to include a sidebar or have distinct layouts for mobile and desktop.

More information about the usage of this directory in [the documentation](https://nuxt.com/docs/guide/directory-structure/layouts).

### `locales`

The locales directory contains the internationalization files. These are used by the [@nuxtjs/i18n](https://v8.i18n.nuxtjs.org/) module to translate the application into multiple languages.

### `middleware`

The middleware directory contains your application middleware. Middleware lets you define custom functions that can be run before rendering either a page or a group of pages (layout).

More information about the usage of this directory in [the documentation](https://nuxt.com/docs/guide/directory-structure/middleware).

### `pages`

This directory contains your application views and routes. Nuxt will read all the `*.vue` files inside this directory and setup Vue Router automatically.

More information about the usage of this directory in [the documentation](https://nuxt.com/docs/guide/directory-structure/pages).

### `plugins`

The plugins directory contains JavaScript plugins that you want to run before instantiating the root Vue.js Application. This is the place to add Vue plugins and to inject functions or constants. Every time you need to use `Vue.use()`, you should create a file in `plugins/`.

More information about the usage of this directory in [the documentation](https://nuxt.com/docs/guide/directory-structure/plugins).

### `public`

This directory contains your static files. Each file inside this directory is mapped to `/`.

Example: `/public/robots.txt` is mapped as `/robots.txt`.

More information about the usage of this directory in [the documentation](https://nuxt.com/docs/guide/directory-structure/public).

### `stores`

This directory contains your [Pinia](https://pinia.vuejs.org/) store files. They are automatically imported into the application using auto-imports.

### `utils`

Nuxt uses the utils directory to automatically import helper functions and other utilities throughout your application using auto-imports!

More information about the usage of this directory in [the documentation](https://nuxt.com/docs/guide/directory-structure/utils).
