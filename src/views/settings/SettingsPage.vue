<template>
  <div class="settings-page">
    <h1 class="page-title">Ayarlar</h1>
    
    <div class="card">
      <div class="card-section">
        <h2 class="section-title">
          <i class="fas fa-palette"></i>
          Tema Ayarları
        </h2>
        
        <div class="theme-settings">
          <p class="section-description">Uygulamanın görünümünü değiştirmek için bir tema seçin</p>
          
          <div class="theme-options">
            <div 
              v-for="theme in themes" 
              :key="theme.id" 
              class="theme-option" 
              :class="{ 'active': selectedTheme === theme.id }"
              @click="selectTheme(theme.id)"
            >
              <div class="theme-preview" :style="getThemePreviewStyle(theme)">
                <div class="preview-header" :style="{ backgroundColor: theme.colors.primary }"></div>
                <div class="preview-content" :style="{ backgroundColor: theme.colors.background }">
                  <div class="preview-card" :style="{ backgroundColor: theme.colors.cardBg, borderColor: theme.colors.primary }"></div>
                </div>
              </div>
              <div class="theme-name">{{ theme.name }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="settings-actions">
        <button @click="applyTheme" class="btn btn-primary">
          <i class="fas fa-check"></i>
          Temayı Uygula
        </button>
      </div>
    </div>
    
    <!-- Modern Toast Notification -->
    <div class="toast-notification" v-if="toast.show" :class="toast.type">
      <div class="toast-icon">
        <i :class="getToastIcon()"></i>
      </div>
      <div class="toast-content">
        <div class="toast-title">{{ toast.title }}</div>
        <div class="toast-message">{{ toast.message }}</div>
      </div>
      <button class="toast-close" @click="closeToast">
        <i class="fas fa-times"></i>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SettingsPage',
  data() {
    return {
      selectedTheme: 'light',
      toast: {
        show: false,
        title: '',
        message: '',
        type: 'success',
        timeout: null
      },
      themes: [
        {
          id: 'light',
          name: 'Açık Mod',
          colors: {
            primary: '#4568dc',
            secondary: '#e9f1ff',
            background: '#f8fafc',
            cardBg: '#ffffff',
            text: '#0f172a',
            textLight: '#64748b',
            border: '#e2e8f0'
          }
        },
        {
          id: 'dark',
          name: 'Koyu Mod',
          colors: {
            primary: '#6d8eff',
            secondary: '#1e293b',
            background: '#0f172a',
            cardBg: '#1e293b',
            text: '#f1f5f9',
            textLight: '#94a3b8',
            border: '#334155'
          }
        },
        {
          id: 'cyan',
          name: 'Mavi-Turkuaz Mod',
          colors: {
            primary: '#06b6d4',
            secondary: '#e0faff',
            background: '#f0fdff',
            cardBg: '#ffffff',
            text: '#0e7490',
            textLight: '#0891b2',
            border: '#cffafe'
          }
        },
        {
          id: 'green',
          name: 'Yeşil Mod',
          colors: {
            primary: '#10b981',
            secondary: '#d1fae5',
            background: '#f0fff4',
            cardBg: '#ffffff',
            text: '#047857',
            textLight: '#059669',
            border: '#a7f3d0'
          }
        },
        {
          id: 'purple',
          name: 'Mor Mod',
          colors: {
            primary: '#8b5cf6',
            secondary: '#ede9fe',
            background: '#f5f3ff',
            cardBg: '#ffffff',
            text: '#5b21b6',
            textLight: '#7c3aed',
            border: '#c4b5fd'
          }
        },
        {
          id: 'gray',
          name: 'Gri Mod',
          colors: {
            primary: '#64748b',
            secondary: '#f1f5f9',
            background: '#f8fafc',
            cardBg: '#ffffff',
            text: '#334155',
            textLight: '#64748b',
            border: '#e2e8f0'
          }
        }
      ]
    }
  },
  mounted() {
    this.loadCurrentTheme();
  },
  methods: {
    getThemePreviewStyle(theme) {
      return {
        borderColor: theme.colors.primary
      };
    },
    
    async loadCurrentTheme() {
      if (window.electron) {
        try {
          const savedTheme = await window.electron.getAppTheme();
          if (savedTheme) {
            this.selectedTheme = savedTheme;
          }
        } catch (error) {
          console.error('Tema yüklenirken hata:', error);
        }
      }
    },
    
    selectTheme(themeId) {
      this.selectedTheme = themeId;
    },
    
    async applyTheme() {
      if (window.electron) {
        try {
          const theme = this.themes.find(t => t.id === this.selectedTheme);
          if (theme) {
            await window.electron.setAppTheme(this.selectedTheme);
            this.applyThemeToDOM(theme);
            this.showSuccessNotification();
          }
        } catch (error) {
          console.error('Tema uygulanırken hata:', error);
          this.showToast('Hata', 'Tema uygulanırken bir hata oluştu', 'error');
        }
      }
    },
    
    applyThemeToDOM(theme) {
      const root = document.documentElement;
      
      // Ana renkler
      root.style.setProperty('--color-primary', theme.colors.primary);
      root.style.setProperty('--color-secondary', theme.colors.secondary);
      root.style.setProperty('--color-background', theme.colors.background);
      root.style.setProperty('--color-card-bg', theme.colors.cardBg);
      root.style.setProperty('--color-text', theme.colors.text);
      root.style.setProperty('--color-text-light', theme.colors.textLight);
      root.style.setProperty('--color-border', theme.colors.border);
      
      // Tema sınıfını ekleme
      document.body.className = '';
      document.body.classList.add(`theme-${this.selectedTheme}`);
    },
    
    showSuccessNotification() {
      this.showToast('Başarılı', 'Tema başarıyla uygulandı!', 'success');
    },
    
    showToast(title, message, type = 'success') {
      // Varsa mevcut zamanlayıcıyı temizle
      if (this.toast.timeout) {
        clearTimeout(this.toast.timeout);
      }
      
      // Toast görünürlüğünü ayarla
      this.toast.show = true;
      this.toast.title = title;
      this.toast.message = message;
      this.toast.type = type;
      
      // 4 saniye sonra otomatik kapat
      this.toast.timeout = setTimeout(() => {
        this.closeToast();
      }, 4000);
    },
    
    closeToast() {
      this.toast.show = false;
    },
    
    getToastIcon() {
      const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
      };
      
      return icons[this.toast.type] || icons.info;
    }
  }
}
</script>

