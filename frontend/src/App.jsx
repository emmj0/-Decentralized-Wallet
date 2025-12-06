import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom'
import WalletGen from './pages/WalletGen'
import SendMoney from './pages/SendMoney'
import Dashboard from './pages/Dashboard'
import BlockExplorer from './pages/BlockExplorer'
import WalletProfile from './pages/WalletProfile'
import Profile from './pages/Profile'
import Transactions from './pages/Transactions'
import Reports from './pages/Reports'
import Admin from './pages/Admin'
import AdminSignup from './pages/AdminSignup'
import SystemLogs from './pages/SystemLogs'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import { useAuth } from './contexts/AuthContext'

function AppHeader() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-blue-600">💰 Decentralized Wallet</h1>
          </Link>
          <nav className="hidden md:flex items-center space-x-6">
            {user ? (
              <>
                <Link to="/dashboard" className="text-sm text-slate-700 hover:text-blue-600 transition">Dashboard</Link>
                <Link to="/wallet" className="text-sm text-slate-700 hover:text-blue-600 transition">Wallet</Link>
                <Link to="/profile" className="text-sm text-slate-700 hover:text-blue-600 transition">Profile</Link>
                <Link to="/send" className="text-sm text-slate-700 hover:text-blue-600 transition">Send</Link>
                <Link to="/blocks" className="text-sm text-slate-700 hover:text-blue-600 transition">Blocks</Link>
                <Link to="/transactions" className="text-sm text-slate-700 hover:text-blue-600 transition">Txs</Link>
                <Link to="/reports" className="text-sm text-slate-700 hover:text-blue-600 transition">Reports</Link>
                <Link to="/admin" className="text-sm text-slate-700 hover:text-blue-600 transition">Admin</Link>
                <button onClick={() => { signOut(); navigate('/'); }} className="text-sm text-red-600 hover:text-red-700 transition">Sign Out</button>
              </>
            ) : (
              <>
                <Link to="/" className="text-sm text-slate-700 hover:text-blue-600 transition">Home</Link>
                <Link to="/auth" className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition">Login</Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/auth" />} />
      <Route path="/wallet" element={user ? <WalletProfile /> : <Navigate to="/auth" />} />
      <Route path="/profile" element={user ? <Profile /> : <Navigate to="/auth" />} />
      <Route path="/send" element={user ? <><WalletGen /><div className="mt-8"><SendMoney /></div></> : <Navigate to="/auth" />} />
      <Route path="/blocks" element={<BlockExplorer />} />
      <Route path="/transactions" element={<Transactions />} />
      <Route path="/reports" element={user ? <Reports /> : <Navigate to="/auth" />} />
      <Route path="/admin" element={user ? <Admin /> : <Navigate to="/auth" />} />
      <Route path="/admin/make-admin" element={user ? <AdminSignup /> : <Navigate to="/auth" />} />
      <Route path="/admin/logs" element={user ? <SystemLogs /> : <Navigate to="/auth" />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 animate-fade-in">
          <AppRoutes />
        </main>
        <footer className="glass-card mt-12 border-t border-white/20 dark:border-dark-700/20">
          <div className="max-w-6xl mx-auto px-6 py-6 text-center">
            <p className="text-sm text-slate-600 dark:text-dark-400">&copy; 2025 Decentralized Wallet. Built with ❤️ for blockchain education.</p>
            <div className="mt-2 flex justify-center space-x-4 text-xs text-slate-500 dark:text-dark-500">
              <span>🔒 Private Keys Never Leave Your Device</span>
              <span>⛓️ Powered by Proof-of-Work</span>
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  )
}
