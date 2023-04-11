import { pathToFileURL } from 'url'
// eslint-disable-next-line import/named
import { existsSync } from 'fs-extra'
import { join } from 'upath'
import { JW_ICONS_FONT } from '~/constants/general'

const intervals: { [key: string]: NodeJS.Timer } = {}

export const parseRes = (res?: string) => {
  if (!res) return 0
  return +res.replace(/\D/g, '')
}

export const isValidPort = (port: string | null) => {
  if (!port) return false
  const regexExp =
    /^((6553[0-5])|(655[0-2]\d)|(65[0-4]\d{2})|(6[0-4]\d{3})|([1-5]\d{4})|([0-5]{0,5})|(\d{1,4}))$/gi

  return regexExp.test(port)
}

export async function loadFont(font: 'yeartext' | 'icon') {
  let fontFile = await localFontPath(
    font === 'icon' ? JW_ICONS_FONT : WT_CLEARTEXT_FONT
  )
  if (!existsSync(fontFile)) {
    fontFile = findOne(
      join(
        await wtFontPath(),
        font === 'icon' ? 'jw-icons*' : 'Wt-ClearText-Bold.*'
      )
    )
  }
  if (fontFile && existsSync(fontFile)) {
    const fontFace = new FontFace(
      font === 'icon' ? 'JW-Icons' : 'Wt-ClearText-Bold',
      `url(${pathToFileURL(fontFile).href})`
    )
    try {
      const loadedFont = await fontFace.load()
      document.fonts.add(loadedFont)
      return true
    } catch (e: unknown) {
      log.error(e)
    }
  }
  return false
}

export function executeBeforeMeeting(
  name: string,
  mins: number,
  action: () => void
) {
  if (!intervals[name]) {
    const day = isMeetingDay()
    if (!day) return
    const startTime = getPrefs<string>(`meeting.${day}StartTime`)
    const meetingStarts = startTime?.split(':') ?? ['0', '0']
    const { $dayjs } = useNuxtApp()
    const timeToStop = $dayjs()
      .hour(+meetingStarts[0])
      .minute(+meetingStarts[1])
      .second(0)
      .millisecond(0)
      .subtract(mins, 'm')
    intervals[name] = setInterval(() => {
      const timeLeft = $dayjs
        .duration(timeToStop.diff($dayjs()), 'ms')
        .asSeconds()
      if (timeLeft.toFixed(0) === '0' || timeLeft.toFixed(0) === '-0') {
        action()
        clearInterval(intervals[name])
      } else if (timeLeft < 0) {
        clearInterval(intervals[name])
      }
    }, MS_IN_SEC)
  }
}
