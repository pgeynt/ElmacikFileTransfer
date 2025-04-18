<template>
  <div class="header">
    <div class="header-left">
      <div class="search-box">
        <i class="fas fa-search"></i>
        <input type="text" placeholder="Ara..." />
      </div>
    </div>
    
    <div class="header-right">
      <div class="notifications">
        <i class="fas fa-bell"></i>
        <span class="badge">2</span>
      </div>
      
      <div class="user-profile">
        <div class="avatar">
          <img src="https://ui-avatars.com/api/?name=User&background=4568dc&color=fff" alt="User" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Header'
}
</script>

<style scoped>
.header {
  height: 70px;
  background-color: var(--color-card-bg, white);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 30px;
  box-shadow: 0 2px 4px rgba(var(--color-background-rgb, 0, 0, 0), 0.1);
  position: fixed;
  top: 0;
  left: 70px;
  right: 0;
  z-index: 99;
}

.header-left, .header-right {
  display: flex;
  align-items: center;
}

.search-box {
  display: flex;
  align-items: center;
  background-color: var(--color-secondary, #f5f7fb);
  border-radius: 20px;
  padding: 8px 15px;
  width: 300px;
}

.search-box i {
  color: var(--color-text-light, #8e9ab4);
  margin-right: 10px;
}

.search-box input {
  background: none;
  border: none;
  outline: none;
  color: var(--color-text, #2c3e50);
  width: 100%;
}

.search-box input::placeholder {
  color: var(--color-text-light, #8e9ab4);
}

.notifications {
  position: relative;
  margin-right: 25px;
  cursor: pointer;
}

.notifications i {
  font-size: 20px;
  color: var(--color-text-light, #8e9ab4);
}

.badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background-color: var(--color-error, #f56565);
  color: white;
  font-size: 12px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.user-profile {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--color-primary, #4568dc);
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style> 