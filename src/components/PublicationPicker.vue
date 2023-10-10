<template>
  <form-input
    id="select-publication"
    v-model="value"
    field="autocomplete"
    :items="publications"
    :label="$t('selectPublication')"
    hide-details="auto"
    :loading="loading"
    return-object
    v-bind="$attrs"
    :clearable="!!$attrs.clearable"
    :disabled="!!$attrs.disabled"
    class="py-0"
  />
</template>
<script setup lang="ts">
const props = defineProps<{
  modelValue: any
}>()
const loading = ref(true)
const emit = defineEmits(['update:modelValue'])
const value = useVModel(props, 'modelValue', emit)
const publications = ref()
const loadPublications = async () => {
  loading.value = true
  publications.value = await getPublications()
  loading.value = false
}
onMounted(() => {
  loadPublications()
})
async function getPublications() {
  const langSymbol = (await getJWLangs()).find(
    (lang) => lang.langcode === getPrefs<string>('media.lang'),
  )?.symbol
  const result = langSymbol
    ? (await fetchPublicationList(langSymbol)).choices
        .filter((choice: { optionValue: string }) => choice.optionValue)
        .map(
          ({
            optionName: title,
            optionValue: pub,
          }: {
            optionName: string
            optionValue: string
          }) => ({ title, pub }),
        )
    : []
  return result
}
</script>
