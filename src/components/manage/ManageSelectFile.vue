<template>
  <v-row align="center">
    <v-col cols="auto" class="pr-0 text-left">
      <v-btn
        :id="`btn-browse-${type}`"
        color="primary"
        style="height: 40px"
        :disabled="loading"
        @click="emit('click')"
      >
        {{ $t('browse') }}
      </v-btn>
    </v-col>
    <v-col class="pl-0">
      <form-input :model-value="path" readonly hide-details="auto" />
    </v-col>
  </v-row>
</template>
<script setup lang="ts">
defineEmits(['click'])
defineProps<{
  type: string
  path: string
  loading?: boolean
}>()
</script>
