import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('inspector' | 'supervisor' | 'admin')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const location = useLocation();
  const token = localStorage.getItem('fv_token');
  const role = localStorage.getItem('fv_role') as 'inspector' | 'supervisor' | 'admin' | null;

  if (!token) {
    // Redirect to login page and keep track of where the user was heading
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Role not authorized, redirect to general dashboard
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
