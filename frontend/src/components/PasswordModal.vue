<template>
  <div class="password-overlay" v-if="show">
    <div class="password-modal glass card bounce-scale">
      <h2>进入编辑模式</h2>
      <p class="hint">请输入编辑密码</p>
      <input
        type="password"
        v-model="password"
        placeholder="输入密码..."
        @keyup.enter="submit"
        autofocus
      />
      <p class="error" v-if="error">{{ error }}</p>
      <div class="buttons">
        <button class="btn btn-secondary" @click="cancel">取消</button>
        <button class="btn btn-primary" @click="submit">确认</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useEditStore } from '../stores/edit'

const props = defineProps({ show: Boolean })
const emit = defineEmits(['cancel'])

const editStore = useEditStore()
const password = ref('')
const error = ref(null)

const submit = async () => {
  if (!password.value) return
  await editStore.login(password.value)
  if (!editStore.isAuthenticated) {
    error.value = editStore.error
  }
  password.value = ''
}

const cancel = () => {
  editStore.isEditMode = false
  editStore.showPasswordModal = false
  emit('cancel')
}
</script>

<style scoped>
.password-overlay {
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

.password-modal {
  width: 360px;
  text-align: center;
}

h2 {
  font-family: 'Noto Serif SC', serif;
  color: var(--dark);
  margin-bottom: 8px;
}

.hint {
  color: var(--primary);
  margin-bottom: 20px;
}

input {
  margin-bottom: 16px;
}

.error {
  color: #e74c3c;
  font-size: 12px;
  margin-bottom: 16px;
}

.buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}
</style>