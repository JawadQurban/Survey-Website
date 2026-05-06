import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/queryClient'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { AdminGuard } from '@/routes/AdminGuard'
import { PageSpinner } from '@/components/ui/Spinner'
import { useLanguageStore } from '@/store/languageStore'
import { useEffect } from 'react'

const LandingPage = lazy(() => import('@/features/public/LandingPage').then((m) => ({ default: m.LandingPage })))
const SurveyLandingPage = lazy(() => import('@/features/public/SurveyLandingPage').then((m) => ({ default: m.SurveyLandingPage })))
const SurveyForm = lazy(() => import('@/features/public/SurveyForm').then((m) => ({ default: m.SurveyForm })))
const SurveyReview = lazy(() => import('@/features/public/SurveyReview').then((m) => ({ default: m.SurveyReview })))
const ThankYou = lazy(() => import('@/features/public/ThankYou').then((m) => ({ default: m.ThankYou })))
const GroupRegistrationLandingPage = lazy(() => import('@/features/public/GroupRegistrationLandingPage').then((m) => ({ default: m.GroupRegistrationLandingPage })))
const GroupRegistrationForm = lazy(() => import('@/features/public/GroupRegistrationForm').then((m) => ({ default: m.GroupRegistrationForm })))
const GroupRegistrationThankYou = lazy(() => import('@/features/public/GroupRegistrationThankYou').then((m) => ({ default: m.GroupRegistrationThankYou })))

const AdminLogin = lazy(() => import('@/features/admin/Login').then((m) => ({ default: m.AdminLogin })))
const Dashboard = lazy(() => import('@/features/admin/Dashboard').then((m) => ({ default: m.Dashboard })))
const Surveys = lazy(() => import('@/features/admin/Surveys').then((m) => ({ default: m.Surveys })))
const Submissions = lazy(() => import('@/features/admin/Submissions').then((m) => ({ default: m.Submissions })))
const QuestionBuilder = lazy(() => import('@/features/admin/QuestionBuilder').then((m) => ({ default: m.QuestionBuilder })))
const GroupRegistrationAdmin = lazy(() => import('@/features/admin/GroupRegistrationAdmin').then((m) => ({ default: m.GroupRegistrationAdmin })))
const TrainingCourses = lazy(() => import('@/features/admin/TrainingCourses').then((m) => ({ default: m.TrainingCourses })))
const AdminUsers = lazy(() => import('@/features/admin/AdminUsers').then((m) => ({ default: m.AdminUsers })))

function RedirectToStart() {
  const { surveySlug } = useParams<{ surveySlug: string }>()
  return <Navigate to={`/survey/${surveySlug}/start`} replace />
}

function AppInit() {
  const { language, setLanguage } = useLanguageStore()
  useEffect(() => {
    setLanguage(language)
  }, [])
  return null
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppInit />
        <Suspense fallback={<PageSpinner />}>
          <Routes>
            {/* Public routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
              {/* Legacy onboarding/overview URLs redirect directly to the survey form */}
              <Route path="/survey/:surveySlug" element={<SurveyLandingPage />} />
              <Route path="/survey/:surveySlug/begin" element={<RedirectToStart />} />
              <Route path="/survey/:surveySlug/overview" element={<RedirectToStart />} />
              <Route path="/survey/:surveySlug/start" element={<SurveyForm />} />
              <Route path="/survey/:surveySlug/review" element={<SurveyReview />} />
              <Route path="/survey/:surveySlug/thank-you" element={<ThankYou />} />
              {/* Group Registration — completely separate from existing surveys */}
              <Route path="/group-registration/:slug" element={<GroupRegistrationLandingPage />} />
              <Route path="/group-registration/:slug/form" element={<GroupRegistrationForm />} />
              <Route path="/group-registration/:slug/thank-you" element={<GroupRegistrationThankYou />} />
            </Route>

            {/* Admin login (no layout guard) */}
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Protected admin routes */}
            <Route element={<AdminGuard />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/admin/dashboard" element={<Dashboard />} />
                <Route path="/admin/surveys" element={<Surveys />} />
                <Route path="/admin/submissions" element={<Submissions />} />
                <Route path="/admin/surveys/:surveyId/builder" element={<QuestionBuilder />} />
                <Route path="/admin/cms" element={<div className="p-4 text-tfa-gray-500">CMS management — coming in next iteration</div>} />
                <Route path="/admin/settings" element={<div className="p-4 text-tfa-gray-500">Settings — coming in next iteration</div>} />
                {/* Admin Users — superadmin only (enforced server-side + client-side) */}
                <Route path="/admin/users" element={<AdminUsers />} />
                {/* Group Registration admin — permission-gated */}
                <Route element={<AdminGuard requiredPermission="surveys.group_registration.manage" />}>
                  <Route path="/admin/group-registration" element={<GroupRegistrationAdmin />} />
                  <Route path="/admin/training-courses" element={<TrainingCourses />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
