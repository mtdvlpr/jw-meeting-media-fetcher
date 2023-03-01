<template>
  <v-dialog v-model="active" max-width="500" persistent>
    <v-card>
      <v-card-title class="text-h5">
        {{ $t('areYouSure') }}
      </v-card-title>

      <v-card-text>
        {{ $t(content) }}
      </v-card-text>

      <v-card-actions>
        <v-spacer />

        <v-btn color="error" @click="emit('cancel')">
          {{ $t('cancel') }}
        </v-btn>

        <v-btn color="success" @click="emit('confirm')">
          {{ $t('confirm') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
<script setup lang="ts">
const props = defineProps<{
  content: string
  modelValue: boolean
}>()
const emit = defineEmits(['confirm', 'cancel', 'update:modelValue'])
const active = useVModel(props, 'modelValue', emit)
</script>
