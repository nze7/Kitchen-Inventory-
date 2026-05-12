'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Location {
  id: string
  name: string
}

interface Item {
  id: string
  name: string
  unit: string
  location_id: string
}

interface Profile {
  initials: string
}

export default function LogInventoryPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState('')
  const [selectedItem, setSelectedItem] = useState('')
  const [quantity, setQuantity] = useState('')
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('initials')
        .eq('id', user.id)
        .single()

      setProfile(profileData)

      const { data: locData } = await supabase
        .from('locations')
        .select('*')
        .order('name', { ascending: true })
      setLocations(locData || [])

      if (locData && locData.length > 0) {
        setSelectedLocation(locData[0].id)

        const { data: itemData } = await supabase
          .from('items')
          .select('*')
          .eq('location_id', locData[0].id)
          .order('name', { ascending: true })
        setItems(itemData || [])

        if (itemData && itemData.length > 0) {
          setSelectedItem(itemData[0].id)
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleLocationChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const locationId = e.target.value
    setSelectedLocation(locationId)

    try {
      const { data: itemData } = await supabase
        .from('items')
        .select('*')
        .eq('location_id', locationId)
        .order('name', { ascending: true })
      setItems(itemData || [])
      setSelectedItem(itemData && itemData.length > 0 ? itemData[0].id : '')
    } catch (err) {
      console.error('Error fetching items:', err)
    }
  }

  const handleSubmitLog = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!selectedItem || !quantity) {
      setError('Please fill in all required fields')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { error: insertError } = await supabase
        .from('inventory_logs')
        .insert([
          {
            item_id: selectedItem,
            location_id: selectedLocation,
            quantity_on_hand: parseFloat(quantity),
            logged_by: user.id,
            logged_at: new Date(logDate).toISOString(),
            staff_initials: profile?.initials || 'N/A',
            notes: notes || null,
          },
        ])

      if (insertError) throw insertError
      setSuccess(`Inventory logged successfully with initials: ${profile?.initials}`)
      setQuantity('')
      setNotes('')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error logging inventory:', err)
      setError('Failed to log inventory')
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
          <h1 className="text-2xl font-bold text-gray-800">Log Inventory</h1>
          <div />
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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

        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Record Inventory Count</h2>

          <form onSubmit={handleSubmitLog} className="space-y-6">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                id="date"
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <select
                id="location"
                value={selectedLocation}
                onChange={handleLocationChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="item" className="block text-sm font-medium text-gray-700 mb-1">
                Item
              </label>
              <select
                id="item"
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                Quantity on Hand
              </label>
              <input
                id="quantity"
                type="number"
                step="0.01"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., 45.5"
                required
              />
            </div>

            <div>
              <label htmlFor="initials" className="block text-sm font-medium text-gray-700 mb-1">
                Your Initials
              </label>
              <input
                id="initials"
                type="text"
                value={profile?.initials || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded"
            >
              Submit Log
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
