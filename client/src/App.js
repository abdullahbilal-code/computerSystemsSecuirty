import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import Register from './pages/Register';
import Login from './pages/Login';
import Chat from './pages/Chat';
import Inbox from './pages/Inbox';
import ProtectedRoute from './pages/ProtectedRoute';

function App() {
  const isLoggedIn = !!localStorage.getItem('userEmail');

  return (
    <Router>
      <div style={{ padding: '10px' }}>
        <h1>Secure Chat App</h1>
        <nav>
          <Link to="/register" style={{ marginRight: '10px' }}>Register</Link>
          <Link to="/login" style={{ marginRight: '10px' }}>Login</Link>
          {isLoggedIn && (
            <>
              <Link to="/send-message" style={{ marginRight: '10px' }}>Send Message</Link>
              <Link to="/inbox" style={{ marginRight: '10px' }}>Inbox</Link>
            </>
          )}
        </nav>
        <hr />
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/send-message"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inbox"
            element={
              <ProtectedRoute>
                <Inbox />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
