import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Intake from './pages/Intake'
import Questionnaire from './pages/Questionnaire'
import Results from './pages/Results'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/intake" element={<Intake />} />
        <Route path="/questionnaire" element={<Questionnaire />} />
        <Route path="/results/:id" element={<Results />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}
