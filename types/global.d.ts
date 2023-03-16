interface PanzoomChangeEvent {
  x: number
  y: number
  scale: number
  originalEvent: Event
}

export declare global {
  interface Window {
    sockets: WebSocket[]
  }

  interface HTMLElementEventMap {
    panzoomchange: CustomEvent<PanzoomChangeEvent>
  }
}
