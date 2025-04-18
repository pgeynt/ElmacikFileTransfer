<template>
  <div class="app-container">
    <Sidebar />
    <main class="main-content">
      <slot></slot>
    </main>
  </div>
</template>

<script>
import Sidebar from './Sidebar.vue'

export default {
  name: 'MainLayout',
  components: {
    Sidebar
  }
}
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--color-background, #f5f7fb);
}

.main-content {
  margin-left: 70px;
  padding: 25px;
  min-height: 100vh;
}
</style> 