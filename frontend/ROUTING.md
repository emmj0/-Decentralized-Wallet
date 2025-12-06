# Frontend Routing Guide

## Overview
The frontend uses **React Router v6** for SPA (Single Page Application) routing with proper authentication guards and a modern navigation header.

## Routes & Access Control

### Public Routes
- **`/`** — Landing page (home)
- **`/auth`** — Authentication (login/signup)
- **`/blocks`** — Block explorer (view public blockchain data)
- **`/transactions`** — Transaction history (view public transactions)

### Protected Routes (Requires Authentication)
All protected routes redirect to `/auth` if user is not logged in.

- **`/dashboard`** — User dashboard overview
- **`/wallet`** — Wallet profile and balance
- **`/profile`** — Edit user profile (name, CNIC, beneficiaries)
- **`/send`** — Send money (includes wallet generation)
- **`/reports`** — Financial reports
- **`/admin`** — Admin panel (mining, funding, etc.)

## Navigation Structure

### Header Navigation
The header (`AppHeader` component) shows:
- **Logo/Title** (left side) — clickable link to home
- **Dynamic Navigation** (right side):
  - **If logged in:**
    - Dashboard, Wallet, Profile, Send, Blocks, Txs, Reports, Admin
    - Sign Out button
  - **If logged out:**
    - Home, Login button

### Mobile Responsiveness
- Navigation is hidden on mobile (responsive menu could be added)
- Full navigation visible on `md` breakpoint and above

## Component Structure

### Main Components
- **`App.jsx`** — Root router setup and header/footer layout
  - **`AppHeader()`** — Navigation header with links
  - **`AppRoutes()`** — Route definitions with auth guards
- **Page Components** — All located in `src/pages/`:
  - `Landing.jsx`, `Auth.jsx`, `Dashboard.jsx`, `Profile.jsx`, etc.

### Auth Flow
1. User lands on `/` (Landing page)
2. Clicks "Get Started" → navigates to `/auth`
3. Auth component uses Firebase email-link or Google sign-in
4. On successful auth, user is redirected to `/dashboard` (or stays if clicked elsewhere)
5. Protected pages require valid `user` object from `AuthContext`

## Styling

### Design System
- **Framework:** Tailwind CSS
- **Color Scheme:**
  - Primary: Blue (`blue-600`, `blue-700`)
  - Backgrounds: Light slate (`slate-50`)
  - Neutral: Gray/slate palette
  - Accents: Red for delete/logout, Green for success

### Key Classes Used
- **Header:** `sticky top-0 z-50`, `bg-gradient-to-r` (Profile page)
- **Cards:** `bg-white rounded-lg shadow-lg`
- **Forms:** Focus rings with `focus:ring-2 focus:ring-blue-500`
- **Buttons:** Consistent hover states and transitions

## Authentication Flow

### AuthContext
- Provides `user`, `loading`, `getIdToken()`, `signOut()`
- Wraps the entire app in `main.jsx`

### Route Protection
```jsx
<Route path="/profile" element={user ? <Profile /> : <Navigate to="/auth" />} />
```

### Token Attachment
The `apiFetch` function automatically attaches Firebase ID token:
```javascript
const headers = {
  Authorization: `Bearer ${idToken}`,
  'Content-Type': 'application/json'
}
```

## Page Descriptions

### Landing Page (`/`)
- Hero section with app info
- Call-to-action button for "Get Started" → `/auth`
- Layman-friendly explanation of the wallet

### Auth Page (`/auth`)
- Email-link sign-in option
- Google sign-in with popup
- Error handling for disabled providers
- Spinner during authentication

### Dashboard (`/dashboard`)
- Overview of user account
- Quick stats (balance, recent transactions)
- Links to other pages

### Profile (`/profile`)
- **Features:**
  - Edit full name (required)
  - Edit CNIC
  - Dynamic beneficiaries management (add/remove)
  - Save button with loading state
  - Success/error messages
  - Info box explaining profile usage
- **Styling:**
  - Gradient header (`bg-gradient-to-r from-blue-600 to-blue-700`)
  - Card-based layout
  - Inline form validation

### Wallet (`/wallet`)
- View wallet balance
- View UTXOs
- Generate wallet keypair

### Send (`/send`)
- Wallet generation form
- Transaction form (recipient, amount, note)
- Sign transaction with private key
- Loading spinner during submission

### Blocks (`/blocks`)
- List recent mined blocks
- Block details view
- Transaction count per block

### Transactions (`/transactions`)
- View pending and mined transactions
- Filter by wallet ID
- Transaction details

### Reports (`/reports`)
- Financial reports
- Zakat calculations
- Transaction summaries

### Admin (`/admin`)
- Mine blocks
- Fund wallets
- Admin-only operations
- Requires special authentication

## Development Tips

### Add a New Route
1. Create page component in `src/pages/`
2. Import in `App.jsx`
3. Add route in `AppRoutes()` function
4. Add nav link in `AppHeader()` (if needed)

### Protect a Route
```jsx
<Route path="/example" element={user ? <Example /> : <Navigate to="/auth" />} />
```

### Navigate Programmatically
```jsx
const navigate = useNavigate()
navigate('/dashboard')
```

### Current User in Component
```jsx
const { user } = useAuth()
// use user.uid, user.email, etc.
```

## Known Issues / Future Improvements

- Mobile navigation menu (currently hidden)
- Breadcrumb navigation
- 404 page
- Loading skeleton components
- Transition animations between routes
- Role-based access control (admin vs regular user)

---

**Last Updated:** December 6, 2025
