import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry && original.url !== '/admin/auth/refresh') {
      original._retry = true
      try {
        await api.post('/admin/auth/refresh')
        return api(original)
      } catch {
        window.location.href = '/admin/login'
      }
    }
    return Promise.reject(err)
  }
)

// Public
export const publicApi = {
  listActiveSurveys: (language: string) =>
    api.get('/public/surveys', { params: { language } }),

  beginSurvey: (
    surveySlug: string,
    data: {
      org_name?: string | null
      sector: string
      regulator?: string | null
      org_size: string
      respondent_name?: string | null
      respondent_email?: string | null
      role: string
    }
  ) => api.post(`/public/surveys/${surveySlug}/begin`, data),

  getSurveyOverview: (slug: string, language: string) =>
    api.get(`/public/surveys/${slug}/overview`, { params: { language } }),

  getSurveyQuestions: (slug: string, language: string) =>
    api.get(`/public/surveys/${slug}/questions`, { params: { language } }),

  saveDraft: (data: { survey_slug: string; language: string; answers: object[] }) =>
    api.post('/public/submissions/draft', data),

  submitSurvey: (data: { survey_slug: string; language: string; answers: object[] }) =>
    api.post('/public/submissions/submit', data),

  getMySubmission: (surveySlug: string) =>
    api.get('/public/submissions/my', { params: { survey_slug: surveySlug } }),
}

// Admin
export const adminApi = {
  login: (email: string, password: string) =>
    api.post('/admin/auth/login', { email, password }),

  logout: () => api.post('/admin/auth/logout'),

  getMe: () => api.get('/admin/auth/me'),

  getDashboard: () => api.get('/admin/dashboard'),

  // Organizations
  listOrganizations: (params?: { skip?: number; limit?: number }) =>
    api.get('/admin/organizations', { params }),
  createOrganization: (data: object) => api.post('/admin/organizations', data),
  updateOrganization: (id: number, data: object) => api.put(`/admin/organizations/${id}`, data),
  deleteOrganization: (id: number) => api.delete(`/admin/organizations/${id}`),

  // Contacts
  listContacts: (orgId?: number) =>
    api.get('/admin/contacts', { params: orgId ? { org_id: orgId } : undefined }),
  createContact: (data: object) => api.post('/admin/contacts', data),
  updateContact: (id: number, data: object) => api.put(`/admin/contacts/${id}`, data),
  deleteContact: (id: number) => api.delete(`/admin/contacts/${id}`),

  // Surveys
  listSurveys: () => api.get('/admin/surveys'),
  getSurvey: (id: number) => api.get(`/admin/surveys/${id}`),
  createSurvey: (data: object) => api.post('/admin/surveys', data),
  updateSurvey: (id: number, data: object) => api.put(`/admin/surveys/${id}`, data),
  deleteSurvey: (id: number) => api.delete(`/admin/surveys/${id}`),

  // Questions
  createQuestion: (data: object) => api.post('/admin/questions', data),
  updateQuestion: (id: number, data: object) => api.put(`/admin/questions/${id}`, data),
  deleteQuestion: (id: number) => api.delete(`/admin/questions/${id}`),

  // Options
  createOption: (data: object) => api.post('/admin/options', data),
  updateOption: (id: number, data: object) => api.put(`/admin/options/${id}`, data),
  deleteOption: (id: number) => api.delete(`/admin/options/${id}`),

  // Sections
  createSection: (data: object) => api.post('/admin/sections', data),
  deleteSection: (id: number) => api.delete(`/admin/sections/${id}`),

  // Submissions
  listSubmissions: (params?: object) => api.get('/admin/submissions', { params }),
  getSubmission: (id: number) => api.get(`/admin/submissions/${id}`),
  exportCsv: (params?: object) =>
    api.get('/admin/submissions/export/csv', { params, responseType: 'blob' }),
  exportXlsx: (params?: object) =>
    api.get('/admin/submissions/export/xlsx', { params, responseType: 'blob' }),

  // CMS
  listCmsPages: () => api.get('/admin/cms/pages'),
  getCmsPage: (key: string) => api.get(`/admin/cms/pages/${key}`),
  updateCmsPage: (key: string, data: object) => api.put(`/admin/cms/pages/${key}`, data),
  getBranding: () => api.get('/admin/cms/branding'),
  updateBranding: (data: object) => api.put('/admin/cms/branding', data),
}

export default api
