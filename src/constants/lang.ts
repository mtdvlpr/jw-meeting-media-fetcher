import type { LocaleObject } from '@nuxtjs/i18n/dist/runtime/composables'

export const DAYJS_LOCALES = [
  'de',
  'en',
  'es',
  'et',
  'fi',
  'fr',
  'hu',
  'it',
  // 'mg', not yet supported by dayjs
  'nl',
  'pt',
  'pt-br',
  'ro',
  'ru',
  'sk',
  'sv',
  'uk',
  // 'wes-x-pgw', // not yet supported by dayjs
]

// Languages that have no active translator
export const STALE_LANGS: string[] = ['pt-pt']

export const LOCALES: LocaleObject[] = [
  {
    code: 'de',
    iso: 'de-DE',
    file: 'de.json',
    jw: 'X',
    name: 'Deutsch (German)',
  },
  {
    code: 'en',
    iso: 'en-US',
    file: 'en.json',
    jw: 'E',
    name: 'English (English)',
  },
  {
    code: 'es',
    iso: 'es-ES',
    file: 'es.json',
    jw: 'S',
    name: 'español (Spanish)',
  },
  {
    code: 'et',
    iso: 'et-EE',
    file: 'et.json',
    jw: 'ST',
    name: 'eesti (Estonian)',
  },
  {
    code: 'fi',
    iso: 'fi-FI',
    file: 'fi.json',
    jw: 'FI',
    name: 'suomi (Finnish)',
  },
  {
    code: 'fr',
    iso: 'fr-FR',
    file: 'fr.json',
    jw: 'F',
    name: 'Français (French)',
  },
  {
    code: 'hu',
    iso: 'hu-HU',
    file: 'hu.json',
    jw: 'H',
    name: 'magyar (Hungarian)',
  },
  {
    code: 'it',
    iso: 'it-IT',
    file: 'it.json',
    jw: 'I',
    name: 'Italiano (Italian)',
  },
  {
    code: 'mg',
    iso: 'mg-MG',
    file: 'mg.json',
    jw: 'MG',
    dayjs: 'en',
    name: 'Malagasy (Malagasy)',
  },
  {
    code: 'nl',
    iso: 'nl-NL',
    file: 'nl.json',
    jw: 'O',
    name: 'Nederlands (Dutch)',
  },
  {
    code: 'pt-pt',
    iso: 'pt-PT',
    file: 'pt-pt.json',
    jw: 'TPO',
    dayjs: 'pt',
    name: 'Português - Portugal (Portuguese - Portugal)',
  },
  {
    code: 'pt',
    iso: 'pt-BR',
    file: 'pt.json',
    jw: 'T',
    dayjs: 'pt-br',
    name: 'Português - Brasil (Portuguese - Brazil)',
  },
  {
    code: 'ro',
    iso: 'ro-RO',
    file: 'ro.json',
    jw: 'M',
    name: 'Română (Romanian)',
  },
  {
    code: 'ru',
    iso: 'ru-RU',
    file: 'ru.json',
    jw: 'U',
    name: 'русский (Russian)',
  },
  {
    code: 'sk',
    iso: 'sk-SK',
    file: 'sk.json',
    jw: 'V',
    name: 'slovenčina (Slovak)',
  },
  {
    code: 'sv',
    iso: 'sv-SE',
    file: 'sv.json',
    jw: 'Z',
    name: 'Svenska (Swedish)',
  },
  {
    code: 'uk',
    iso: 'uk-UA',
    file: 'uk.json',
    jw: 'K',
    name: 'українська (Ukrainian)',
  },
  {
    code: 'wes-x-pgw',
    iso: 'wes-x-pgw',
    file: 'wes-x-pgw.json',
    jw: 'PGW',
    dayjs: 'en',
    name: 'Pidgin - West Africa (Pidgin - West Africa)',
  },
]
