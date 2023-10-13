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
  props?: Record<string, any>
  onChange?: (val: any, oldVal: any) => void
}
export interface Setting extends SubSetting {
  type?: Field | 'path' | 'date' | 'time' | 'list' | 'shortcut'
  label?: string
  append?: Action
  explanation?: string
  depends?: string
}

export interface Action {
  type: 'action'
  label: string
  icon?: boolean
  explanation?: string
  props?: Record<string, any>
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
  | 'cloudSync'
  | 'webdav'
  | 'zoom'
  | 'playbackAdvanced'
  | 'music'

export interface Group {
  type: 'group'
  id: SubGroupID
  label: string
  icon?: string
  value: (Setting | Action)[]
  depends?: string
}

export interface Settings {
  type?: string
  id: GroupID
  label: string
  icon?: string
  settings: (Setting | Group | Action)[]
}
