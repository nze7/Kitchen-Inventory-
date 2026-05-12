'use client'

import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-6">
          You do not have permission to access this page. Please contact management if you believe this is an error.
        </p>
        <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-700 font-semibold">
          Return to Dashboard
        </Link>
      </div>
    </div>
  )
}
