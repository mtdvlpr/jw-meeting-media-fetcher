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
  S extends ObsPrefs | ZoomPrefs = ZoomPrefs,
>(
  label: string,
  ref: MaybeRef<T>,
  key: keyof T,
  fallback = 0,
  subKey?: T extends AppPrefs ? keyof S : undefined,
) {
  const { t } = useNuxtApp().$i18n
  const computedLabel = computed(() => {
    const value = subKey
      ? (unref(ref)[key] as S)[subKey] || fallback
      : unref(ref)[key] || fallback
    return t(label).replace('<span>XX</span>', value.toString())
  })

  return computedLabel
}
