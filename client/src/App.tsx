import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ParticipantApp from './components/participant/ParticipantApp';
import AdminDashboard from './components/admin/AdminDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Participant Route */}
        <Route path="/" element={<ParticipantApp />} />
        
        {/* Admin Route */}
        <Route path="/admin" element={<AdminDashboard />} />

        {/* Catch all fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
