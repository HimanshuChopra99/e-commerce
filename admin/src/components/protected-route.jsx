import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { fetchAdminMe } from '@/store/adminAuthSlice'

export function ProtectedRoute() {
  const dispatch = useDispatch()
  const location = useLocation()
  const { user, initialized, loading } = useSelector((state) => state.adminAuth || {})

  useEffect(() => {
    if (!initialized && !user) {
      dispatch(fetchAdminMe())
    }
  }, [dispatch, initialized, user])

  if (!initialized && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm font-medium text-muted-foreground">
        Verifying admin session...
      </div>
    )
  }

  if (initialized && (!user || user.role !== 'admin')) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
