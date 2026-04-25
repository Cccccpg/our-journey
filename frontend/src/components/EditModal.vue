<template>
  <div class="edit-overlay" v-if="show">
    <div class="edit-modal glass card bounce-scale">
      <h2>{{ isNew ? '添加新足迹' : '编辑足迹' }}</h2>

      <div class="form">
        <div class="form-row">
          <label>城市名称</label>
          <input v-model="form.name" placeholder="如：成都" />
        </div>

        <div class="form-row">
          <label>所属省份</label>
          <select v-model="form.province_id">
            <option value="">选择省份</option>
            <option v-for="p in provinces" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>

        <div class="form-row coords">
          <label>坐标</label>
          <input type="number" v-model.number="form.latitude" placeholder="纬度" step="0.01" />
          <input type="number" v-model.number="form.longitude" placeholder="经度" step="0.01" />
        </div>

        <div class="form-row">
          <label>访问日期</label>
          <input type="date" v-model="form.visited_at" />
        </div>

        <div class="form-row">
          <label>描述回忆</label>
          <textarea v-model="form.description" placeholder="写下你们的美好回忆..." rows="3"></textarea>
        </div>

        <div class="form-row">
          <label>标签</label>
          <input v-model="form.tags" placeholder="如：第一次,美食,风景（逗号分隔）" />
        </div>

        <!-- 现有照片管理 -->
        <div class="form-row" v-if="!isNew && existingPhotos.length">
          <label>现有照片</label>
          <div class="existing-photos">
            <div class="photo-item" v-for="p in existingPhotos" :key="p.id">
              <img :src="p.file_path" />
              <button class="delete-photo" @click="deletePhoto(p.id)">删除</button>
            </div>
          </div>
        </div>

        <!-- 上传新照片（新建和编辑都可以） -->
        <div class="form-row">
          <label>{{ isNew ? '上传照片' : '添加更多照片' }}</label>
          <div class="upload-area" @click="triggerUpload" @dragover.prevent @drop.prevent="onDrop">
            <input type="file" multiple accept="image/*" @change="onFileChange" ref="fileInput" style="display:none" />
            <div class="upload-hint">
              <span class="upload-icon">📷</span>
              <p>点击或拖拽照片到这里上传</p>
              <p class="small">支持 JPG、PNG、WebP 格式</p>
            </div>
          </div>
          <div class="file-preview" v-if="files.length">
            <div class="preview-item" v-for="(f, i) in files" :key="i">
              <img :src="f.preview" />
              <button @click="removeFile(i)">×</button>
            </div>
          </div>
        </div>
      </div>

      <div class="buttons">
        <button class="btn btn-secondary" @click="$emit('close')">取消</button>
        <button class="btn btn-primary" @click="submit" :disabled="!isValid">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePlacesStore } from '../stores/places'
import { deletePhoto as apiDeletePhoto, uploadPhotos } from '../api'

const props = defineProps({
  show: Boolean,
  city: Object,
  isNew: Boolean,
  coords: Object
})

const emit = defineEmits(['close', 'save'])

const placesStore = usePlacesStore()

const form = ref({
  name: '',
  province_id: '',
  latitude: 0,
  longitude: 0,
  visited_at: '',
  description: '',
  tags: ''
})

const files = ref([])
const existingPhotos = ref([])
const fileInput = ref(null)

const provinces = computed(() => placesStore.provinces)

const triggerUpload = () => {
  fileInput.value?.click()
}

const onDrop = (e) => {
  const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
  const newFiles = droppedFiles.map(file => ({
    file,
    preview: URL.createObjectURL(file)
  }))
  files.value = [...files.value, ...newFiles]
}

const isValid = computed(() => {
  return form.value.name &&
         form.value.latitude &&
         form.value.longitude &&
         form.value.visited_at
})

// 初始化表单
watch(() => props.city, (city) => {
  if (city && !props.isNew) {
    form.value = {
      name: city.name,
      province_id: city.province_id || '',
      latitude: city.latitude,
      longitude: city.longitude,
      visited_at: city.visited_at,
      description: city.description || '',
      tags: city.tags || ''
    }
    existingPhotos.value = placesStore.cityPhotos
  } else if (props.isNew && props.coords) {
    form.value.latitude = props.coords.latitude
    form.value.longitude = props.coords.longitude
    form.value.name = ''
    form.value.province_id = ''
    form.value.visited_at = ''
    form.value.description = ''
    form.value.tags = ''
    files.value = []
  }
}, { immediate: true })

const onFileChange = (e) => {
  const newFiles = Array.from(e.target.files).map(file => ({
    file,
    preview: URL.createObjectURL(file)
  }))
  files.value = [...files.value, ...newFiles]
}

const removeFile = (index) => {
  files.value.splice(index, 1)
}

const deletePhoto = async (id) => {
  await apiDeletePhoto(id)
  existingPhotos.value = existingPhotos.value.filter(p => p.id !== id)
}

const submit = async () => {
  const data = {
    ...form.value,
    province_id: form.value.province_id || null
  }

  let cityId
  if (props.isNew) {
    cityId = await placesStore.addCity(data)
  } else {
    await placesStore.updateCity(props.city.id, data)
    cityId = props.city.id
  }

  // 上传照片（新建和编辑都可以）
  if (files.value.length) {
    await uploadPhotos(cityId, files.value.map(f => f.file))
  }

  emit('save', cityId)
  emit('close')
}
</script>

<style scoped>
.edit-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.edit-modal {
  width: 480px;
  max-height: 80vh;
  overflow-y: auto;
}

h2 {
  font-family: 'Noto Serif SC', serif;
  color: var(--dark);
  margin-bottom: 20px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-row.coords {
  display: flex;
  gap: 12px;
}

.form-row.coords input {
  flex: 1;
}

label {
  font-size: 14px;
  color: var(--dark);
  font-weight: 500;
}

.file-preview {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.preview-item {
  position: relative;
  width: 80px;
  height: 80px;
}

.preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}

.preview-item button {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 20px;
  height: 20px;
  border: none;
  background: #e74c3c;
  color: white;
  border-radius: 50%;
  cursor: pointer;
}

.existing-photos {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.photo-item {
  position: relative;
  width: 80px;
  height: 80px;
}

.photo-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}

.delete-photo {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px;
  border: none;
  background: rgba(231, 76, 60, 0.8);
  color: white;
  font-size: 12px;
  cursor: pointer;
}

.upload-area {
  border: 2px dashed var(--primary);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: var(--light);
}

.upload-area:hover {
  border-color: var(--accent);
  background: rgba(255, 107, 107, 0.1);
}

.upload-hint {
  color: var(--dark);
}

.upload-icon {
  font-size: 32px;
  margin-bottom: 8px;
  display: block;
}

.upload-hint p {
  margin: 4px 0;
}

.upload-hint .small {
  font-size: 12px;
  color: var(--primary);
}

.buttons {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  justify-content: flex-end;
}

@media (max-width: 600px) {
  .edit-modal {
    width: calc(100% - 40px);
    max-height: 90vh;
  }
}
</style>