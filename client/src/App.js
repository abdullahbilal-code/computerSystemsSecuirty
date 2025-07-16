import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import Register from './pages/Register';
import Login from './pages/Login';
import Chat from './pages/Chat';
import Inbox from './pages/Inbox';


function App() {
  return (
    <Router>
      <div style={{ padding: '10px' }}>
        <h1>Secure Chat App 🔐</h1>
        <nav>
          <Link to="/register" style={{ marginRight: '10px' }}>Register</Link>
          <Link to="/login" style={{ marginRight: '10px' }}>Login</Link>
          <Link to="/send-message" style={{ marginRight: '10px' }}>Send Message</Link>
          <Link to="/inbox" style={{ marginRight: '10px' }}>Inbox</Link>
        </nav>
        <hr />
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/send-message" element={<Chat />} />
          <Route path="/inbox" element={<Inbox />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
