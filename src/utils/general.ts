import { MS_IN_SEC } from '~~/constants/general'

const intervals: { [key: string]: NodeJS.Timer } = {}

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
