export * from './prefs'
export * from './jw'
export * from './media'
export * from './github'
export * from './cong'
export * from './store'
export * from './electron'

export type VFormRef = {
  id: number | string
  validate: () => Promise<string[]>
  reset: () => void
  resetValidation: () => void
}
