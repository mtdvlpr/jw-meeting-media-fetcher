import { FileStat } from 'webdav/web/types'

export interface CongFile extends FileStat {
  children?: CongFile[]
}

export interface Host {
  name: string
  server: string
  port: string
  dir: string
}
