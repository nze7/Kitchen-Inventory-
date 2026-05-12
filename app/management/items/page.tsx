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
  locations: { name: string } | { name: string }[]
}

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [newItem, setNewItem] = useState('')
  const [newUnit, setNewUnit] = useState('count')
  const [newLocationId, setNewLocationId] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data: locData } = await supabase
        .from('locations')
        .select('*')
        .order('name', { ascending: true })
      setLocations(locData || [])

      if (locData && locData.length > 0 && !newLocationId) {
        setNewLocationId(locData[0].id)
      }

      const { data: itemData } = await supabase
        .from('items')
        .select('id, name, unit, location_id, locations(name)')
        .order('name', { ascending: true })

      setItems(itemData || [])
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!newItem.trim()) {
      setError('Item name is required')
      return
    }

    if (!newLocationId) {
      setError('Please select a location')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { error: insertError } = await supabase
        .from('items')
        .insert([
          {
            name: newItem.trim(),
            unit: newUnit,
            location_id: newLocationId,
            created_by: user.id,
          },
        ])

      if (insertError) throw insertError
      setNewItem('')
      setNewUnit('count')
      fetchData()
    } catch (err) {
      console.error('Error adding item:', err)
      setError('Failed to add item')
    }
  }

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const { error: deleteError } = await supabase
        .from('items')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      fetchData()
    } catch (err) {
      console.error('Error deleting item:', err)
      setError('Failed to delete item')
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
          <h1 className="text-2xl font-bold text-gray-800">Items</h1>
          <div />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {locations.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-6">
            Please create locations first before adding items.
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Add New Item</h2>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="item" className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name
                  </label>
                  <input
                    id="item"
                    type="text"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Chicken Breast"
                  />
                </div>

                <div>
                  <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <select
                    id="unit"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="count">Count</option>
                    <option value="lbs">Lbs</option>
                    <option value="kg">Kg</option>
                    <option value="liters">Liters</option>
                    <option value="gallons">Gallons</option>
                    <option value="boxes">Boxes</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <select
                    id="location"
                    value={newLocationId}
                    onChange={(e) => setNewLocationId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded"
              >
                Add Item
              </button>
            </form>
          </div>
        )}

        <div className="grid gap-6">
          <h2 className="text-xl font-semibold text-gray-800">Current Items</h2>
          {items.length === 0 ? (
            <p className="text-gray-600">No items added yet.</p>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Unit</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Location</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-3 text-gray-800">{item.name}</td>
                      <td className="px-6 py-3 text-gray-600">{item.unit}</td>
                      <td className="px-6 py-3 text-gray-600">
                        {Array.isArray(item.locations)
                          ? item.locations[0]?.name
                          : item.locations?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
