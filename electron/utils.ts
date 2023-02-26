import { Display, Point, screen } from 'electron'
import { getMainWindow } from './mainWindow'
import { getMediaWin } from './mediaWindow'

interface Screen extends Display {
  humanFriendlyNumber: number
}

// Get screen information
export function getScreenInfo() {
  const win = getMainWindow()
  const mediaWin = getMediaWin()
  let displays: Screen[] = []
  const winMidpoints: { main?: Point; media?: Point } = {}
  const winCoordinates: { main?: Point; media?: Point } = {}
  if (win) {
    try {
      let posSize = win.getPosition().concat(win.getSize())
      winMidpoints.main = {
        x: posSize[0] + posSize[2] / 2,
        y: posSize[1] + posSize[3] / 2,
      }
      if (mediaWin) {
        posSize = mediaWin.getPosition().concat(win.getSize())
        winMidpoints.media = {
          x: posSize[0] + posSize[2] / 2,
          y: posSize[1] + posSize[3] / 2,
        }
      }
      displays = screen.getAllDisplays().map((display, i) => {
        return {
          ...display,
          humanFriendlyNumber: i + 1,
        }
      })
    } catch (err) {
      win?.webContents.send('notifyUser', [
        'errorUnknown',
        { type: 'error' },
        err,
      ])
      console.error(err)
    }
  }
  return {
    displays,
    winMidpoints,
    winCoordinates,
    otherScreens: displays.filter(
      (display) =>
        display.id !==
        screen.getDisplayNearestPoint(winMidpoints.main as Point).id
    ),
  }
}
