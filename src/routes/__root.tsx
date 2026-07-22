import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { Toaster } from 'react-hot-toast'
import WebYesLogo from '../components/svgicons/Webyes-logo.svg'

export const Route = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <Toaster position="top-right" toastOptions={{ className: 'text-sm' }} />
    </>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
      <img src={WebYesLogo} alt="WebYes" style={{ height: '40px' }} />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
        <p className="text-sm text-gray-500 mt-1">The page you're looking for doesn't exist.</p>
      </div>
      <Link
        to="/"
        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-sm transition-colors"
      >
        Back to home
      </Link>
    </div>
  ),
})
