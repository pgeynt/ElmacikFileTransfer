<template>
  <div class="history-page">
    <h1 class="page-title">Yükleme Geçmişi</h1>
    
    <div v-if="isLoading" class="loading">
      <i class="fas fa-spinner fa-spin fa-2x"></i>
      <p>Geçmiş yükleniyor...</p>
    </div>
    
    <div v-else-if="uploadHistory.length === 0" class="card">
      <div class="empty-state">
        <i class="fas fa-history fa-3x"></i>
        <p>Henüz yükleme geçmişi bulunamadı</p>
      </div>
    </div>
    
    <div v-else class="history-grid">
      <div v-for="item in uploadHistory" :key="item.id" class="history-card">
        <div class="status-indicator" :class="{ 'success': item.success, 'error': !item.success }">
          <i :class="item.success ? 'fas fa-check' : 'fas fa-times'"></i>
        </div>
        
        <button class="delete-btn" @click="deleteHistoryItem(item.id)" title="Geçmişten sil">
          <i class="fas fa-trash-alt"></i>
        </button>
        
        <div class="card-header">
          <div class="file-icon">
            <i :class="getFileIcon(item.type)" class="fa-2x"></i>
          </div>
          <div class="file-info">
            <h3 class="file-name">{{ item.name }}</h3>
            <p class="file-details">
              <span>{{ formatFileSize(item.size) }}</span>
            </p>
          </div>
        </div>
        
        <div class="card-body">
          <div class="upload-info">
            <div class="info-item">
              <i class="fas fa-calendar-alt"></i>
              <span>{{ formatDate(item.uploadDate) }}</span>
            </div>
            <div class="info-item" :class="{ 'status-success': item.success, 'status-error': !item.success }">
              <i :class="item.success ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'"></i>
              <span>{{ item.success ? 'Başarıyla Yüklendi' : 'Yükleme Başarısız' }}</span>
            </div>
            <div v-if="!item.success && item.errorMessage" class="info-item error-message">
              <i class="fas fa-info-circle"></i>
              <span>{{ item.errorMessage }}</span>
            </div>
          </div>
        </div>
        
        <div class="card-footer">
          <a v-if="item.success && item.s3Location" :href="item.s3Location" target="_blank" class="btn btn-link">
            <i class="fas fa-external-link-alt"></i>
            Dosyayı Görüntüle
          </a>
          <p v-else class="not-available">
            <i class="fas fa-ban"></i>
            Dosya erişilebilir değil
          </p>
        </div>
      </div>
    </div>
    
    <div class="popup-notification" v-if="popup.show">
      <div class="popup-content" :class="popup.type">
        <i :class="getPopupIcon()"></i>
        <div class="popup-message">
          <h3>{{ popup.title }}</h3>
          <p>{{ popup.message }}</p>
        </div>
        <button class="popup-close" @click="closePopup">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HistoryPage',
  data() {
    return {
      uploadHistory: [],
      isLoading: true,
      popup: {
        show: false,
        title: '',
        message: '',
        type: 'success',
        timeout: null
      }
    }
  },
  async mounted() {
    await this.loadUploadHistory();
  },
  methods: {
    async loadUploadHistory() {
      this.isLoading = true;
      
      try {
        if (window.electron) {
          this.uploadHistory = await window.electron.getUploadHistory();
        } else {
          console.error('Electron API bulunamadı');
        }
      } catch (error) {
        console.error('Yükleme geçmişi alınırken hata:', error);
      } finally {
        this.isLoading = false;
      }
    },
    async deleteHistoryItem(id) {
      if (!window.electron) {
        return;
      }
      
      if (!confirm('Bu geçmiş kaydını silmek istediğinize emin misiniz?')) {
        return;
      }
      
      try {
        const result = await window.electron.deleteHistoryItem(id);
        
        if (result.success) {
          this.uploadHistory = this.uploadHistory.filter(item => item.id !== id);
          this.showPopup('Başarılı', 'Geçmiş kaydı başarıyla silindi', 'success');
        } else {
          this.showPopup('Hata', result.message, 'error');
        }
      } catch (error) {
        console.error('Geçmiş kaydı silinirken hata:', error);
        this.showPopup('Hata', 'Geçmiş kaydı silinirken bir hata oluştu', 'error');
      }
    },
    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes';
      
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    getFileIcon(fileType) {
      const iconMap = {
        '.pdf': 'far fa-file-pdf',
        '.doc': 'far fa-file-word',
        '.docx': 'far fa-file-word',
        '.xls': 'far fa-file-excel',
        '.xlsx': 'far fa-file-excel',
        '.ppt': 'far fa-file-powerpoint',
        '.pptx': 'far fa-file-powerpoint',
        '.jpg': 'far fa-file-image',
        '.jpeg': 'far fa-file-image',
        '.png': 'far fa-file-image',
        '.gif': 'far fa-file-image',
        '.txt': 'far fa-file-alt',
        '.zip': 'far fa-file-archive',
        '.rar': 'far fa-file-archive'
      };
      
      return iconMap[fileType] || 'far fa-file';
    },
    showPopup(title, message, type = 'success') {
      if (this.popup.timeout) {
        clearTimeout(this.popup.timeout);
      }
      
      this.popup.title = title;
      this.popup.message = message;
      this.popup.type = type;
      this.popup.show = true;
      
      this.popup.timeout = setTimeout(() => {
        this.closePopup();
      }, 5000);
    },
    closePopup() {
      this.popup.show = false;
    },
    getPopupIcon() {
      const iconMap = {
        'success': 'fas fa-check-circle',
        'error': 'fas fa-exclamation-circle',
        'info': 'fas fa-info-circle'
      };
      
      return iconMap[this.popup.type] || iconMap.info;
    }
  }
}
</script>

