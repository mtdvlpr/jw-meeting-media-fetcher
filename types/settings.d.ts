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

export interface Setting {
  type?: Field | 'path' | 'date' | 'time'
  key: string
  label?: string
  props?: { [key: string]: any }
  onChange?: (val: any, oldVal: any) => void
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
