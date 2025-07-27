import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import Register from './pages/Register';
import Login from './pages/Login';
import Chat from './pages/Chat';
import Inbox from './pages/Inbox';
import ProtectedRoute from './pages/ProtectedRoute';
import { useState } from 'react';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('userEmail'));

  const handleLogout = () => {
    localStorage.removeItem('userEmail');
    setIsLoggedIn(false);
    window.location.href = '/login';
  };

  return (
    <Router>
      <div style={{ padding: '10px' }}>
        <h1>Secure Chat App</h1>
        <nav>
          {!isLoggedIn ? (
            <>
              <Link to="/register" style={{ marginRight: '10px' }}>Register</Link>
              <Link to="/login" style={{ marginRight: '10px' }}>Login</Link>
            </>
          ) : (
            <>
              <Link to="/send-message" style={{ marginRight: '10px' }}>Send Message</Link>
              <Link to="/inbox" style={{ marginRight: '10px' }}>Inbox</Link>
              <button
                onClick={handleLogout}
                style={{
                  marginLeft: '10px',
                  backgroundColor: 'red',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Logout
              </button>
            </>
          )}
        </nav>
        <hr />
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login onLogin={() => setIsLoggedIn(true)} />} />
          <Route path="/send-message" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
