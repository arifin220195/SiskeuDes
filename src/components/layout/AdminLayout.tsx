import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import AdminHeader from './AdminHeader'

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-72 flex flex-col min-h-screen">
        <AdminHeader
          onMenuClick={() => setSidebarOpen(true)}
          title="POSYANDUKU"
        />
        <main className="flex-1 p-space-md lg:p-space-lg">
          <Outlet />
        </main>
      </div>
    </div>
  )
}