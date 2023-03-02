import { useRouteQuery } from '@vueuse/router'

export default function (name: string, defaultValue = -1) {
  const query = useRouteQuery(name, defaultValue.toString())
  return computed({
    get: () => Number(query.value),
    set(v) {
      query.value = v.toString()
    },
  })
}