<style scoped>
.history-page {
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

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: #64748b;
}

.loading i {
  margin-bottom: 15px;
}

.history-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.history-card {
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  position: relative;
}

.history-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.status-indicator {
  position: absolute;
  top: 10px;
  left: 10px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  z-index: 1;
}

.status-indicator.success {
  background-color: #4CAF50;
}

.status-indicator.error {
  background-color: #F44336;
}

.delete-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: white;
  border: 1px solid #e2e8f0;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 1;
  transition: all 0.3s ease;
}

.delete-btn:hover {
  background-color: #fee2e2;
  color: #ef4444;
  border-color: #ef4444;
}

.delete-btn:active {
  transform: scale(0.95);
}

.card-header {
  padding: 15px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #f1f5f9;
}

.file-icon {
  width: 50px;
  height: 50px;
  background-color: #e9f1ff;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 15px;
}

.file-icon i {
  color: #4568dc;
}

.file-info {
  flex: 1;
}

.file-name {
  margin: 0 0 5px 0;
  font-size: 16px;
  font-weight: 500;
  color: #0f172a;
  word-break: break-word;
}

.file-details {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

.card-body {
  padding: 15px;
}

.upload-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-item {
  display: flex;
  align-items: center;
  color: #64748b;
  font-size: 14px;
}

.info-item i {
  margin-right: 10px;
  width: 16px;
}

.info-item.status-success {
  color: #4CAF50;
}

.info-item.status-error {
  color: #F44336;
}

.error-message {
  background-color: #FEF2F2;
  padding: 8px 12px;
  border-radius: 6px;
  color: #B91C1C;
  font-size: 13px;
}

.card-footer {
  padding: 15px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  justify-content: center;
}

.btn-link {
  background: none;
  border: none;
  color: #4568dc;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 4px;
  text-decoration: none;
  display: flex;
  align-items: center;
  transition: background-color 0.3s;
}

.btn-link i {
  margin-right: 8px;
}

.btn-link:hover {
  background-color: #e9f1ff;
}

.not-available {
  font-size: 14px;
  color: #64748b;
  display: flex;
  align-items: center;
  margin: 0;
}

.not-available i {
  margin-right: 8px;
}

.popup-notification {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 1000;
  animation: slide-in 0.3s ease-out;
}

@keyframes slide-in {
  0% {
    transform: translateX(100%);
    opacity: 0;
  }
  100% {
    transform: translateX(0);
    opacity: 1;
  }
}

.popup-content {
  display: flex;
  align-items: center;
  padding: 15px 20px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  min-width: 300px;
  max-width: 450px;
}

.popup-content.success {
  border-left: 5px solid #4CAF50;
}

.popup-content.error {
  border-left: 5px solid #F44336;
}

.popup-content.info {
  border-left: 5px solid #2196F3;
}

.popup-content i {
  font-size: 24px;
  margin-right: 15px;
}

.popup-content.success i {
  color: #4CAF50;
}

.popup-content.error i {
  color: #F44336;
}

.popup-content.info i {
  color: #2196F3;
}

.popup-message {
  flex-grow: 1;
}

.popup-message h3 {
  margin: 0 0 5px 0;
  font-size: 16px;
}

.popup-message p {
  margin: 0;
  font-size: 14px;
  color: #64748b;
}

.popup-close {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-size: 16px;
  padding: 0;
}

.popup-close:hover {
  color: #000;
}

@media (max-width: 768px) {
  .history-grid {
    grid-template-columns: 1fr;
  }
}
</style> 