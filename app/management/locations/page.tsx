'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Location {
  id: string
  name: string
  description: string | null
  created_at: string
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [newLocation, setNewLocation] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchLocations()
  }, [])

  const fetchLocations = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('locations')
        .select('*')
        .order('name', { ascending: true })

      if (fetchError) throw fetchError
      setLocations(data || [])
    } catch (err) {
      console.error('Error fetching locations:', err)
      setError('Failed to load locations')
    } finally {
      setLoading(false)
    }
  }

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!newLocation.trim()) {
      setError('Location name is required')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { error: insertError } = await supabase
        .from('locations')
        .insert([
          {
            name: newLocation.trim(),
            description: newDescription.trim() || null,
            created_by: user.id,
          },
        ])

      if (insertError) throw insertError
      setNewLocation('')
      setNewDescription('')
      fetchLocations()
    } catch (err) {
      console.error('Error adding location:', err)
      setError('Failed to add location')
    }
  }

  const handleDeleteLocation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return

    try {
      const { error: deleteError } = await supabase
        .from('locations')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      fetchLocations()
    } catch (err) {
      console.error('Error deleting location:', err)
      setError('Failed to delete location')
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
          <h1 className="text-2xl font-bold text-gray-800">Locations</h1>
          <div />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Add New Location</h2>
          <form onSubmit={handleAddLocation} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Location Name
              </label>
              <input
                id="name"
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., Walk-in Freezer, Dry Storage"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                id="description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Additional details about this location"
                rows={3}
              />
            </div>

            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded"
            >
              Add Location
            </button>
          </form>
        </div>

        <div className="grid gap-6">
          <h2 className="text-xl font-semibold text-gray-800">Current Locations</h2>
          {locations.length === 0 ? (
            <p className="text-gray-600">No locations added yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {locations.map((location) => (
                <div key={location.id} className="bg-white p-4 rounded-lg shadow">
                  <h3 className="font-semibold text-gray-800 mb-2">{location.name}</h3>
                  {location.description && (
                    <p className="text-gray-600 text-sm mb-4">{location.description}</p>
                  )}
                  <div className="flex justify-between">
                    <Link
                      href={`/management/locations/${location.id}`}
                      className="text-indigo-600 hover:text-indigo-700 text-sm"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDeleteLocation(location.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
