import { defineStore } from 'pinia'
import { authLogin, verifyAuth } from '../api'

export const useEditStore = defineStore('edit', {
  state: () => ({
    isEditMode: false,
    isAuthenticated: false,
    showPasswordModal: false,
    token: null,
    error: null
  }),

  actions: {
    checkEditMode() {
      const urlParams = new URLSearchParams(window.location.search)
      this.token = urlParams.get('token')
      if (this.token) {
        this.isEditMode = true
        this.checkExistingAuth()
      }
    },

    async checkExistingAuth() {
      const jwt = localStorage.getItem('jwt')
      if (jwt) {
        try {
          const { data } = await verifyAuth()
          if (data.valid) {
            this.isAuthenticated = true
          } else {
            localStorage.removeItem('jwt')
            this.showPasswordModal = true
          }
        } catch {
          this.showPasswordModal = true
        }
      } else {
        this.showPasswordModal = true
      }
    },

    async login(password) {
      try {
        this.error = null
        const token = this.token || 'travel2024love'
        const { data } = await authLogin(token, password)
        if (data.success) {
          localStorage.setItem('jwt', data.jwt)
          this.token = token
          this.isEditMode = true
          this.isAuthenticated = true
          this.showPasswordModal = false
        }
      } catch (err) {
        this.error = err.response?.data?.error || '登录失败'
      }
    },

    logout() {
      localStorage.removeItem('jwt')
      this.isAuthenticated = false
      this.showPasswordModal = true
    }
  }
})
