export type Role = 'admin' | 'salesperson'

export interface Profile {
  id: string
  email: string
  full_name: string
  phone: string | null
  title: string | null
  role: Role
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  created_at: string
}

export interface ContactBox {
  page: number
  x: number
  y: number
  width: number
  height: number
  font_color?: string // hex e.g. '#FFFFFF' for white on dark backgrounds
}

export interface SellSheet {
  id: string
  title: string
  description: string | null
  pdf_url: string
  thumbnail_url: string | null
  contact_box: ContactBox | null
  created_by: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SellSheetWithCategories extends SellSheet {
  categories: Category[]
}

export interface SellSheetAccess {
  id: string
  sell_sheet_id: string
  user_id: string
  created_at: string
}

export interface ShareLink {
  id: string
  token: string
  sell_sheet_id: string
  user_id: string
  created_at: string
  expires_at: string | null
}

export interface SellSheetCategory {
  sell_sheet_id: string
  category_id: string
}
