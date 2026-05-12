'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface ReportItem {
  name: string
  below_par_count: number
  total_logs: number
  avg_shortage: number
  over_par_count: number
  avg_excess: number
}

interface ReportMetrics {
  underOrdered: ReportItem[]
  overOrdered: ReportItem[]
  totalLogs: number
}

export default function ReportsPage() {
  const [metrics, setMetrics] = useState<ReportMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)
  const [threshold, setThreshold] = useState(1.2)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchMetrics()
  }, [days, threshold])

  const fetchMetrics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Fetch all logs within the period
      const { data: logs } = await supabase
        .from('inventory_logs')
        .select('item_id, quantity_on_hand, items(name), par_levels(par_level, over_order_threshold)')
        .gte('logged_at', startDate.toISOString())
        .order('logged_at', { ascending: false })

      if (!logs) {
        setMetrics({ underOrdered: [], overOrdered: [], totalLogs: 0 })
        return
      }

      // Group data by item
      const itemMap = new Map<string, any>()

      logs.forEach((log: any) => {
        const itemName = Array.isArray(log.items) ? log.items[0]?.name : log.items?.name
        const parLevel =
          Array.isArray(log.par_levels) && log.par_levels.length > 0
            ? log.par_levels[0].par_level
            : 0
        const overThreshold =
          Array.isArray(log.par_levels) && log.par_levels.length > 0
            ? log.par_levels[0].over_order_threshold
            : threshold

        if (!itemMap.has(itemName)) {
          itemMap.set(itemName, {
            name: itemName,
            logs: [],
            parLevel: parLevel,
            overThreshold: overThreshold,
          })
        }

        itemMap.get(itemName).logs.push(log.quantity_on_hand)
      })

      // Calculate metrics
      const underOrdered: ReportItem[] = []
      const overOrdered: ReportItem[] = []

      itemMap.forEach((item) => {
        const belowParCount = item.logs.filter((q: number) => q < item.parLevel).length
        const overParCount = item.logs.filter(
          (q: number) => q > item.parLevel * item.overThreshold
        ).length
        const avgShortage = item.logs
          .filter((q: number) => q < item.parLevel)
          .reduce((sum: number, q: number) => sum + (item.parLevel - q), 0) / (belowParCount || 1)
        const avgExcess = item.logs
          .filter((q: number) => q > item.parLevel * item.overThreshold)
          .reduce((sum: number, q: number) => sum + (q - item.parLevel * item.overThreshold), 0) /
          (overParCount || 1)

        if (belowParCount > 0) {
          underOrdered.push({
            name: item.name,
            below_par_count: belowParCount,
            total_logs: item.logs.length,
            avg_shortage: avgShortage,
            over_par_count: 0,
            avg_excess: 0,
          })
        }

        if (overParCount > 0) {
          overOrdered.push({
            name: item.name,
            below_par_count: 0,
            total_logs: item.logs.length,
            avg_shortage: 0,
            over_par_count: overParCount,
            avg_excess: avgExcess,
          })
        }
      })

      underOrdered.sort((a, b) => b.below_par_count - a.below_par_count)
      overOrdered.sort((a, b) => b.over_par_count - a.over_par_count)

      setMetrics({
        underOrdered,
        overOrdered,
        totalLogs: logs.length,
      })
    } catch (err) {
      console.error('Error fetching metrics:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    if (!metrics) return

    let csv = 'Kitchen Inventory Report\n'
    csv += `Period: Last ${days} days\n`
    csv += `Generated: ${new Date().toLocaleString()}\n\n`

    csv += 'UNDER-ORDERED ITEMS\n'
    csv += 'Item Name,Times Below PAR,Total Logs,Avg Shortage\n'
    metrics.underOrdered.forEach((item) => {
      csv += `"${item.name}",${item.below_par_count},${item.total_logs},${item.avg_shortage.toFixed(2)}\n`
    })

    csv += '\nOVER-ORDERED ITEMS\n'
    csv += 'Item Name,Times Over Threshold,Total Logs,Avg Excess\n'
    metrics.overOrdered.forEach((item) => {
      csv += `"${item.name}",${item.over_par_count},${item.total_logs},${item.avg_excess.toFixed(2)}\n`
    })

    const element = document.createElement('a')
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv))
    element.setAttribute('download', `inventory-report-${new Date().toISOString().split('T')[0]}.csv`)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
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
          <h1 className="text-2xl font-bold text-gray-800">Inventory Reports</h1>
          <div />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Report Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="days" className="block text-sm font-medium text-gray-700 mb-1">
                Period (Days)
              </label>
              <select
                id="days"
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value={7}>Last 7 Days</option>
                <option value={30}>Last 30 Days</option>
                <option value={60}>Last 60 Days</option>
                <option value={90}>Last 90 Days</option>
              </select>
            </div>

            <div>
              <label htmlFor="threshold" className="block text-sm font-medium text-gray-700 mb-1">
                Over-Order Threshold (x PAR)
              </label>
              <input
                id="threshold"
                type="number"
                step="0.1"
                min="0.1"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleExportCSV}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded"
              >
                Export as CSV
              </button>
            </div>
          </div>
        </div>

        {metrics && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Total Inventory Logs</h3>
                <p className="text-3xl font-bold text-gray-800">{metrics.totalLogs}</p>
              </div>

              <div className="bg-red-50 rounded-lg shadow p-6 border border-red-200">
                <h3 className="text-sm font-medium text-red-600 mb-2">Items Under-Ordered</h3>
                <p className="text-3xl font-bold text-red-800">{metrics.underOrdered.length}</p>
              </div>

              <div className="bg-yellow-50 rounded-lg shadow p-6 border border-yellow-200">
                <h3 className="text-sm font-medium text-yellow-600 mb-2">Items Over-Ordered</h3>
                <p className="text-3xl font-bold text-yellow-800">{metrics.overOrdered.length}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <div className="bg-red-50 rounded-lg shadow p-6 border border-red-200">
                  <h2 className="text-xl font-semibold text-red-800 mb-4">Items Under-Ordered</h2>
                  {metrics.underOrdered.length === 0 ? (
                    <p className="text-gray-600">No items under-ordered in this period.</p>
                  ) : (
                    <div className="space-y-4">
                      {metrics.underOrdered.map((item) => (
                        <div key={item.name} className="bg-white p-4 rounded border-l-4 border-red-600">
                          <h3 className="font-semibold text-gray-800">{item.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Below PAR: {item.below_par_count} of {item.total_logs} logs
                            ({((item.below_par_count / item.total_logs) * 100).toFixed(1)}%)
                          </p>
                          <p className="text-sm text-gray-600">
                            Avg Shortage: {item.avg_shortage.toFixed(2)} units
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="bg-yellow-50 rounded-lg shadow p-6 border border-yellow-200">
                  <h2 className="text-xl font-semibold text-yellow-800 mb-4">Items Over-Ordered</h2>
                  {metrics.overOrdered.length === 0 ? (
                    <p className="text-gray-600">No items over-ordered in this period.</p>
                  ) : (
                    <div className="space-y-4">
                      {metrics.overOrdered.map((item) => (
                        <div key={item.name} className="bg-white p-4 rounded border-l-4 border-yellow-600">
                          <h3 className="font-semibold text-gray-800">{item.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Above Threshold: {item.over_par_count} of {item.total_logs} logs
                            ({((item.over_par_count / item.total_logs) * 100).toFixed(1)}%)
                          </p>
                          <p className="text-sm text-gray-600">
                            Avg Excess: {item.avg_excess.toFixed(2)} units
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
