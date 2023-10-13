import { Images, MediaItem } from './mediaItem'

export interface MediaCategory {
  key: string
  type: string
  name: string
  description: string
  tags: Record<number, string>
  images: Images
  parentCategory?: MediaCategory | null
  subcategories?: MediaCategory[]
  media?: MediaItem[]
}

export interface MediaCategoryResult {
  category: MediaCategory
  pagination: {
    totalCount: number
    offset: number
    limit: number
  }
}
