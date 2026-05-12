'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface InventoryLog {
  id: string
  item_id: string
  location_id: string
  quantity_on_hand: number
  logged_at: string
  staff_initials: string
  notes: string | null
  items: { name: string; unit: string } | { name: string; unit: string }[]
  locations: { name: string } | { name: string }[]
  profiles?: { full_name: string } | { full_name: string }[]
}

export default function HistoryPage() {
  const [logs, setLogs] = useState<InventoryLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterItem, setFilterItem] = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [items, setItems] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [filterItem, filterLocation, filterDate])

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Fetch items and locations for filters
      if (items.length === 0) {
        const { data: itemData } = await supabase
          .from('items')
          .select('id, name')
          .order('name', { ascending: true })
        setItems(itemData || [])
      }

      if (locations.length === 0) {
        const { data: locData } = await supabase
          .from('locations')
          .select('id, name')
          .order('name', { ascending: true })
        setLocations(locData || [])
      }

      // Build query
      let query = supabase
        .from('inventory_logs')
        .select('id, item_id, location_id, quantity_on_hand, logged_at, staff_initials, notes, items(name, unit), locations(name), profiles(full_name)')
        .order('logged_at', { ascending: false })

      if (filterItem) {
        query = query.eq('item_id', filterItem)
      }

      if (filterLocation) {
        query = query.eq('location_id', filterLocation)
      }

      if (filterDate) {
        query = query.gte('logged_at', `${filterDate}T00:00:00`)
        query = query.lte('logged_at', `${filterDate}T23:59:59`)
      }

      const { data: logsData } = await query
      setLogs(logsData || [])
    } catch (err) {
      console.error('Error fetching history:', err)
    } finally {
      setLoading(false)
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
          <h1 className="text-2xl font-bold text-gray-800">Inventory History</h1>
          <div />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="location-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <select
                id="location-filter"
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Locations</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="item-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Item
              </label>
              <select
                id="item-filter"
                value={filterItem}
                onChange={(e) => setFilterItem(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Items</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                id="date-filter"
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {logs.length === 0 ? (
            <div className="p-6 text-center text-gray-600">No inventory logs found.</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Location</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Item</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Quantity</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Logged By</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Notes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-800">
                      {new Date(log.logged_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {Array.isArray(log.locations)
                        ? log.locations[0]?.name
                        : log.locations?.name}
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {Array.isArray(log.items) ? log.items[0]?.name : log.items?.name} (
                      {Array.isArray(log.items) ? log.items[0]?.unit : log.items?.unit})
                    </td>
                    <td className="px-6 py-3 text-gray-600 font-semibold">{log.quantity_on_hand}</td>
                    <td className="px-6 py-3 text-gray-600">{log.staff_initials}</td>
                    <td className="px-6 py-3 text-gray-600 text-sm">{log.notes || '—'}</td>
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
