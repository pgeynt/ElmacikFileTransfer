<template>
  <div class="dashboard">
    <h1 class="page-title">Dashboard</h1>
    
    <!-- İstatistik Kartları -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">
          <i class="fas fa-file-upload"></i>
        </div>
        <div class="stat-content">
          <h2>{{ files.length }}</h2>
          <p>Toplam Dosya</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">
          <i class="fas fa-hdd"></i>
        </div>
        <div class="stat-content">
          <h2>{{ totalStorageFormatted }}</h2>
          <p>Depolama</p>
        </div>
      </div>
    </div>
    
    <!-- Dosya Yükleme Alanı -->
    <div class="card file-upload-section">
      <div class="card-header">
        <h2><i class="fas fa-cloud-upload-alt"></i> Dosya Yükleme</h2>
      </div>
      <div 
        class="file-upload-area"
        @dragover.prevent="onDragOver"
        @dragleave.prevent="onDragLeave"
        @drop.prevent="onFileDrop"
        :class="{ 'drag-active': isDragging }"
      >
        <div class="upload-content">
          <i class="fas fa-cloud-upload-alt fa-4x"></i>
          <p>Dosyaları sürükleyip bırakın veya seçin</p>
          <button @click="openFileDialog" class="btn btn-primary">Dosya Seç</button>
        </div>
      </div>
    </div>
    
    <!-- Yükleme Kuyruğu Gösterimi -->
    <div v-if="uploadQueue.length > 0" class="card upload-queue-section">
      <div class="card-header">
        <h2><i class="fas fa-tasks"></i> Yükleme Kuyruğu</h2>
        <div class="header-actions">
          <span class="queue-stats">{{ getQueueStatsText() }}</span>
        </div>
      </div>
      
      <div class="upload-queue-list">
        <div v-for="(item, index) in uploadQueue" :key="index" class="queue-item">
          <div class="queue-item-icon">
            <i :class="getFileIcon(getFileExtension(item.filePath))"></i>
          </div>
          <div class="queue-item-content">
            <div class="queue-item-name">{{ getFileName(item.filePath) }}</div>
            <div class="queue-item-status">
              <span :class="getStatusClass(item.status)">
                <i :class="getStatusIcon(item.status)"></i>
                {{ getStatusText(item.status) }}
              </span>
            </div>
          </div>
          <div v-if="item.status === 'uploading'" class="queue-item-progress">
            <div class="progress-spinner"></div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Dosya Listesi -->
    <div class="card">
      <div class="card-header">
        <h2><i class="fas fa-file-alt"></i> Son Dosyalarım</h2>
        <div class="header-actions">
          <div class="view-options">
            <button class="view-btn" :class="{ active: viewMode === 'grid' }" @click="viewMode = 'grid'">
              <i class="fas fa-th-large"></i>
            </button>
            <button class="view-btn" :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'">
              <i class="fas fa-list"></i>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Grid Görünümü -->
      <div v-if="viewMode === 'grid'" class="file-grid">
        <div v-for="(file, index) in files" :key="index" class="file-card">
          <div class="file-card-icon">
            <i :class="getFileIcon(file.type)" class="fa-3x"></i>
          </div>
          <div class="file-card-info">
            <h3 class="file-name">{{ file.name }}</h3>
            <p class="file-details">
              <span>{{ formatFileSize(file.size) }}</span> • 
              <span>{{ formatDate(file.lastModified) }}</span>
            </p>
          </div>
          <div class="file-card-actions">
            <button @click="toggleFavorite(index)" class="action-btn" :class="{'favorited': file.favorite}" title="Beğen">
              <i class="fas fa-heart"></i>
            </button>
            <button class="action-btn" @click="addFileToUploadQueue(file)" :disabled="isFileInQueue(file.path)" title="Yükle">
              <i class="fas fa-upload"></i>
            </button>
            <button class="action-btn" @click="deleteFile(index)" title="Sil">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Liste Görünümü -->
      <div v-if="viewMode === 'list'" class="file-list">
        <table>
          <thead>
            <tr>
              <th>Dosya Adı</th>
              <th>Boyut</th>
              <th>Tarih</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(file, index) in files" :key="index">
              <td class="file-name">
                <i :class="getFileIcon(file.type)"></i>
                <span>{{ file.name }}</span>
              </td>
              <td>{{ formatFileSize(file.size) }}</td>
              <td>{{ formatDate(file.lastModified) }}</td>
              <td class="file-actions">
                <button @click="toggleFavorite(index)" class="action-btn" :class="{'favorited': file.favorite}" title="Beğen">
                  <i class="fas fa-heart"></i>
                </button>
                <button class="action-btn" @click="addFileToUploadQueue(file)" :disabled="isFileInQueue(file.path)" title="Yükle">
                  <i class="fas fa-upload"></i>
                </button>
                <button class="action-btn" @click="deleteFile(index)" title="Sil">
                  <i class="fas fa-trash-alt"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div v-if="files.length === 0" class="no-files">
        <i class="fas fa-folder-open"></i>
        <p>Henüz dosya yüklenmedi</p>
      </div>
    </div>
    
    <!-- Popup Bildirimi -->
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
  name: 'Home',
  data() {
    return {
      isDragging: false,
      viewMode: 'grid', // 'grid' veya 'list'
      files: [],
      message: '',
      // Yükleme kuyruğu
      uploadQueue: [],
      isUploading: false,
      // Popup bildirimi için veri
      popup: {
        show: false,
        title: '',
        message: '',
        type: 'success', // 'success', 'error', 'info'
        timeout: null
      }
    }
  },
  computed: {
    totalStorage() {
      return this.files.reduce((total, file) => total + file.size, 0);
    },
    totalStorageFormatted() {
      return this.formatFileSize(this.totalStorage);
    }
  },
  mounted() {
    // Electron IPC kanallarını dinle (eğer electron nesnesi varsa)
    if (window.electron) {
      window.electron.onMessage((message) => {
        this.message = message;
      });
      
      // Yükleme kuyruğu güncellemelerini dinle
      window.electron.onUploadQueueUpdated((queueData) => {
        this.uploadQueue = queueData.queue;
        this.isUploading = queueData.isUploading;
      });
      
      // Yükleme tamamlama olayını dinle
      window.electron.onUploadCompleted((result) => {
        // Yükleme sonucunu bildirimi göster
        const title = result.success ? 'Başarılı' : 'Hata';
        this.showPopup(title, result.message, result.success ? 'success' : 'error');
      });
      
      // Mevcut kuyruk durumunu al
      this.fetchQueueStatus();
    }
  },
  methods: {
    // Dosya yükleme ile ilgili metodlar
    onDragOver(e) {
      this.isDragging = true;
    },
    onDragLeave(e) {
      this.isDragging = false;
    },
    async onFileDrop(e) {
      this.isDragging = false;
      const droppedFiles = e.dataTransfer.files;
      
      if (droppedFiles.length > 0) {
        // Dosyaları işle
        for (let i = 0; i < droppedFiles.length; i++) {
          const file = droppedFiles[i];
          this.addFile({
            name: file.name,
            path: file.path,
            size: file.size,
            type: this.getFileExtension(file.name),
            lastModified: new Date(file.lastModified),
            favorite: false
          });
        }
      }
    },
    async openFileDialog() {
      if (window.electron) {
        const result = await window.electron.openFileDialog();
        if (result) {
          result.forEach(file => {
            file.favorite = false;
            this.addFile(file);
          });
        }
      } else {
        alert('Dosya seçimi yalnızca Electron ortamında kullanılabilir.');
      }
    },
    addFile(file) {
      // Dosya zaten varsa ekleme
      const exists = this.files.some(f => f.path === file.path);
      if (!exists) {
        this.files.push(file);
      }
    },
    deleteFile(index) {
      if (confirm(`${this.files[index].name} dosyasını silmek istediğinize emin misiniz?`)) {
        this.files.splice(index, 1);
      }
    },
    getFileExtension(filename) {
      return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2).toLowerCase();
    },
    // Dosya gösterimi ile ilgili metodlar
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
    formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes';
      
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    formatDate(date) {
      if (!date) return '';
      
      return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    },
    toggleFavorite(index) {
      this.files[index].favorite = !this.files[index].favorite;
    },
    // S3'e dosya yükleme
    async uploadToS3(file) {
      if (this.isUploading) return; // Zaten yükleme yapılıyorsa çıkış
      
      this.isUploading = true;
      
      try {
        // Dosyayı yüklemek için electron arayüzünü kullan
        if (window.electron) {
          // Yükleme başladı bildirimini göster
          this.showPopup('Yükleme Başladı', 'Dosyanız Amazon S3\'e yükleniyor...', 'info');
          
          const result = await window.electron.uploadToS3(file.path);
          
          if (result.success) {
            // Başarılı yükleme bildirimini göster
            this.showPopup('Başarılı', `${file.name} dosyası başarıyla yüklendi.`, 'success');
            console.log('S3 Yükleme URL:', result.data.Location);
          } else {
            // Hata bildirimini göster
            this.showPopup('Hata', `Yükleme başarısız: ${result.message}`, 'error');
          }
        } else {
          this.showPopup('Hata', 'S3 yükleme işlevi yalnızca Electron ortamında kullanılabilir.', 'error');
        }
      } catch (error) {
        console.error('Yükleme hatası:', error);
        this.showPopup('Hata', `Beklenmeyen bir hata oluştu: ${error.message}`, 'error');
      } finally {
        this.isUploading = false;
      }
    },
    
    // Kuyruk durum bilgisini al
    async fetchQueueStatus() {
      if (window.electron) {
        try {
          const queueData = await window.electron.getUploadQueue();
          this.uploadQueue = queueData.queue;
          this.isUploading = queueData.isUploading;
        } catch (error) {
          console.error('Kuyruk bilgisi alınamadı:', error);
        }
      }
    },
    
    // Dosyayı yükleme kuyruğuna ekle
    addFileToUploadQueue(file) {
      if (window.electron && file.path) {
        // Dosyayı kuyruğa ekle
        window.electron.addToUploadQueue(file.path);
        this.showPopup('Bilgi', 'Dosya yükleme kuyruğuna eklendi', 'info');
      } else {
        this.showPopup('Hata', 'Dosya yolu bilgisi bulunamadı', 'error');
      }
    },
    
    // Dosya halihazırda kuyrukta mı kontrol et
    isFileInQueue(filePath) {
      return this.uploadQueue.some(item => item.filePath === filePath);
    },
    
    // Kuyruk istatistik bilgisi
    getQueueStatsText() {
      const total = this.uploadQueue.length;
      const pending = this.uploadQueue.filter(item => item.status === 'pending').length;
      const uploading = this.uploadQueue.filter(item => item.status === 'uploading').length;
      const completed = this.uploadQueue.filter(item => item.status === 'completed').length;
      const error = this.uploadQueue.filter(item => item.status === 'error').length;
      
      return `${total} dosya (${completed} tamamlanan, ${uploading} yükleniyor, ${pending} bekleyen, ${error} hatalı)`;
    },
    
    // Dosya adını al
    getFileName(filePath) {
      if (!filePath) return '';
      return filePath.split(/[\/\\]/).pop();
    },
    
    // Durum sınıfını al
    getStatusClass(status) {
      const classes = {
        'pending': 'status-pending',
        'uploading': 'status-uploading',
        'completed': 'status-completed',
        'error': 'status-error'
      };
      return classes[status] || '';
    },
    
    // Durum ikonunu al
    getStatusIcon(status) {
      const icons = {
        'pending': 'fas fa-clock',
        'uploading': 'fas fa-spinner fa-spin',
        'completed': 'fas fa-check-circle',
        'error': 'fas fa-exclamation-circle'
      };
      return icons[status] || 'fas fa-clock';
    },
    
    // Durum metnini al
    getStatusText(status) {
      const texts = {
        'pending': 'Bekliyor',
        'uploading': 'Yükleniyor',
        'completed': 'Tamamlandı',
        'error': 'Hata'
      };
      return texts[status] || 'Bilinmiyor';
    },
    
    // Popup bildirimi gösterme
    showPopup(title, message, type = 'success') {
      // Önceki zamanlayıcıyı temizle
      if (this.popup.timeout) {
        clearTimeout(this.popup.timeout);
      }
      
      // Popup'ı ayarla ve göster
      this.popup.title = title;
      this.popup.message = message;
      this.popup.type = type;
      this.popup.show = true;
      
      // 5 saniye sonra otomatik kapanma
      this.popup.timeout = setTimeout(() => {
        this.closePopup();
      }, 5000);
    },
    
    // Popup'ı kapat
    closePopup() {
      this.popup.show = false;
    },
    
    // Popup ikonu
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
.dashboard {
  max-width: 1200px;
  margin: 0 auto;
}

