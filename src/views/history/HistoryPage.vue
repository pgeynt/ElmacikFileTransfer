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
      <div v-for="item in uploadHistory" :key="item.id" 
           class="history-card" 
           :class="{ 'not-exists-in-storage': item.success && item.checkedExistence && !item.existsInStorage }">
        <div class="status-indicator" 
            :class="{ 
              'success': item.success && (!item.checkedExistence || item.existsInStorage), 
              'error': !item.success,
              'warning': item.success && item.checkedExistence && !item.existsInStorage 
            }">
          <i :class="getStatusIcon(item)"></i>
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
            <div v-if="item.success && item.checkedExistence && !item.existsInStorage" class="info-item storage-status">
              <i class="fas fa-exclamation-triangle"></i>
              <span>Dosya artık depolama alanında mevcut değil</span>
            </div>
          </div>
        </div>
        
        <div class="card-footer">
          <div class="action-buttons">
            <a v-if="item.success && (!item.checkedExistence || item.existsInStorage)" :href="item.s3Location" target="_blank" class="btn btn-link">
              <i class="fas fa-external-link-alt"></i>
              Görüntüle
            </a>
            <button 
              v-if="item.success && (!item.checkedExistence || item.existsInStorage)" 
              @click="openFileSettings(item)"
              class="btn btn-settings"
              title="Dosya Ayarları"
            >
              <i class="fas fa-cog"></i>
              Ayarlar
            </button>
            <p v-if="!item.success || (item.checkedExistence && !item.existsInStorage)" class="not-available">
              <i class="fas fa-ban"></i>
              Dosya erişilebilir değil
            </p>
            <button v-if="item.success && item.checkedExistence && !item.existsInStorage" class="btn btn-refresh" @click="checkFileExistence(item)">
              <i class="fas fa-sync-alt"></i>
              Yeniden Kontrol Et
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Dosya Ayarları Popup -->
    <div v-if="fileSettings.show" class="settings-modal" @click.self="closeFileSettings">
      <div class="settings-container">
        <div class="settings-header">
          <h3 class="settings-title">
            <i class="fas fa-cog mr-2"></i>
            Dosya Ayarları
          </h3>
          <button @click="closeFileSettings" class="settings-close" title="Kapat">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="settings-content">
          <div class="file-info-wrapper">
            <div class="settings-file-icon">
              <i :class="getFileIcon(fileSettings.fileType)" class="fa-2x"></i>
            </div>
            <div class="settings-file-info">
              <h4 v-if="!fileSettings.isRenaming">{{ fileSettings.originalName }}</h4>
              <div v-else class="rename-input-group">
                <input 
                  type="text" 
                  v-model="fileSettings.newName" 
                  class="rename-input"
                  ref="renameInput"
                />
              </div>
            </div>
          </div>
          
          <div class="settings-actions">
            <button 
              v-if="!fileSettings.isRenaming" 
              @click="startRenaming" 
              class="btn btn-secondary"
            >
              <i class="fas fa-edit"></i>
              Dosyayı Yeniden Adlandır
            </button>
            <div v-else class="rename-actions">
              <button @click="saveNewFileName" class="btn btn-primary">
                <i class="fas fa-save"></i>
                Kaydet
              </button>
              <button @click="cancelRenaming" class="btn btn-secondary">
                <i class="fas fa-times"></i>
                İptal
              </button>
            </div>
            
            <button @click="confirmDeleteFile" class="btn btn-danger">
              <i class="fas fa-trash-alt"></i>
              Dosyayı Sil
            </button>
          </div>
          
          <div v-if="fileSettings.loading" class="settings-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <span>İşlem yapılıyor...</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Onay Popup -->
    <div v-if="confirmDialog.show" class="confirm-modal" @click.self="cancelConfirmDialog">
      <div class="confirm-container">
        <div class="confirm-header">
          <h3 class="confirm-title">
            <i :class="confirmDialog.icon" class="mr-2"></i>
            {{ confirmDialog.title }}
          </h3>
        </div>
        
        <div class="confirm-content">
          <p>{{ confirmDialog.message }}</p>
        </div>
        
        <div class="confirm-actions">
          <button @click="cancelConfirmDialog" class="btn btn-secondary">
            <i class="fas fa-times"></i>
            İptal
          </button>
          <button @click="proceedConfirmDialog" class="btn" :class="confirmDialog.btnClass">
            <i :class="confirmDialog.btnIcon"></i>
            {{ confirmDialog.btnText }}
          </button>
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
      },
      fileSettings: {
        show: false,
        fileKey: null,
        originalName: '',
        newName: '',
        fileType: '',
        fileId: null,
        loading: false,
        isRenaming: false
      },
      confirmDialog: {
        show: false,
        title: '',
        message: '',
        icon: '',
        btnText: '',
        btnIcon: '',
        btnClass: '',
        action: null,
        data: null
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
          
          // Başarılı olanların S3'teki varlığını kontrol et
          await this.checkAllFilesExistence();
        } else {
          console.error('Electron API bulunamadı');
        }
      } catch (error) {
        console.error('Yükleme geçmişi alınırken hata:', error);
      } finally {
        this.isLoading = false;
      }
    },
    
    // S3'teki dosya varlığını kontrol et
    async checkAllFilesExistence() {
      if (!window.electron) return;
      
      // Başarılı yüklenen ve S3 anahtarı olan tüm dosyaları kontrol et
      const filesToCheck = this.uploadHistory.filter(item => item.success && item.s3Key);
      
      for (const item of filesToCheck) {
        await this.checkFileExistence(item);
      }
    },
    
    // Tek bir dosyanın varlığını kontrol et
    async checkFileExistence(item) {
      if (!window.electron || !item.s3Key) return;
      
      try {
        const result = await window.electron.checkFileExistsInS3(item.s3Key);
        
        // Vue 3'te doğrudan atama reaktif çalışır
        item.checkedExistence = true;
        item.existsInStorage = result.exists;
        
        return result.exists;
      } catch (error) {
        console.error('Dosya varlığı kontrolünde hata:', error);
        return false;
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
    // Dosya ayarları popup'ını aç
    openFileSettings(item) {
      this.fileSettings.show = true;
      this.fileSettings.fileKey = item.s3Key;
      this.fileSettings.originalName = item.name;
      this.fileSettings.newName = item.name;
      this.fileSettings.fileType = item.type;
      this.fileSettings.fileId = item.id;
      this.fileSettings.loading = false;
      this.fileSettings.isRenaming = false;
    },
    // Dosya ayarları popup'ını kapat
    closeFileSettings() {
      this.fileSettings.show = false;
    },
    // Yeniden adlandırma işlemini başlat
    startRenaming() {
      this.fileSettings.isRenaming = true;
      // Input'a odaklan
      this.$nextTick(() => {
        if (this.$refs.renameInput) {
          this.$refs.renameInput.focus();
          
          // Dosya adının uzantısını seçme
          const lastDotIndex = this.fileSettings.newName.lastIndexOf('.');
          if (lastDotIndex > 0) {
            this.$refs.renameInput.setSelectionRange(0, lastDotIndex);
          }
        }
      });
    },
    // Yeniden adlandırma işleminden vazgeç
    cancelRenaming() {
      this.fileSettings.isRenaming = false;
      this.fileSettings.newName = this.fileSettings.originalName;
    },
    // Yeni dosya adını kaydet
    async saveNewFileName() {
      if (!this.fileSettings.newName.trim()) {
        this.showPopup('Uyarı', 'Dosya adı boş olamaz', 'info');
        return;
      }
      
      // Aynı isimse hiçbir şey yapma
      if (this.fileSettings.newName === this.fileSettings.originalName) {
        this.fileSettings.isRenaming = false;
        return;
      }
      
      this.fileSettings.loading = true;
      
      try {
        // Dosya adını değiştir
        const result = await window.electron.renameS3File({
          key: this.fileSettings.fileKey,
          newName: this.fileSettings.newName
        });
        
        if (result.success) {
          // Geçmiş kaydını güncelle
          const updatedItem = this.uploadHistory.find(item => item.id === this.fileSettings.fileId);
          if (updatedItem) {
            updatedItem.name = this.fileSettings.newName;
            updatedItem.s3Key = result.newKey;
            updatedItem.s3Location = result.newLocation;
          }
          
          this.fileSettings.originalName = this.fileSettings.newName;
          this.fileSettings.fileKey = result.newKey;
          this.fileSettings.isRenaming = false;
          this.showPopup('Başarılı', 'Dosya adı başarıyla değiştirildi', 'success');
        } else {
          this.showPopup('Hata', result.message, 'error');
          this.fileSettings.newName = this.fileSettings.originalName;
        }
      } catch (error) {
        console.error('Dosya adı değiştirme hatası:', error);
        this.showPopup('Hata', 'Dosya adı değiştirilirken bir hata oluştu', 'error');
        this.fileSettings.newName = this.fileSettings.originalName;
      } finally {
        this.fileSettings.loading = false;
        this.fileSettings.isRenaming = false;
      }
    },
    // Dosya silme onayı
    confirmDeleteFile() {
      this.confirmDialog = {
        show: true,
        title: 'Dosyayı Sil',
        message: `"${this.fileSettings.originalName}" dosyasını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
        icon: 'fas fa-exclamation-triangle',
        btnText: 'Dosyayı Sil',
        btnIcon: 'fas fa-trash-alt',
        btnClass: 'btn-danger',
        action: this.deleteS3File,
        data: null
      };
    },
    // Onay diyaloğunu iptal et
    cancelConfirmDialog() {
      this.confirmDialog.show = false;
    },
    // Onaylanan işlemi yürüt
    proceedConfirmDialog() {
      if (this.confirmDialog.action) {
        this.confirmDialog.action(this.confirmDialog.data);
      }
      this.confirmDialog.show = false;
    },
    // S3'ten dosyayı sil
    async deleteS3File() {
      this.fileSettings.loading = true;
      
      try {
        const result = await window.electron.deleteS3File({
          key: this.fileSettings.fileKey
        });
        
        if (result.success) {
          // Geçmiş kaydını güncelle (silme işareti koy veya listeden çıkar)
          this.uploadHistory = this.uploadHistory.filter(item => item.id !== this.fileSettings.fileId);
          
          this.closeFileSettings();
          this.showPopup('Başarılı', 'Dosya başarıyla silindi', 'success');
        } else {
          this.showPopup('Hata', result.message, 'error');
        }
      } catch (error) {
        console.error('Dosya silme hatası:', error);
        this.showPopup('Hata', 'Dosya silinirken bir hata oluştu', 'error');
      } finally {
        this.fileSettings.loading = false;
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
    },
    // Durum ikonunu belirle
    getStatusIcon(item) {
      if (!item.success) {
        return 'fas fa-times';
      } else if (item.checkedExistence && !item.existsInStorage) {
        return 'fas fa-exclamation';
      } else {
        return 'fas fa-check';
      }
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
  transition: transform 0.3s ease, box-shadow 0.3s ease, opacity 0.3s ease;
  position: relative;
}

.history-card.not-exists-in-storage {
  opacity: 0.7;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  border: 1px dashed #ccc;
}

.history-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.history-card.not-exists-in-storage:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.08);
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

.status-indicator.warning {
  background-color: #FFC107;
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

.action-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

.btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 4px;
  text-decoration: none;
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
}

.btn i {
  margin-right: 8px;
}

.btn-link {
  color: #4568dc;
}

.btn-link:hover {
  background-color: #e9f1ff;
}

.btn-settings {
  color: #0ea5e9;
}

.btn-settings:hover {
  background-color: #e0f2fe;
}

.btn-primary {
  background-color: #4568dc;
  color: white;
}

.btn-primary:hover {
  background-color: #3b57b5;
}

.btn-secondary {
  color: #64748b;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
}

.btn-secondary:hover {
  background-color: #f1f5f9;
}

.btn-danger {
  color: #ef4444;
  background-color: #fee2e2;
}

.btn-danger:hover {
  background-color: #fecaca;
}

.btn:active {
  transform: scale(0.98);
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

/* Dosya Ayarları Modal */
.settings-modal, .confirm-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 20px;
}

.settings-container, .confirm-container {
  background-color: white;
  border-radius: 10px;
  width: 90%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.settings-header, .confirm-header {
  padding: 15px 20px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.settings-title, .confirm-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  display: flex;
  align-items: center;
}

.mr-2 {
  margin-right: 8px;
}

.settings-close {
  background: none;
  border: none;
  font-size: 18px;
  color: #64748b;
  cursor: pointer;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.settings-close:hover {
  background-color: #f1f5f9;
  color: #ef4444;
}

.settings-content, .confirm-content {
  padding: 20px;
}

.file-info-wrapper {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}

.settings-file-icon {
  width: 50px;
  height: 50px;
  background-color: #e9f1ff;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #4568dc;
}

.settings-file-info {
  flex: 1;
}

.settings-file-info h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #0f172a;
  word-break: break-word;
}

.settings-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rename-input-group {
  width: 100%;
}

.rename-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
  transition: all 0.3s;
}

.rename-input:focus {
  border-color: #4568dc;
  box-shadow: 0 0 0 2px rgba(69, 104, 220, 0.1);
}

.rename-actions {
  display: flex;
  gap: 10px;
}

.settings-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 15px;
  color: #64748b;
}

.confirm-content p {
  margin: 0 0 20px 0;
  color: #334155;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 0 20px 20px 20px;
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
  
  .action-buttons {
    flex-direction: column;
    align-items: center;
  }
  
  .btn {
    width: 100%;
    justify-content: center;
  }
  
  .rename-actions {
    flex-direction: column;
  }
}

.storage-status {
  background-color: #fff9e3;
  padding: 8px 12px;
  border-radius: 6px;
  color: #b45309;
  font-size: 13px;
  margin-top: 5px;
}

.btn-refresh {
  color: #65a30d;
  background-color: #f0fdf4;
  border: 1px solid #dcfce7;
}

.btn-refresh:hover {
  background-color: #dcfce7;
}
</style> 