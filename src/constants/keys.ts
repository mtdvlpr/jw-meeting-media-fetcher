// Provided by present page
export const zoomPartKey = Symbol('zoomPart') as InjectionKey<Ref<boolean>>
export const mediaActiveKey = Symbol('mediaActive') as InjectionKey<
  Ref<boolean>
>
export const videoActiveKey = Symbol('videoActive') as InjectionKey<
  Ref<boolean>
>

// Provided by manage and present page
export const windowHeightKey = Symbol('windowHeight') as InjectionKey<
  Ref<number>
>

// Provide by media controls
export const ccEnableKey = Symbol('ccEnable') as InjectionKey<Ref<boolean>>
export const showPrefixKey = Symbol('showPrefix') as InjectionKey<Ref<boolean>>
export const sortableKey = Symbol('sortable') as InjectionKey<Ref<boolean>>
