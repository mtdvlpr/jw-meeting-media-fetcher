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
  explanation?: string
}

export interface Action {
  type: 'action'
  label: string
  action: () => void
}
export interface Group {
  type: 'group'
  label: string
  value: (Setting | Action)[]
}

export type Settings = { [key: string]: (Setting | Group | Action)[] }
