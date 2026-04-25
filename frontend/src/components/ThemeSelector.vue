<template>
  <div class="theme-selector glass slide-up">
    <h3>选择主题</h3>
    <div class="themes-grid">
      <div
        class="theme-item"
        v-for="theme in themeStore.themes"
        :key="theme.id"
        :class="{ active: theme.id === themeStore.activeTheme?.id }"
        @click="selectTheme(theme)"
      >
        <div class="theme-preview" :style="previewStyle(theme)">
          <div class="preview-circle primary"></div>
          <div class="preview-circle accent"></div>
        </div>
        <span class="theme-name">{{ theme.name }}</span>
      </div>
    </div>
    <button class="btn btn-secondary close-btn" @click="themeStore.toggleSelector()">关闭</button>
  </div>
</template>

<script setup>
import { useThemeStore } from '../stores/theme'

const themeStore = useThemeStore()

const previewStyle = (theme) => ({
  '--preview-primary': theme.primary_color,
  '--preview-accent': theme.accent_color,
  '--preview-light': theme.light_color
})

const selectTheme = async (theme) => {
  await themeStore.setActive(theme.id)
}
</script>

<style scoped>
.theme-selector {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 280px;
  padding: 20px;
  border-radius: 16px;
}

h3 {
  font-size: 14px;
  color: var(--dark);
  margin-bottom: 16px;
}

.themes-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.theme-item {
  cursor: pointer;
  padding: 12px;
  border-radius: 12px;
  background: var(--light);
  transition: all 0.3s ease;
  text-align: center;
}

.theme-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-soft);
}

.theme-item.active {
  border: 2px solid var(--accent);
}

.theme-preview {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 8px;
  background: var(--preview-light);
  padding: 10px;
  border-radius: 8px;
}

.preview-circle {
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

.preview-circle.primary {
  background: var(--preview-primary);
}

.preview-circle.accent {
  background: var(--preview-accent);
}

.theme-name {
  font-size: 12px;
  color: var(--dark);
}

.close-btn {
  margin-top: 16px;
  width: 100%;
}
</style>