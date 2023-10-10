import type { FileStat } from 'webdav/web'

export interface CongFile extends FileStat {
  children?: CongFile[]
}

export interface Host {
  name: string
  server: string
  port: string
  dir: string
}
