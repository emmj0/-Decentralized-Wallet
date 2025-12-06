import React from 'react'
import { COLOR_PRIMARY, COLOR_ACCENT } from '../config'
import { useAuth } from '../contexts/AuthContext'

export default function Landing({ onGetStarted }) {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-14">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Hero */}
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
              <span>Private by default</span>
              <span className="text-[10px]">•</span>
              <span>Client-side keys</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
              Decentralized Wallet — Simple, Private, and Yours
            </h1>
            <p className="text-slate-700 text-base sm:text-lg leading-relaxed">
              A learning-focused blockchain wallet. Generate keys locally, sign transactions in your browser, and watch blocks get mined with Proof-of-Work.
            </p>
            <ul className="mt-3 space-y-2 text-sm sm:text-base text-slate-700">
              <li className="flex gap-2"><span>🔒</span><span><strong>Your keys stay local.</strong> Private key never leaves your device.</span></li>
              <li className="flex gap-2"><span>🧾</span><span><strong>Signed transactions.</strong> Server only verifies and processes.</span></li>
              <li className="flex gap-2"><span>⛏️</span><span><strong>Proof-of-Work demo.</strong> Mine pending txs into blocks.</span></li>
            </ul>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => onGetStarted?.()}
                className="w-full sm:w-auto px-5 py-3 rounded-lg text-white font-semibold shadow-sm hover:shadow bg-blue-600 hover:bg-blue-700 transition"
              >
                Get Started — Sign In
              </button>
              <a
                className="w-full sm:w-auto px-5 py-3 rounded-lg text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-center"
                href="#learn"
              >
                Learn more
              </a>
            </div>
          </div>

          {/* Side card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Quick Tour</h3>
              <span className={`text-xs px-2 py-1 rounded-full ${user ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                {user ? 'Signed in' : 'Not signed in'}
              </span>
            </div>
            <ol className="space-y-3 text-sm text-slate-700 list-decimal list-inside">
              <li>Sign in with Email OTP or Google (for demo only).</li>
              <li>Generate a wallet locally and register the public key.</li>
              <li>Send test funds and view them in the Block Explorer.</li>
            </ol>
            <div className="text-xs text-slate-500">Private keys never leave your browser. This is an educational demo—do not use for real funds.</div>
          </div>
        </div>

        <div id="learn" className="mt-10 grid gap-6 lg:grid-cols-3">
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <h4 className="font-semibold text-slate-900">Client-side Keys</h4>
            <p className="mt-2 text-sm text-slate-600">Generate Ed25519 keys locally; only the public key is registered so others can pay you.</p>
          </div>
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <h4 className="font-semibold text-slate-900">UTXO + PoW</h4>
            <p className="mt-2 text-sm text-slate-600">UTXO model with Proof-of-Work mining so you can see how blocks form and confirm transactions.</p>
          </div>
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <h4 className="font-semibold text-slate-900">Admin Sandbox</h4>
            <p className="mt-2 text-sm text-slate-600">Bootstrap admin, fund wallets, mine blocks, and validate the chain—all in a safe sandbox.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
