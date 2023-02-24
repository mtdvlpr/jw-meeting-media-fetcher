module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
  },
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
  },
  ignorePatterns: ['dist/*', 'dist-electron/*', 'public/*', 'release/*'],
  extends: [
    '@nuxtjs/eslint-config-typescript',
    'plugin:vuetify/recommended',
    'plugin:prettier/recommended',
  ],
  plugins: [],
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
  },
}
