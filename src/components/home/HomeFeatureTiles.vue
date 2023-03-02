<template>
  <v-col cols="12" class="d-flex py-0">
    <v-col class="text-center flex-shrink-1 px-1 pb-0">
      <v-card
        class="fill-height d-flex justify-center flex-column pb-0"
        :color="jw"
      >
        <v-card-text class="text-center py-2">{{ jwSync }}</v-card-text>
      </v-card>
    </v-col>
    <v-col v-if="congSync" class="text-center flex-shrink-1 px-1 pb-0">
      <v-card
        class="fill-height d-flex justify-center flex-column pb-0"
        :color="cong"
      >
        <v-card-text class="text-center py-2">
          {{ $t('congMedia') }}
        </v-card-text>
      </v-card>
    </v-col>
    <v-col
      v-if="$getPrefs('media.enableMp4Conversion')"
      class="text-center flex-shrink-1 px-1 pb-0"
    >
      <v-card
        class="fill-height d-flex justify-center flex-column pb-0"
        :color="mp4"
      >
        <v-card-text class="text-center py-2">
          {{ $t('convertDownloaded') }}
        </v-card-text>
      </v-card>
    </v-col>
  </v-col>
</template>
<script setup lang="ts">
defineProps<{
  jw: string
  cong: string
  mp4: string
}>()
const { $i18n } = useNuxtApp()
const { client: congSync } = storeToRefs(useCongStore())
const { mediaLang, fallbackLang } = storeToRefs(useMediaStore())
const jwSync = computed(() => {
  let jwSyncString = ''
  if (mediaLang.value?.vernacularName) {
    jwSyncString = `${$i18n.t('syncJwOrgMedia')} (${
      mediaLang.value?.vernacularName
    }`
    if (fallbackLang.value?.vernacularName) {
      jwSyncString += ` / ${fallbackLang.value?.vernacularName}`
    }
    jwSyncString += ')'
  }
  return jwSyncString
})
</script>
