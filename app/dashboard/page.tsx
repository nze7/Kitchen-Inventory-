'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Profile {
  role: string
  full_name: string
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        const { data } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', user.id)
          .single()

        setProfile(data)
      } catch (error) {
        console.error('Error fetching profile:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    getProfile()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Kitchen Inventory</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">Welcome, {profile?.full_name || 'User'}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {profile?.role === 'management' ? (
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-8">Management Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Link
                href="/management/locations"
                className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer"
              >
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Locations</h3>
                <p className="text-gray-600">Manage shelves and storage areas</p>
              </Link>

              <Link
                href="/management/items"
                className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer"
              >
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Items</h3>
                <p className="text-gray-600">Add and manage inventory items</p>
              </Link>

              <Link
                href="/management/pars"
                className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer"
              >
                <h3 className="text-xl font-semibold text-gray-800 mb-2">PAR Levels</h3>
                <p className="text-gray-600">Set target quantities</p>
              </Link>

              <Link
                href="/management/users"
                className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer"
              >
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Users</h3>
                <p className="text-gray-600">Invite and manage staff</p>
              </Link>

              <Link
                href="/reports"
                className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer"
              >
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Reports</h3>
                <p className="text-gray-600">View inventory insights and trends</p>
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-8">Staff Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link
                href="/log-inventory"
                className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer"
              >
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Log Inventory</h3>
                <p className="text-gray-600">Record item quantities</p>
              </Link>

              <Link
                href="/history"
                className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer"
              >
                <h3 className="text-xl font-semibold text-gray-800 mb-2">History</h3>
                <p className="text-gray-600">View past inventory logs</p>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
