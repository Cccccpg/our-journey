<template>
  <div class="top-bar glass">
    <div class="left">
      <h1 class="title">我们的足迹 <span class="heart">♥</span></h1>
    </div>
    <div class="right">
      <button class="btn btn-secondary" @click="themeStore.toggleSelector()">
        <span>🎨</span> 主题
      </button>
      <template v-if="editStore.isEditMode">
        <template v-if="editStore.isAuthenticated">
          <span class="edit-badge">编辑模式</span>
          <button class="btn btn-secondary" @click="editStore.logout()">退出</button>
        </template>
      </template>
    </div>
    <ThemeSelector v-if="themeStore.showSelector" />
  </div>
</template>

<script setup>
import { useThemeStore } from '../stores/theme'
import { useEditStore } from '../stores/edit'
import ThemeSelector from './ThemeSelector.vue'

const themeStore = useThemeStore()
const editStore = useEditStore()
</script>

<style scoped>
.top-bar {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  z-index: 100;
  border-radius: 20px;
}

.left {
  flex: 1;
}

.title {
  font-family: 'Noto Serif SC', serif;
  font-size: 20px;
  font-weight: 600;
  color: var(--dark);
}

.heart {
  color: var(--accent);
  animation: breathe 2s ease-in-out infinite;
}

.right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.edit-badge {
  background: var(--accent);
  color: white;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
}

@media (max-width: 600px) {
  .top-bar {
    width: calc(100% - 40px);
    padding: 10px 16px;
  }
  .title {
    font-size: 16px;
  }
}
</style>