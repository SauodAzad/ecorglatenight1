import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, userData, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[80vh]">
        <Loader2 className="animate-spin text-orange-600" size={48} />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && userData) {
    const userRole = userData.role;
    const isAllowed = allowedRoles.includes(userRole) ||
      (allowedRoles.includes('business') && userRole === 'shipper') ||
      (allowedRoles.includes('shipper') && userRole === 'business') ||
      (allowedRoles.includes('truck_owner') && (userRole === 'fleet_owner' || userRole === 'driver')) ||
      (allowedRoles.includes('fleet_owner') && (userRole === 'truck_owner' || userRole === 'driver'));

    if (!isAllowed) {
      const ownDashboard = 
        userRole === 'admin' ? '/admin/dashboard' :
        (userRole === 'truck_owner' || userRole === 'fleet_owner' || userRole === 'driver') ? '/fleet-owner/dashboard' :
        userRole === 'transporter' ? '/transporter/dashboard' :
        '/shipper/dashboard';
      return <Navigate to={ownDashboard} replace />;
    }
  }

  return children;
}
