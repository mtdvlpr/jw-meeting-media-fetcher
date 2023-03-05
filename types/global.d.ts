export declare global {
  interface Window {
    sockets: WebSocket[]
  }
}

export type VFormRef = {
  id: number | string
  validate: () => Promise<string[]>
  reset: () => void
  resetValidation: () => void
}
