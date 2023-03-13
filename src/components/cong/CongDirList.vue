<template>
  <TreeView :config="config" :nodes="tree" class="text-onbg">
    <template #after-input="{ node }">
      <div v-if="node.dir" class="d-flex justify-end" style="width: 100%">
        <v-btn
          icon="fa-arrow-right"
          variant="text"
          rounded
          size="x-small"
          @click="emit('open', node.id)"
        />
      </div>
    </template>
  </TreeView>
</template>
<script setup lang="ts">
import { CongFile } from '~~/types'
interface TreeObj {
  [key: string]: {
    text: string
    dir: boolean
    children: string[]
  }
}

const emit = defineEmits<{
  (e: 'open', filename: string): void
}>()
const props = defineProps<{
  contents: CongFile[]
}>()
const tree = ref({})
onMounted(() => {
  setTree()
})
watch(
  () => props.contents,
  () => {
    setTree()
  }
)
const config = computed(() => {
  return {
    roots: props.contents.map((f) => f.filename),
  }
})

const setTree = () => {
  const treeObj: TreeObj = {}
  props.contents.forEach((file) => {
    addToTree(treeObj, file)
  })
  tree.value = treeObj
}
const addToTree = (treeObj: TreeObj, file: CongFile) => {
  treeObj[file.filename] = {
    text: file.basename,
    dir: file.type === 'directory',
    children: file.children?.map((f) => f.filename) ?? [],
  }
  if (file.children) {
    file.children.forEach((f) => {
      addToTree(treeObj, f)
    })
  }
}
</script>
<style lang="scss">
.node-wrapper {
  .input-wrapper {
    color: inherit !important;
  }
  .icon-wrapper {
    path {
      fill: rgb(var(--v-theme-onbg)) !important;
    }
  }

  &:focus {
    background-color: unset !important;
  }
  &:hover {
    background-color: rgb(var(--v-theme-bg)) !important;
  }
}
</style>
<!--
<template>
  <v-treeview
    v-model="tree"
    :items="contents"
    item-key="filename"
    item-title="basename"
    open-on-click
  >
    <template #prepend="{ item, open }">
      <v-icon v-if="item.type === 'file'" icon="fa-file" />
      <v-icon v-else :icon="open ? faFolderOpen : faFolder" />
    </template>
    <template #append="{ item }">
      <v-btn
        v-if="item.type === 'directory'"
        icon
        @click="emit('open', item.filename)"
      >
        <v-icon icon="fa-arrow-right" />
      </v-btn>
    </template>
  </v-treeview>
</template>
-->
