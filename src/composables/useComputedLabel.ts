import type { MaybeRef } from '@vueuse/core'
import {
  AppPrefs,
  CongPrefs,
  MediaPrefs,
  MeetingPrefs,
  ObsPrefs,
  ZoomPrefs,
} from '~~/types'

export default function <
  T extends AppPrefs | CongPrefs | MediaPrefs | MeetingPrefs,
  S extends ObsPrefs | ZoomPrefs = ZoomPrefs
>(
  label: string,
  ref: MaybeRef<T>,
  key: keyof T,
  fallback = 0,
  subKey?: T extends AppPrefs ? keyof S : undefined
) {
  const { $i18n } = useNuxtApp()
  const computedLabel = computed(() => {
    const value = subKey
      ? // @ts-expect-error
        unref(ref)[key][subKey] ?? fallback
      : unref(ref)[key] ?? fallback
    return $i18n.t(label).replace('<span>XX</span>', value.toString())
  })

  return computedLabel
}
