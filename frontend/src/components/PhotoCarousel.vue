<template>
  <div class="carousel">
    <div class="carousel-container" v-if="photos.length > 0">
      <div
        class="carousel-slide"
        :class="{ active: currentIndex === i }"
        v-for="(photo, i) in photos"
        :key="photo.id"
        @click="viewFull(photo)"
      >
        <img
          :src="photo.file_path"
          :alt="photo.original_name"
          loading="lazy"
          @load="onLoad($event)"
        />
      </div>
    </div>
    <div class="empty" v-else>
      <span>暂无照片</span>
    </div>

    <div class="carousel-nav" v-if="photos.length > 1">
      <button class="nav-btn prev" @click="prev" :disabled="currentIndex === 0">‹</button>
      <div class="dots">
        <span
          class="dot"
          :class="{ active: currentIndex === i }"
          v-for="(_, i) in photos"
          :key="i"
          @click="currentIndex = i"
        ></span>
      </div>
      <button class="nav-btn next" @click="next" :disabled="currentIndex === photos.length - 1">›</button>
    </div>

    <!-- 全屏查看 -->
    <div class="fullscreen" v-if="fullscreenPhoto" @click="fullscreenPhoto = null">
      <img :src="fullscreenPhoto.file_path" class="fade-in" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({ photos: Array })
const currentIndex = ref(0)
const fullscreenPhoto = ref(null)

const prev = () => {
  if (currentIndex.value > 0) currentIndex.value--
}

const next = () => {
  if (currentIndex.value < props.photos.length - 1) currentIndex.value++
}

const onLoad = (e) => {
  e.target.classList.add('photo-loaded')
}

const viewFull = (photo) => {
  fullscreenPhoto.value = photo
}

// 自动轮播
let autoTimer = null
onMounted(() => {
  if (props.photos.length > 1) {
    autoTimer = setInterval(() => {
      if (currentIndex.value >= props.photos.length - 1) {
        currentIndex.value = 0
      } else {
        currentIndex.value++
      }
    }, 5000)
  }
})

onUnmounted(() => {
  if (autoTimer) clearInterval(autoTimer)
})

watch(() => props.photos, () => {
  currentIndex.value = 0
})
</script>

<style scoped>
.carousel {
  width: 100%;
  height: 200px;
  position: relative;
}

.carousel-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 12px;
  background: var(--light);
}

.carousel-slide {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.5s ease;
  cursor: pointer;
}

.carousel-slide.active {
  opacity: 1;
}

.carousel-slide img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.empty {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: var(--primary);
  font-size: 14px;
}

.carousel-nav {
  position: absolute;
  bottom: 10px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
}

.nav-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: var(--glass-bg);
  color: var(--dark);
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s ease;
}

.nav-btn:hover:not(:disabled) {
  background: var(--accent);
  color: white;
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dots {
  display: flex;
  gap: 6px;
}

.dot {
  width: 8px;
  height: 8px;
  background: var(--primary);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  opacity: 0.5;
}

.dot.active {
  opacity: 1;
  background: var(--accent);
}

.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  cursor: pointer;
}

.fullscreen img {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
  border-radius: 8px;
}

@media (max-width: 600px) {
  .carousel {
    height: 150px;
  }
}
</style>