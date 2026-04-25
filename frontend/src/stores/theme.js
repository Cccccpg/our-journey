import { defineStore } from 'pinia'
import { getThemes, getActiveTheme, setActiveTheme, updateTheme } from '../api'

export const useThemeStore = defineStore('theme', {
  state: () => ({
    themes: [],
    activeTheme: null,
    showSelector: false
  }),

  actions: {
    async fetchThemes() {
      const { data } = await getThemes()
      this.themes = data.themes
    },

    async fetchActiveTheme() {
      const { data } = await getActiveTheme()
      this.activeTheme = data.theme
      this.applyTheme(data.theme)
    },

    applyTheme(theme) {
      document.documentElement.style.setProperty('--primary', theme.primary_color)
      document.documentElement.style.setProperty('--accent', theme.accent_color)
      document.documentElement.style.setProperty('--dark', theme.dark_color)
      document.documentElement.style.setProperty('--light', theme.light_color)
    },

    async setActive(id) {
      await setActiveTheme(id)
      await this.fetchActiveTheme()
    },

    async updateThemeColors(id, colors) {
      await updateTheme(id, colors)
      await this.fetchActiveTheme()
    },

    toggleSelector() {
      this.showSelector = !this.showSelector
    }
  }
})