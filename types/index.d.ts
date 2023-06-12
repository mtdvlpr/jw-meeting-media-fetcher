export * from './prefs'
export * from './jw'
export * from './media'
export * from './github'
export * from './cong'
export * from './store'
export * from './electron'
export * from './settings'

export type VFormRef = {
  isValidating: boolean
  items: any[]
  id: number | string
  validate: () => Promise<string[]>
  reset: () => void
  resetValidation: () => void
}
