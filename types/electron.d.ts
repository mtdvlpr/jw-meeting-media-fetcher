import { Display, Point } from 'electron'

export interface Screen extends Display {
  humanFriendlyNumber: number
}

export interface ScreenInfo {
  displays: Screen[]
  winMidpoints: { main?: Point; media?: Point }
  winCoordinates: { main?: Point; media?: Point }
  otherScreens: Screen[]
}

export interface MediaWinOptions {
  destination: number | null
  type: 'window' | 'fullscreen'
}
