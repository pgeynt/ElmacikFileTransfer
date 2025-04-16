<template>
  <div class="settings-page">
    <h1 class="page-title">Ayarlar</h1>
    
    <div class="card">
      <div class="empty-state">
        <i class="fas fa-cog fa-3x"></i>
        <p>Ayarlar yakında kullanıma açılacak</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SettingsPage'
}
</script>

<style scoped>
.settings-page {
  max-width: 1200px;
  margin: 0 auto;
}

.empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 60px 20px;
  color: #64748b;
  text-align: center;
}

.empty-state i {
  margin-bottom: 20px;
  color: #cbd5e1;
}

.empty-state p {
  font-size: 16px;
  margin: 0;
}
</style> 