import React from 'react'
import { COLOR_PRIMARY, COLOR_ACCENT } from '../config'
import { useAuth } from '../contexts/AuthContext'

export default function Landing({ onGetStarted }) {
  const { user } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white p-8">
      <div className="max-w-4xl w-full bg-white shadow rounded-lg p-8">
        <div className="grid md:grid-cols-2 gap-6 items-center">
          <div>
            <h1 className="text-3xl font-extrabold">Decentralized Wallet — Simple, Private, and Yours</h1>
            <p className="mt-4 text-slate-700">This is a small demo blockchain wallet built for learning. In plain language:</p>
            <ul className="mt-3 list-disc pl-6 text-sm text-slate-600 space-y-2">
              <li><strong>Your keys:</strong> We let you create a public/private keypair in your browser. Your private key never leaves your device — we only store the public key so others can send you funds.</li>
              <li><strong>Transactions:</strong> You sign transactions with your private key locally and then submit them to our demo network. The server checks your signature and processes the transaction.</li>
              <li><strong>Mining:</strong> A simple Proof-of-Work miner packages transactions into blocks (for demo purposes) so you can see how blocks and transactions are recorded.</li>
            </ul>

            <div className="mt-6 flex gap-3">
              <button onClick={() => onGetStarted?.()} className="px-5 py-2 rounded text-white font-medium" style={{backgroundColor: COLOR_PRIMARY}}>Get Started — Sign In</button>
              <a className="px-5 py-2 rounded text-slate-700 border" href="#learn">Learn more</a>
            </div>
          </div>

          <div className="p-4 rounded border bg-slate-50">
            <h3 className="font-semibold">Quick Tour</h3>
            <div className="mt-2 text-sm text-slate-600">
              - Sign in with Email OTP or Google. We only use your email to identify you.
              <br />- Generate a wallet (keypair) on your device and register the public key.
              <br />- Send test funds and see them recorded in the Block Explorer.
            </div>
            <div className="mt-4 text-sm text-slate-500">Auth status: <strong>{user ? 'Signed in' : 'Not signed in'}</strong></div>
          </div>
        </div>

        <div id="learn" className="mt-8 p-4 bg-white">
          <h4 className="font-semibold">How this demo differs from a real wallet</h4>
          <p className="mt-2 text-sm text-slate-600">This project is an educational demo. It demonstrates core ideas (client-side signing, UTXO model, mining) but is not production-ready. Do not store real funds here.</p>
        </div>
      </div>
    </div>
  )
}
