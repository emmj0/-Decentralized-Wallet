Firebase setup and backend integration

This document explains how to create a Firebase project, enable Email OTP (Email Link) authentication, create a service account for the backend, and configure the Go backend to connect to Firestore using the Firebase Admin SDK.

1) Create Firebase project
- Go to https://console.firebase.google.com/ and create a new project (e.g., `decentralized-wallet-<your-name>`).
- In Project settings -> General, note the `projectId` for later.

2) Enable Authentication (Email-link/OTP)
- In the Firebase console, go to Authentication -> Sign-in method.
- Enable `Email/Password` or `Email link (passwordless sign-in)` (email link will serve as OTP-like flow).
- Configure authorized domains if deploying frontend to Vercel or Netlify (add `localhost` for local testing).

3) Enable Firestore
- In the console, go to Firestore Database -> Create database.
- Choose production or test mode as you prefer; for dev/testing you can use test mode.

4) Create a Service Account for the backend
- Go to Project Settings -> Service accounts.
- Click `Generate new private key` to download a JSON file (keep it secure).
- Save the file to your backend machine, e.g., `C:\Users\you\keys\firebase-service-account.json`.

5) Configure backend to use the service account
- Set environment variable `GOOGLE_APPLICATION_CREDENTIALS` to the path of the JSON file. Example (PowerShell):

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\path\to\firebase-service-account.json'
# To make it persistent for the session you can set it in the system environment variables or set before running the server.
```

- The Go backend initializes Firebase automatically if `GOOGLE_APPLICATION_CREDENTIALS` is set. See `backend/internal/db/firestore.go`.

6) Local testing workflow
- Start backend (it will initialize Firestore):

```powershell
cd d:\BlockChainSemesterProject\backend
$env:GOOGLE_APPLICATION_CREDENTIALS='C:\path\to\firebase-service-account.json'; go run .
```

- Start frontend:

```powershell
cd d:\BlockChainSemesterProject\frontend
npm install
npm run dev
```

- Use the frontend WalletGen page to generate a keypair and register the public key. The backend will persist the wallet in Firestore.

7) Securing endpoints
- The backend expects authenticated requests for sensitive endpoints. The frontend should obtain a Firebase ID token (after the user signs in with email link) and include it in the `Authorization: Bearer <ID_TOKEN>` header on requests such as `POST /api/wallets/register` and `POST /api/tx/send`.
- The backend verifies the ID token using the Firebase Admin SDK.

Example: obtain ID token in frontend and include on requests

```js
import { getAuth } from 'firebase/auth'
const auth = getAuth()
const user = auth.currentUser
if (user) {
	const idToken = await user.getIdToken()
	await fetch('/api/wallets/register', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
		body: JSON.stringify({ public_key: '<base64>' })
	})
}
```

8) Deployment notes
- When deploying the backend to Render/Fly/Railway, upload the service account JSON as a secret and configure `GOOGLE_APPLICATION_CREDENTIALS` to point to the mounted secret path or set credentials JSON via environment variable handling supported by the host.
- For Vercel (frontend), add your Firebase config (client-side) as environment variables in the Vercel project settings.

Troubleshooting
- If you see `set GOOGLE_APPLICATION_CREDENTIALS` error, ensure the env var is set and the file is accessible.
- Make sure Firestore rules allow the service account to read/write (service account has admin privileges by default).

Next steps
- Migrate additional in-memory stores to Firestore (blocks, transactions, logs).
- Add Firestore indexes if required for query performance.