/* İstatistik Kartları */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 25px;
}

.stat-card {
  background-color: white;
  border-radius: 10px;
  padding: 20px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.stat-icon {
  width: 48px;
  height: 48px;
  background-color: #e9f1ff;
  border-radius: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 15px;
}

.stat-icon i {
  color: #4568dc;
  font-size: 20px;
}

.stat-content h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.stat-content p {
  margin: 0;
  color: #64748b;
  font-size: 14px;
}

/* Dosya Yükleme Alanı */
.file-upload-section {
  margin-bottom: 25px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.card-header h2 {
  font-size: 18px;
  display: flex;
  align-items: center;
  margin: 0;
}

.card-header h2 i {
  margin-right: 10px;
  color: #4568dc;
}

.header-actions {
  display: flex;
  align-items: center;
}

.view-options {
  display: flex;
  margin-right: 15px;
}

.view-btn {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 4px;
  margin-left: 5px;
}

.view-btn.active {
  background-color: #e9f1ff;
  color: #4568dc;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 14px;
}

.file-upload-area {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 30px;
  text-align: center;
  transition: all 0.3s ease;
}

.drag-active {
  border-color: #4568dc;
  background-color: rgba(69, 104, 220, 0.05);
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #64748b;
}

.upload-content i {
  margin-bottom: 15px;
  color: #4568dc;
}

.upload-content p {
  margin-bottom: 15px;
}

/* Yükleme Kuyruğu Bölümü */
.upload-queue-section {
  margin-bottom: 25px;
}

.queue-stats {
  font-size: 14px;
  color: #64748b;
}

.upload-queue-list {
  max-height: 300px;
  overflow-y: auto;
}

.queue-item {
  display: flex;
  align-items: center;
  padding: 12px 15px;
  border-bottom: 1px solid #f1f5f9;
}

.queue-item:last-child {
  border-bottom: none;
}

.queue-item-icon {
  width: 40px;
  height: 40px;
  background-color: #e9f1ff;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 15px;
  color: #4568dc;
}

.queue-item-content {
  flex: 1;
}

.queue-item-name {
  font-weight: 500;
  margin-bottom: 5px;
}

.queue-item-status {
  font-size: 13px;
}

.status-pending {
  color: #64748b;
}

.status-uploading {
  color: #3b82f6;
}

.status-completed {
  color: #22c55e;
}

.status-error {
  color: #ef4444;
}

.queue-item-progress {
  margin-left: 10px;
}

.progress-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Buton Devre Dışı Stili */
.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Dosya Grid Görünümü */
.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
}

.file-card {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.file-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.file-card-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 15px;
  color: #64748b;
}

.file-card-info {
  flex-grow: 1;
}

.file-name {
  margin: 0 0 10px 0;
  font-size: 16px;
  word-break: break-word;
  font-weight: 500;
}

.file-details {
  color: #64748b;
  font-size: 13px;
  margin: 0;
}

.file-card-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #f1f5f9;
}

.action-btn {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 5px;
  transition: color 0.3s;
}

.action-btn:hover {
  color: #4568dc;
}

.action-btn.favorited {
  color: #e74c3c;
}

/* Dosya Liste Görünümü */
.file-list {
  width: 100%;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  text-align: left;
  padding: 12px 15px;
  background-color: #f8fafc;
  color: #64748b;
  font-weight: 600;
  font-size: 14px;
  border-bottom: 1px solid #e2e8f0;
}

td {
  padding: 12px 15px;
  border-bottom: 1px solid #e2e8f0;
}

tr:hover {
  background-color: #f8fafc;
}

td.file-name {
  display: flex;
  align-items: center;
}

td.file-name i {
  margin-right: 10px;
  font-size: 16px;
  color: #64748b;
}

td.file-actions {
  display: flex;
  gap: 10px;
}

.no-files {
  text-align: center;
  padding: 30px;
  color: #64748b;
}

.no-files i {
  font-size: 48px;
  margin-bottom: 15px;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
  
  .file-grid {
    grid-template-columns: 1fr;
  }
}

/* Popup Bildirimi */
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
</style> 