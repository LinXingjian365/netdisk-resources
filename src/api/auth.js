import http from './client'

export const authApi = {
  sendVerificationCode(email) {
    return http.post('/auth/send-verification-code', { email })
  },

  verifyCode(email, code) {
    return http.post('/auth/verify-code', { email, code })
  },

  resendVerificationCode(email) {
    return http.post('/auth/resend-verification-code', { email })
  },

  checkEmailVerification(email, verificationToken) {
    return http.post('/auth/check-email-verification', { email, verificationToken })
  },

  register(payload) {
    return http.post('/auth/register', payload)
  },

  login(payload) {
    return http.post('/auth/login', payload)
  },

  logout() {
    return http.post('/auth/logout')
  },

  refresh(refreshToken) {
    return http.post('/auth/refresh', { refreshToken })
  },

  profile() {
    return http.get('/auth/profile')
  },

  updateProfile(patch) {
    return http.patch('/auth/profile', patch)
  }
}

export default authApi
