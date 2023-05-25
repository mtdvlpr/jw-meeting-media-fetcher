export type Field =
  | 'switch'
  | 'btn-group'
  | 'slider'
  | 'text'
  | 'password'
  | 'switch'
  | 'number'
  | 'select'
  | 'autocomplete'

export interface SubSetting {
  type?: Field
  key: string
  props?: { [key: string]: any }
  onChange?: (val: any, oldVal: any) => void
}
export interface Setting extends SubSetting {
  type?: Field | 'path' | 'date' | 'time' | 'list'
  label?: string
  prepend?: SubSetting
  append?: Action
  explanation?: string
  depends?: string
}

export interface Action {
  type: 'action'
  label: string
  icon?: boolean
  props?: { [key: string]: any }
  action: () => void
  depends?: string
}

export type GroupID =
  | 'general'
  | 'media'
  | 'advanced'
  | 'integrations'
  | 'playback'
  | 'shortcuts'
  | 'meetings'

export type SubGroupID =
  | 'subtitles'
  | 'afterSync'
  | 'mediaAdvanced'
  | 'obs'
  | 'webdav'
  | 'zoom'
  | 'playbackAdvanced'
  | 'music'
export interface Group {
  type: 'group'
  id: SubGroupID
  label: string
  value: (Setting | Action)[]
  depends?: string
}

export interface Settings {
  id: GroupID
  label: string
  settings: (Setting | Group | Action)[]
}
