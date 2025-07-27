import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
    const isAuthenticated = !!localStorage.getItem('userEmail');
    return isAuthenticated ? children : <Navigate to="/login" />;
}

export default ProtectedRoute;