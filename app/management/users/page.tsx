'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface User {
  id: string
  email: string
  full_name: string
  initials: string
  role: string
  created_at: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [initials, setInitials] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, initials, role, created_at')
        .order('created_at', { ascending: false })

      if (data) {
        // Fetch email from auth
        const enrichedUsers = await Promise.all(
          data.map(async (user) => {
            return {
              id: user.id,
              email: '', // We'll set this from auth if possible
              full_name: user.full_name || '',
              initials: user.initials || '',
              role: user.role,
              created_at: user.created_at,
            }
          })
        )
        setUsers(enrichedUsers)
      }
    } catch (err) {
      console.error('Error fetching users:', err)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email || !fullName || !initials) {
      setError('All fields are required')
      return
    }

    try {
      // Note: In production, you would use a secure method to invite users
      // This is a placeholder flow. Supabase Auth requires different setup for user invites.
      // For MVP, admin creates accounts directly or users self-register with admin verification.
      setError('User invite feature requires Supabase setup. Please use Supabase dashboard to invite users.')
    } catch (err) {
      console.error('Error inviting user:', err)
      setError('Failed to invite user')
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-gray-600 hover:text-gray-800">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
          <div />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-6">
            {success}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded mb-6">
          <p className="font-semibold mb-2">Setup Required</p>
          <p>
            To invite staff users, use the Supabase Dashboard to create new auth accounts, then update
            their profile role to 'staff' in the profiles table.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Invite New User</h2>
          <form onSubmit={handleInviteUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="staff@example.com"
                />
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="initials" className="block text-sm font-medium text-gray-700 mb-1">
                  Initials
                </label>
                <input
                  id="initials"
                  type="text"
                  value={initials}
                  onChange={(e) => setInitials(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="JD"
                  maxLength={3}
                />
              </div>
            </div>

            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded"
            >
              Send Invite
            </button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <h2 className="text-xl font-semibold text-gray-800 p-6 border-b">Current Users</h2>
          {users.length === 0 ? (
            <div className="p-6 text-center text-gray-600">No users yet.</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Initials</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Created</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-800">{user.full_name}</td>
                    <td className="px-6 py-3 text-gray-600">{user.initials}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          user.role === 'management'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-600 text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
