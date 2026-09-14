import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'

import Home from '@/pages/public/Home'
import Success from '@/pages/public/Success'
import UniversityPage from '@/pages/public/UniversityPage'
import PrivacyPolicy from '@/pages/public/PrivacyPolicy'
import NotFound from '@/pages/public/NotFound'

import AdminLogin from '@/pages/admin/AdminLogin'
import AdminLayout from '@/pages/admin/AdminLayout'
import Overview from '@/pages/admin/Overview'
import Pipeline from '@/pages/admin/Pipeline'
import Students from '@/pages/admin/Students'
import CourseAnalytics from '@/pages/admin/CourseAnalytics'
import Export from '@/pages/admin/Export'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/success" element={<Success />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/:countryCode/:slug" element={<UniversityPage />} />

          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Overview />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="students" element={<Students />} />
            <Route path="analytics" element={<CourseAnalytics />} />
            <Route path="export" element={<Export />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
