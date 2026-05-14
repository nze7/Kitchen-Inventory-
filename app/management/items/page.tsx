'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import * as XLSX from 'xlsx'

interface Location {
  id: string
  name: string
}

interface Item {
  id: string
  name: string
  category: string | null
  brand: string | null
  unit: string
  notes: string | null
  location_id: string
  locations: { name: string } | { name: string }[]
}

interface ImportedItemRow {
  name: string
  category: string
  brand: string
  unit: string
  notes: string
}

interface ImportedWorkbookRow extends ImportedItemRow {
  locationName: string
}

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [newItem, setNewItem] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newBrand, setNewBrand] = useState('')
  const [newUnit, setNewUnit] = useState('count')
  const [newNotes, setNewNotes] = useState('')
  const [newLocationId, setNewLocationId] = useState('')
  const [importText, setImportText] = useState('')
  const [importFileName, setImportFileName] = useState('')
  const [error, setError] = useState('')
  const [importStatus, setImportStatus] = useState('')
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
        .select('id, name, category, brand, unit, notes, location_id, locations(name)')
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
            category: newCategory.trim() || null,
            brand: newBrand.trim() || null,
            unit: newUnit,
            notes: newNotes.trim() || null,
            location_id: newLocationId,
            created_by: user.id,
          },
        ])

      if (insertError) throw insertError
      setNewItem('')
      setNewCategory('')
      setNewBrand('')
      setNewUnit('count')
      setNewNotes('')
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

  const parseImportedItems = (rawText: string): ImportedItemRow[] => {
    const rows = rawText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    return rows
      .map((row) => {
        const parts = row.split(',').map((value) => value.trim())
        
        // Support multiple formats:
        // 2-column: name,unit
        // 3-column: name,category,unit
        // 4-column: brand,item,unit,notes
        if (parts.length === 2) {
          return {
            name: parts[0],
            category: '',
            brand: '',
            unit: parts[1],
            notes: '',
          }
        } else if (parts.length === 3) {
          return {
            name: parts[0],
            category: parts[1],
            brand: '',
            unit: parts[2],
            notes: '',
          }
        } else if (parts.length >= 4) {
          return {
            brand: parts[0],
            name: parts[1],
            unit: parts[2],
            notes: parts[3],
            category: '',
          }
        }
        
        return { name: '', category: '', brand: '', unit: '', notes: '' }
      })
      .filter((row) => row.name && row.unit)
  }

  const inferFirstValue = (row: string[], indexes: number[]) => {
    for (const index of indexes) {
      const value = row[index]?.trim()
      if (value) {
        return value
      }
    }

    return ''
  }

  const parseWorkbook = async (file: File): Promise<ImportedWorkbookRow[]> => {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const importedRows: ImportedWorkbookRow[] = []

    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, {
        header: 1,
        blankrows: false,
        defval: '',
      })

      if (rows.length === 0) {
        return
      }

      const header = rows[0].map((value) => String(value).trim().toLowerCase())
      const hasHeaders = header.some((cell) =>
        ['brand', 'item', 'item description', 'description', 'name', 'category', 'categories', 'unit', 'size/unit', 'size unit', 'size', 'notes', 'note'].includes(cell)
      )

      // Detect column indices
      const brandIndex = hasHeaders
        ? header.findIndex((cell) => ['brand', 'supplier', 'vendor'].includes(cell))
        : 0
      const itemIndex = hasHeaders
        ? header.findIndex((cell) => ['item', 'item description', 'description', 'name'].includes(cell))
        : 1
      const unitIndex = hasHeaders
        ? header.findIndex((cell) => ['unit', 'size/unit', 'size unit', 'size', 'pack size'].includes(cell))
        : 2
      const notesIndex = hasHeaders
        ? header.findIndex((cell) => ['notes', 'note', 'remarks', 'comments'].includes(cell))
        : 3

      const dataRows = hasHeaders ? rows.slice(1) : rows

      dataRows.forEach((row) => {
        const brand = inferFirstValue(row, brandIndex >= 0 ? [brandIndex, 0] : [0])
        const name = inferFirstValue(row, itemIndex >= 0 ? [itemIndex, 1] : [1])
        const unit = inferFirstValue(row, unitIndex >= 0 ? [unitIndex, 2, 1] : [2, 1])
        const notes = inferFirstValue(row, notesIndex >= 0 ? [notesIndex, 3] : [3])

        if (name && unit) {
          importedRows.push({
            locationName: sheetName.trim(),
            brand,
            name,
            unit,
            notes,
            category: '',
          })
        }
      })
    })

    return importedRows
  }

  const handleImportItems = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setImportStatus('')

    if (!importText.trim()) {
      setError('Paste item rows before importing')
      return
    }

    if (!newLocationId) {
      setError('Please select a location before importing')
      return
    }

    const importedRows = parseImportedItems(importText)

    if (importedRows.length === 0) {
      setError('No valid item rows found. Use: name,unit or name,category,unit or brand,item,unit,notes (one item per line)')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const payload = importedRows.map((row) => ({
        name: row.name,
        category: row.category || null,
        brand: row.brand || null,
        unit: row.unit,
        notes: row.notes || null,
        location_id: newLocationId,
        created_by: user.id,
      }))

      const { error: importError } = await supabase.from('items').insert(payload)

      if (importError) throw importError

      setImportText('')
      setImportStatus(`✓ Imported ${payload.length} item${payload.length === 1 ? '' : 's'}. Each item retained its own unit and category.`)
      fetchData()
    } catch (err) {
      console.error('Error importing items:', err)
      setError('Failed to import items')
    }
  }

  const handleWorkbookImport = async (file: File) => {
    setError('')
    setImportStatus('')

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const workbookRows = await parseWorkbook(file)

      if (workbookRows.length === 0) {
        setError('No usable rows found in workbook')
        return
      }

      const { data: locationRows, error: locationFetchError } = await supabase
        .from('locations')
        .select('id, name')

      if (locationFetchError) throw locationFetchError

      const locationMap = new Map(
        (locationRows || []).map((location) => [location.name.toLowerCase(), location.id])
      )

      for (const row of workbookRows) {
        let locationId = locationMap.get(row.locationName.toLowerCase())

        if (!locationId) {
          const { data: createdLocation, error: createLocationError } = await supabase
            .from('locations')
            .insert({
              name: row.locationName,
              created_by: user.id,
            })
            .select('id, name')
            .single()

          if (createLocationError) throw createLocationError

          locationId = createdLocation.id
          locationMap.set(createdLocation.name.toLowerCase(), createdLocation.id)
        }

        const { error: itemError } = await supabase.from('items').insert({
          name: row.name,
          category: row.category || null,
          brand: row.brand || null,
          unit: row.unit,
          notes: row.notes || null,
          location_id: locationId,
          created_by: user.id,
        })

        if (itemError) throw itemError
      }

      setImportFileName(file.name)
      setImportStatus(`Imported ${workbookRows.length} item${workbookRows.length === 1 ? '' : 's'} from ${file.name}`)
      fetchData()
    } catch (err) {
      console.error('Error importing workbook:', err)
      setError('Failed to import workbook')
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

        {importStatus && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-6">
            {importStatus}
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
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <input
                    id="category"
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Proteins"
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">
                    Brand
                  </label>
                  <input
                    id="brand"
                    type="text"
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Tyson"
                  />
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <input
                    id="notes"
                    type="text"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Bulk purchase"
                  />
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

        {locations.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Import Items</h2>
            <p className="text-sm text-gray-600 mb-4">
              Paste one item per line. Each item can have its own brand, unit, and notes. Use format:
              <br/>
              <span className="font-medium">name,unit</span> or 
              <span className="font-medium"> name,category,unit</span> or 
              <span className="font-medium"> brand,item,unit,notes</span>
            </p>
            <form onSubmit={handleImportItems} className="space-y-4">
              <div>
                <label htmlFor="import-location" className="block text-sm font-medium text-gray-700 mb-1">
                  Import Into Location
                </label>
                <select
                  id="import-location"
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

              <div>
                <label htmlFor="import-text" className="block text-sm font-medium text-gray-700 mb-1">
                  Item Rows
                </label>
                <textarea
                  id="import-text"
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                  rows={8}
                  placeholder={"Examples:\nChicken Breast,lbs\nRice,Grains,boxes\nTyson,Chicken Breast,lbs,Bulk purchase\nMilk,Dairy,gallons"}
                />
              </div>

              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded"
              >
                Import Items
              </button>
            </form>

            <div className="mt-6 border-t pt-6">
              <label htmlFor="workbook-import" className="block text-sm font-medium text-gray-700 mb-2">
                Upload Excel Workbook
              </label>
              <input
                id="workbook-import"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) {
                    return
                  }

                  void handleWorkbookImport(file)
                }}
                className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-white hover:file:bg-slate-700"
              />
              <p className="mt-2 text-xs text-gray-500">
                Each sheet name becomes a location. The system looks for columns: Brand, Item, Unit, Notes. Column order is flexible.
              </p>
            </div>
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
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Brand</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Unit</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Notes</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Location</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-3 text-gray-800">{item.name}</td>
                      <td className="px-6 py-3 text-gray-600">{item.brand || '—'}</td>
                      <td className="px-6 py-3 text-gray-600">{item.category || '—'}</td>
                      <td className="px-6 py-3 text-gray-600">{item.unit}</td>
                      <td className="px-6 py-3 text-gray-600 text-xs max-w-xs truncate">{item.notes || '—'}</td>
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
