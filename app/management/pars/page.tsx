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
  location_id: string
  locations: { name: string } | { name: string }[]
}

interface ParLevel {
  id: string
  item_id: string
  location_id: string
  par_level: number
  reorder_point: number
  over_order_threshold: number
  items: { name: string } | { name: string }[]
  locations: { name: string } | { name: string }[]
}

export default function PARsPage() {
  const [pars, setPARs] = useState<ParLevel[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [newItemId, setNewItemId] = useState('')
  const [newPar, setNewPar] = useState('')
  const [newReorder, setNewReorder] = useState('')
  const [newThreshold, setNewThreshold] = useState('1.2')
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

      const { data: itemData } = await supabase
        .from('items')
        .select('id, name, location_id, locations(name)')
        .order('name', { ascending: true })
      setItems(itemData || [])

      const { data: parData } = await supabase
        .from('par_levels')
        .select('id, item_id, location_id, par_level, reorder_point, over_order_threshold, items(name), locations(name)')
        .order('created_at', { ascending: false })

      setPARs(parData || [])
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleAddPAR = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!newItemId) {
      setError('Please select an item')
      return
    }

    if (!newPar || parseFloat(newPar) < 0) {
      setError('Please enter a valid PAR level')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const selectedItem = items.find((i) => i.id === newItemId)
      if (!selectedItem) {
        setError('Invalid item selected')
        return
      }

      const { error: insertError } = await supabase
        .from('par_levels')
        .insert([
          {
            item_id: newItemId,
            location_id: selectedItem.location_id,
            par_level: parseFloat(newPar),
            reorder_point: newReorder ? parseFloat(newReorder) : 0,
            over_order_threshold: parseFloat(newThreshold),
            last_modified_by: user.id,
          },
        ])

      if (insertError) throw insertError
      setNewItemId('')
      setNewPar('')
      setNewReorder('')
      setNewThreshold('1.2')
      fetchData()
    } catch (err) {
      console.error('Error adding PAR:', err)
      setError('Failed to add PAR level')
    }
  }

  const handleDeletePAR = async (id: string) => {
    if (!confirm('Are you sure you want to delete this PAR level?')) return

    try {
      const { error: deleteError } = await supabase
        .from('par_levels')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      fetchData()
    } catch (err) {
      console.error('Error deleting PAR:', err)
      setError('Failed to delete PAR level')
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
          <h1 className="text-2xl font-bold text-gray-800">PAR Levels</h1>
          <div />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {items.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-6">
            Please create items first before setting PAR levels.
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Set PAR Level</h2>
            <form onSubmit={handleAddPAR} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="item" className="block text-sm font-medium text-gray-700 mb-1">
                    Item
                  </label>
                  <select
                    id="item"
                    value={newItemId}
                    onChange={(e) => setNewItemId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select an item...</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="par" className="block text-sm font-medium text-gray-700 mb-1">
                    Target PAR
                  </label>
                  <input
                    id="par"
                    type="number"
                    step="0.01"
                    min="0"
                    value={newPar}
                    onChange={(e) => setNewPar(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., 100"
                  />
                </div>

                <div>
                  <label htmlFor="reorder" className="block text-sm font-medium text-gray-700 mb-1">
                    Reorder Point
                  </label>
                  <input
                    id="reorder"
                    type="number"
                    step="0.01"
                    min="0"
                    value={newReorder}
                    onChange={(e) => setNewReorder(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., 20"
                  />
                </div>

                <div>
                  <label htmlFor="threshold" className="block text-sm font-medium text-gray-700 mb-1">
                    Over-Order Threshold
                  </label>
                  <input
                    id="threshold"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={newThreshold}
                    onChange={(e) => setNewThreshold(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., 1.2"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded"
              >
                Set PAR Level
              </button>
            </form>
          </div>
        )}

        <div className="grid gap-6">
          <h2 className="text-xl font-semibold text-gray-800">Current PAR Levels</h2>
          {pars.length === 0 ? (
            <p className="text-gray-600">No PAR levels set yet.</p>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Item</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Location</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Target PAR</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Reorder Point</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Over-Order Threshold</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pars.map((par) => (
                    <tr key={par.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-3 text-gray-800">
                        {Array.isArray(par.items) ? par.items[0]?.name : par.items?.name}
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {Array.isArray(par.locations)
                          ? par.locations[0]?.name
                          : par.locations?.name}
                      </td>
                      <td className="px-6 py-3 text-gray-600">{par.par_level}</td>
                      <td className="px-6 py-3 text-gray-600">{par.reorder_point}</td>
                      <td className="px-6 py-3 text-gray-600">{par.over_order_threshold}x</td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => handleDeletePAR(par.id)}
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
