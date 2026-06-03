'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutGrid, LogOut, Settings, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types/database'

interface NavbarProps {
  profile: Profile | null
}

export function Navbar({ profile }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isAdmin = profile?.role === 'admin'

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-[#0B1F3A] text-white">
      <div className="max-w-7xl mx-auto flex h-14 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <LayoutGrid className="h-5 w-5 text-[#4A9BE8]" />
            Sell Sheet Hub
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className={cn('px-3 py-1.5 rounded text-sm transition-colors hover:bg-white/10', pathname === '/' && 'bg-white/15')}
            >
              Home
            </Link>
            <Link
              href="/categories"
              className={cn('px-3 py-1.5 rounded text-sm transition-colors hover:bg-white/10', pathname.startsWith('/categories') && 'bg-white/15')}
            >
              Categories
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              href="/admin"
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors hover:bg-white/10', pathname.startsWith('/admin') && 'bg-white/15')}
            >
              <Settings className="h-4 w-4" />
              Admin
            </Link>
          )}
          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-white/20">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-medium">{profile?.full_name || 'User'}</span>
              <span className="text-xs text-white/60 capitalize">{profile?.role}</span>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
