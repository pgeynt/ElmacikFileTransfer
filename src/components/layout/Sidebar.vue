<template>
  <div class="sidebar">
    <div class="menu">
      <router-link to="/" class="menu-item" active-class="active">
        <i class="fas fa-home"></i>
        <span class="menu-text">Ana Sayfa</span>
      </router-link>
      
      <router-link to="/downloads" class="menu-item" active-class="active">
        <i class="fas fa-download"></i>
        <span class="menu-text">İndirilebilenler</span>
      </router-link>
      
      <router-link to="/history" class="menu-item" active-class="active">
        <i class="fas fa-history"></i>
        <span class="menu-text">Geçmiş</span>
      </router-link>
      
      <router-link to="/settings" class="menu-item" active-class="active">
        <i class="fas fa-cog"></i>
        <span class="menu-text">Ayarlar</span>
      </router-link>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Sidebar'
}
</script>

<style scoped>
.sidebar {
  background: linear-gradient(180deg, #4568dc 0%, #3f5bc7 100%);
  color: white;
  width: 70px;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  overflow: hidden;
  z-index: 100;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
}

.sidebar:hover {
  width: 200px;
}

.menu {
  display: flex;
  flex-direction: column;
  margin-top: 25px;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 15px 20px;
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  transition: all 0.2s ease;
  white-space: nowrap;
  border-left: 3px solid transparent;
  margin-bottom: 5px;
}

.menu-item i {
  font-size: 18px;
  min-width: 30px;
  text-align: center;
}

.menu-text {
  opacity: 0;
  transition: opacity 0.3s;
  font-weight: 500;
  margin-left: 10px;
}

.sidebar:hover .menu-text {
  opacity: 1;
}

.menu-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  border-left: 3px solid white;
}

.menu-item.active {
  background-color: rgba(255, 255, 255, 0.15);
  color: white;
  border-left: 3px solid white;
}
</style> 