<style scoped>
.settings-page {
  max-width: 1200px;
  margin: 0 auto;
}

.card {
  background-color: var(--color-card-bg, #ffffff);
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  margin-bottom: 30px;
}

.card-section {
  padding: 20px;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text, #0f172a);
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-title i {
  color: var(--color-primary, #4568dc);
}

.section-description {
  color: var(--color-text-light, #64748b);
  margin-bottom: 20px;
}

.theme-settings {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.theme-options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 20px;
}

.theme-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.theme-option:hover .theme-preview {
  transform: translateY(-5px);
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
}

.theme-option.active .theme-preview {
  border-width: 3px;
  transform: translateY(-5px);
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
}

.theme-preview {
  width: 100%;
  height: 120px;
  border-radius: 8px;
  border: 2px solid transparent;
  overflow: hidden;
  transition: all 0.3s;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
}

.preview-header {
  height: 20px;
  background-color: #4568dc;
}

.preview-content {
  flex: 1;
  background-color: #f8fafc;
  padding: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview-card {
  width: 80%;
  height: 50px;
  background-color: #ffffff;
  border-radius: 6px;
  border-top: 3px solid #4568dc;
}

.theme-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text, #0f172a);
}

.settings-actions {
  padding: 20px;
  display: flex;
  justify-content: flex-end;
}

.btn {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
  border: none;
}

.btn-primary {
  background-color: var(--color-primary, #4568dc);
  color: white;
}

.btn-primary:hover {
  opacity: 0.9;
}

/* Koyu mod düzenlemeleri - Discord stili */
.theme-dark .card {
  background-color: #36393f;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

.theme-dark .card-section {
  border-color: rgba(255, 255, 255, 0.1);
}

.theme-dark .section-title {
  color: #ffffff;
}

.theme-dark .section-description {
  color: #b9bbbe;
}

.theme-dark .theme-name {
  color: #ffffff;
}

.theme-dark .theme-option:hover .theme-preview {
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.3);
}

.theme-dark .theme-option.active .theme-preview {
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.3);
  border-color: #7289da;
}

.theme-dark .theme-preview {
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

.theme-dark .btn-primary {
  background-color: #7289da;
}

.theme-dark .btn-primary:hover {
  background-color: #677bc4;
}

@media (max-width: 768px) {
  .theme-options {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }
}

@media (max-width: 576px) {
  .theme-options {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Toast bildirim stilleri */
.toast-notification {
  position: fixed;
  bottom: 20px;
  right: 20px;
  min-width: 300px;
  max-width: 400px;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  padding: 15px;
  z-index: 1000;
  animation: slideIn 0.3s ease-out forwards;
  border-left: 4px solid;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast-notification.success {
  border-left-color: #4CAF50;
}

.toast-notification.error {
  border-left-color: #F44336;
}

.toast-notification.warning {
  border-left-color: #FFC107;
}

.toast-notification.info {
  border-left-color: #2196F3;
}

.toast-icon {
  margin-right: 15px;
  font-size: 24px;
}

.toast-notification.success .toast-icon {
  color: #4CAF50;
}

.toast-notification.error .toast-icon {
  color: #F44336;
}

.toast-notification.warning .toast-icon {
  color: #FFC107;
}

.toast-notification.info .toast-icon {
  color: #2196F3;
}

.toast-content {
  flex: 1;
}

.toast-title {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 5px;
  color: var(--color-text, #0f172a);
}

.toast-message {
  font-size: 14px;
  color: var(--color-text-light, #64748b);
}

.toast-close {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 16px;
  padding: 5px;
  margin-left: 10px;
}

.toast-close:hover {
  color: #0f172a;
}

/* Dark mode toast styles */
.theme-dark .toast-notification {
  background-color: #36393f;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
}

.theme-dark .toast-title {
  color: #ffffff;
}

.theme-dark .toast-message {
  color: #b9bbbe;
}

.theme-dark .toast-close {
  color: #b9bbbe;
}

.theme-dark .toast-close:hover {
  color: #ffffff;
}
</style> 