<template>
  <div class="info-panel glass slide-up" v-if="city">
    <button class="close-btn" @click="close">×</button>

    <div class="panel-content">
      <div class="photo-section">
        <PhotoCarousel :photos="photos" />
      </div>

      <div class="detail-section">
        <h2 class="city-name">{{ city.name }}</h2>
        <p class="province" v-if="city.province_name">{{ city.province_name }}</p>

        <div class="meta">
          <span class="date">📅 {{ formatDate(city.visited_at) }}</span>
        </div>

        <div class="tags" v-if="city.tags">
          <span class="tag" v-for="tag in parseTags(city.tags)" :key="tag">{{ tag }}</span>
        </div>

        <p class="description" v-if="city.description">{{ city.description }}</p>

        <!-- 编辑模式下的操作 -->
        <div class="actions" v-if="editStore.isAuthenticated">
          <button class="btn btn-secondary" @click="$emit('edit', city)">编辑</button>
          <button class="btn btn-secondary" @click="$emit('delete', city.id)">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useEditStore } from '../stores/edit'
import PhotoCarousel from './PhotoCarousel.vue'

const props = defineProps({
  city: Object,
  photos: Array
})
const emit = defineEmits(['close', 'edit', 'delete'])

const editStore = useEditStore()

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

const parseTags = (tags) => {
  if (!tags) return []
  return tags.split(',').map(t => t.trim()).filter(t => t)
}

const close = () => {
  emit('close')
}
</script>

<style scoped>
.info-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 50vh;
  padding: 20px;
  border-radius: 24px 24px 0 0;
  z-index: 50;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border: none;
  background: var(--glass-bg);
  color: var(--dark);
  border-radius: 50%;
  cursor: pointer;
  font-size: 20px;
  transition: all 0.3s ease;
}

.close-btn:hover {
  background: var(--accent);
  color: white;
}

.panel-content {
  display: flex;
  gap: 24px;
  margin-top: 10px;
}

.photo-section {
  flex: 1;
  min-width: 200px;
}

.detail-section {
  flex: 1;
  overflow-y: auto;
}

.city-name {
  font-family: 'Noto Serif SC', serif;
  font-size: 24px;
  color: var(--dark);
  margin-bottom: 4px;
}

.province {
  color: var(--primary);
  font-size: 14px;
  margin-bottom: 12px;
}

.meta {
  margin-bottom: 12px;
}

.date {
  color: var(--dark);
  font-size: 14px;
}

.tags {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.tag {
  background: var(--primary);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
}

.description {
  color: var(--dark);
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 16px;
}

.actions {
  display: flex;
  gap: 12px;
}

@media (max-width: 600px) {
  .panel-content {
    flex-direction: column;
  }

  .photo-section {
    min-width: 100%;
  }
}
</style>