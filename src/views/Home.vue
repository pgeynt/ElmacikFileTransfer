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
          <div class="upload-buttons">
            <button @click="openFileDialog" class="btn btn-primary">Dosya Seç</button>
            <button @click="createFolder" class="btn btn-secondary">Klasör Oluştur</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Klasör Yönetimi Bölümü -->
    <div v-if="folders.length > 0" class="card folder-section">
      <div class="card-header">
        <h2><i class="fas fa-folder"></i> Klasör Yönetimi</h2>
      </div>
      
      <div class="folders-list">
        <div v-for="(folder, folderIndex) in folders" :key="folderIndex" class="folder-item">
          <div class="folder-header" @click="toggleFolderExpand(folderIndex)">
            <div class="folder-title">
              <i class="fas" :class="folder.expanded ? 'fa-folder-open' : 'fa-folder'"></i>
              <span v-if="!folder.isEditing">{{ folder.name }}</span>
              <input 
                v-else 
                type="text" 
                v-model="folder.editName" 
                @blur="saveFolderName(folderIndex)"
                @keyup.enter="saveFolderName(folderIndex)"
                ref="folderNameInput"
                class="folder-name-input"
              />
            </div>
            <div class="folder-actions">
              <button @click.stop="editFolderName(folderIndex)" class="action-btn" title="Klasör Adını Düzenle">
                <i class="fas fa-edit"></i>
              </button>
              <button @click.stop="addFilesToFolder(folderIndex)" class="action-btn" title="Dosya Ekle">
                <i class="fas fa-plus"></i>
              </button>
              <button @click.stop="uploadFolder(folderIndex)" class="action-btn" title="Yükle">
                <i class="fas fa-upload"></i>
              </button>
              <button @click.stop="deleteFolder(folderIndex)" class="action-btn" title="Sil">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </div>
          
          <div v-if="folder.expanded" class="folder-content">
            <div v-if="folder.files.length === 0" class="empty-folder">
              <p>Bu klasör boş. Dosya eklemek için "+" butonuna tıklayın.</p>
            </div>
            <div v-else class="folder-files">
              <div v-for="(file, fileIndex) in folder.files" :key="fileIndex" class="folder-file-item">
                <div class="file-info">
                  <i :class="getFileIcon(file.type)"></i>
                  <span v-if="!file.isEditing">{{ file.name }}</span>
                  <input 
                    v-else 
                    type="text" 
                    v-model="file.editName" 
                    @blur="saveFileName(folderIndex, fileIndex)"
                    @keyup.enter="saveFileName(folderIndex, fileIndex)"
                    ref="fileNameInput"
                    class="file-name-input"
                  />
                </div>
                <div class="file-actions">
                  <button @click="editFileName(folderIndex, fileIndex)" class="action-btn" title="Dosya Adını Düzenle">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button @click="removeFileFromFolder(folderIndex, fileIndex)" class="action-btn" title="Kaldır">
                    <i class="fas fa-times"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Klasör İsim Modal -->
    <div v-if="folderModal.show" class="modal-backdrop">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ folderModal.title }}</h3>
          <button @click="closeFolderModal" class="modal-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="folderName">Klasör Adı:</label>
            <input 
              type="text" 
              id="folderName" 
              v-model="folderModal.folderName" 
              @keyup.enter="saveFolderModal"
              ref="folderModalInput"
              class="form-control"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeFolderModal" class="btn btn-secondary">İptal</button>
          <button @click="saveFolderModal" class="btn btn-primary">Kaydet</button>
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
      },
      folders: [],
      folderModal: {
        show: false,
        title: 'Yeni Klasör',
        folderName: '',
        editIndex: -1, // -1 yeni klasör, >= 0 ise düzenleme modu
        callback: null
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

      // Klasör verilerini yerel depolamadan yükle
      this.loadFolders();
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
    },
    createFolder() {
      this.folderModal.title = 'Yeni Klasör';
      this.folderModal.folderName = '';
      this.folderModal.editIndex = -1;
      this.folderModal.show = true;
      
      // Modal açıldığında input alanına odaklan
      this.$nextTick(() => {
        if (this.$refs.folderModalInput) {
          this.$refs.folderModalInput.focus();
        }
      });
    },
    saveFolderModal() {
      if (!this.folderModal.folderName.trim()) {
        this.showPopup('Uyarı', 'Klasör adı boş olamaz', 'error');
        return;
      }
      
      if (this.folderModal.editIndex === -1) {
        // Yeni klasör ekle
        this.folders.push({
          id: Date.now().toString(),
          name: this.folderModal.folderName,
          files: [],
          expanded: true,
          isEditing: false,
          editName: this.folderModal.folderName
        });
        
        this.showPopup('Bilgi', `${this.folderModal.folderName} klasörü oluşturuldu`, 'success');
      } else {
        // Var olan klasörün adını güncelle
        this.folders[this.folderModal.editIndex].name = this.folderModal.folderName;
        this.folders[this.folderModal.editIndex].editName = this.folderModal.folderName;
        
        this.showPopup('Bilgi', 'Klasör adı güncellendi', 'success');
      }
      
      // Klasör değişikliklerini kaydet
      this.saveFolders();
      
      // Callback varsa çağır
      if (typeof this.folderModal.callback === 'function') {
        this.folderModal.callback();
      }
      
      this.closeFolderModal();
    },
    closeFolderModal() {
      this.folderModal.show = false;
      this.folderModal.folderName = '';
      this.folderModal.editIndex = -1;
      this.folderModal.callback = null;
    },
    toggleFolderExpand(index) {
      this.folders[index].expanded = !this.folders[index].expanded;
      this.saveFolders();
    },
    editFolderName(index) {
      // Doğrudan düzenleme yerine modal kullan
      this.folderModal.title = 'Klasör Adını Düzenle';
      this.folderModal.folderName = this.folders[index].name;
      this.folderModal.editIndex = index;
      this.folderModal.show = true;
      
      // Modal açıldığında input alanına odaklan
      this.$nextTick(() => {
        if (this.$refs.folderModalInput) {
          this.$refs.folderModalInput.focus();
        }
      });
    },
    saveFolderName(index) {
      if (!this.folders[index].editName.trim()) {
        // Boş isim engelle
        this.folders[index].editName = this.folders[index].name;
      } else {
        // İsmi güncelle
        this.folders[index].name = this.folders[index].editName;
      }
      
      this.folders[index].isEditing = false;
      this.saveFolders();
    },
    async addFilesToFolder(folderIndex) {
      if (window.electron) {
        const result = await window.electron.openFileDialog();
        if (result) {
          result.forEach(file => {
            // Dosyayı klasöre ekle
            this.folders[folderIndex].files.push({
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              name: file.name,
              path: file.path,
              size: file.size,
              type: file.type || this.getFileExtension(file.name),
              lastModified: file.lastModified,
              isEditing: false,
              editName: file.name
            });
          });
          
          // Klasörü kaydet
          this.saveFolders();
          
          this.showPopup('Bilgi', `${result.length} dosya klasöre eklendi`, 'success');
        }
      } else {
        this.showPopup('Hata', 'Dosya seçimi yalnızca Electron ortamında kullanılabilir', 'error');
      }
    },
    uploadFolder(folderIndex) {
      const folder = this.folders[folderIndex];
      
      if (folder.files.length === 0) {
        this.showPopup('Uyarı', 'Klasör boş, yüklenecek dosya yok', 'error');
        return;
      }
      
      // Kullanıcıya yükleme başladığını bildir
      this.showPopup('Bilgi', `${folder.name} klasörü yükleniyor...`, 'info');
      
      // Klasörü doğrudan S3'e yükle
      if (window.electron) {
        // Dosya nesnelerini serileştirilebilir hale getir
        const serializableFiles = folder.files.map(file => {
          return {
            path: file.path,
            name: file.name,
            size: file.size,
            type: file.type,
            // Date nesnesi yerine string kullan
            lastModified: file.lastModified ? file.lastModified.toISOString() : new Date().toISOString()
          };
        });
        
        // S3'e yükle
        window.electron.uploadFolder({
          name: folder.name,
          files: serializableFiles
        }).then(result => {
          if (result.success) {
            this.showPopup('Başarılı', result.message, 'success');
          } else {
            this.showPopup('Hata', result.message, 'error');
          }
        }).catch(error => {
          this.showPopup('Hata', `Klasör yükleme hatası: ${error.message}`, 'error');
        });
      } else {
        // Her dosya için yükleme kuyruğuna ekle (electron bulunmuyorsa)
        folder.files.forEach(file => {
          if (window.electron && file.path) {
            window.electron.addToUploadQueue(file.path);
          }
        });
        
        this.showPopup('Bilgi', `${folder.name} klasöründeki ${folder.files.length} dosya yükleme kuyruğuna eklendi`, 'info');
      }
    },
    deleteFolder(index) {
      const folder = this.folders[index];
      if (confirm(`${folder.name} klasörünü silmek istediğinize emin misiniz?`)) {
        this.folders.splice(index, 1);
        this.saveFolders();
        this.showPopup('Bilgi', `${folder.name} klasörü silindi`, 'success');
      }
    },
    editFileName(folderIndex, fileIndex) {
      this.folders[folderIndex].files[fileIndex].isEditing = true;
      
      // Input alanına odaklanma
      this.$nextTick(() => {
        if (this.$refs.fileNameInput && this.$refs.fileNameInput[0]) {
          this.$refs.fileNameInput[0].focus();
        }
      });
    },
    saveFileName(folderIndex, fileIndex) {
      const file = this.folders[folderIndex].files[fileIndex];
      
      if (!file.editName.trim()) {
        // Boş isim engelle
        file.editName = file.name;
      } else {
        // İsmi güncelle
        file.name = file.editName;
      }
      
      file.isEditing = false;
      this.saveFolders();
    },
    removeFileFromFolder(folderIndex, fileIndex) {
      const fileName = this.folders[folderIndex].files[fileIndex].name;
      if (confirm(`${fileName} dosyasını klasörden çıkarmak istediğinize emin misiniz?`)) {
        this.folders[folderIndex].files.splice(fileIndex, 1);
        this.saveFolders();
      }
    },
    // Klasör verilerini kaydet ve yükle
    saveFolders() {
      try {
        localStorage.setItem('folders', JSON.stringify(this.folders));
      } catch (error) {
        console.error('Klasörler kaydedilemedi:', error);
      }
    },
    loadFolders() {
      try {
        const foldersData = localStorage.getItem('folders');
        if (foldersData) {
          this.folders = JSON.parse(foldersData);
        }
      } catch (error) {
        console.error('Klasörler yüklenemedi:', error);
        this.folders = [];
      }
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
  background-color: var(--color-card-bg);
  border-radius: 10px;
  padding: 20px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.stat-icon {
  width: 48px;
  height: 48px;
  background-color: var(--color-secondary);
  border-radius: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 15px;
}

.stat-icon i {
  color: var(--color-primary);
  font-size: 20px;
}

.stat-content h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--color-text);
}

.stat-content p {
  margin: 0;
  color: var(--color-text-light);
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
  color: var(--color-text);
}

.card-header h2 i {
  margin-right: 10px;
  color: var(--color-primary);
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
  color: var(--color-text-light);
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 4px;
  margin-left: 5px;
}

.view-btn.active {
  background-color: var(--color-secondary);
  color: var(--color-primary);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 14px;
}

.file-upload-area {
  border: 2px dashed var(--color-border);
  border-radius: 8px;
  padding: 30px;
  text-align: center;
  transition: all 0.3s ease;
}

.drag-active {
  border-color: var(--color-primary);
  background-color: rgba(var(--color-primary-rgb), 0.05);
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--color-text-light);
}

.upload-content i {
  margin-bottom: 15px;
  color: var(--color-primary);
}

.upload-content p {
  margin-bottom: 15px;
}

.upload-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
}

/* Yükleme Kuyruğu Bölümü */
.upload-queue-section {
  margin-bottom: 25px;
}

.queue-stats {
  font-size: 14px;
  color: var(--color-text-light);
}

.upload-queue-list {
  max-height: 300px;
  overflow-y: auto;
}

.queue-item {
  display: flex;
  align-items: center;
  padding: 12px 15px;
  border-bottom: 1px solid var(--color-border);
}

.queue-item:last-child {
  border-bottom: none;
}

.queue-item-icon {
  width: 40px;
  height: 40px;
  background-color: var(--color-secondary);
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 15px;
  color: var(--color-primary);
}

.queue-item-content {
  flex: 1;
}

.queue-item-name {
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: 5px;
}

.queue-item-status {
  font-size: 13px;
}

.status-pending {
  color: var(--color-text-light);
}

.status-uploading {
  color: var(--color-info);
}

.status-completed {
  color: var(--color-success);
}

.status-error {
  color: var(--color-error);
}

.queue-item-progress {
  margin-left: 10px;
}

.progress-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-info);
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
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  background-color: var(--color-card-bg);
}

.file-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.file-card-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 15px;
  color: var(--color-text-light);
}

.file-card-info {
  flex-grow: 1;
}

.file-name {
  margin: 0 0 10px 0;
  font-size: 16px;
  word-break: break-word;
  font-weight: 500;
  color: var(--color-text);
}

.file-details {
  color: var(--color-text-light);
  font-size: 13px;
  margin: 0;
}

.file-card-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid var(--color-border);
}

.action-btn {
  background: none;
  border: none;
  color: var(--color-text-light);
  cursor: pointer;
  padding: 5px;
  transition: color 0.3s;
}

.action-btn:hover {
  color: var(--color-primary);
}

.action-btn.favorited {
  color: var(--color-error);
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
  background-color: var(--color-secondary);
  color: var(--color-text-light);
  font-weight: 600;
  font-size: 14px;
  border-bottom: 1px solid var(--color-border);
}

td {
  padding: 12px 15px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
}

tr:hover {
  background-color: var(--color-secondary);
}

td.file-name {
  display: flex;
  align-items: center;
}

td.file-name i {
  margin-right: 10px;
  font-size: 16px;
  color: var(--color-text-light);
}

td.file-actions {
  display: flex;
  gap: 10px;
}

.no-files {
  text-align: center;
  padding: 30px;
  color: var(--color-text-light);
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
  background-color: var(--color-card-bg);
  border-radius: 8px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  min-width: 300px;
  max-width: 450px;
}

.popup-content.success {
  border-left: 5px solid var(--color-success);
}

.popup-content.error {
  border-left: 5px solid var(--color-error);
}

.popup-content.info {
  border-left: 5px solid var(--color-info);
}

.popup-content i {
  font-size: 24px;
  margin-right: 15px;
}

.popup-content.success i {
  color: var(--color-success);
}

.popup-content.error i {
  color: var(--color-error);
}

.popup-content.info i {
  color: var(--color-info);
}

.popup-message {
  flex-grow: 1;
}

.popup-message h3 {
  margin: 0 0 5px 0;
  font-size: 16px;
  color: var(--color-text);
}

.popup-message p {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-light);
}

.popup-close {
  background: none;
  border: none;
  color: var(--color-text-light);
  cursor: pointer;
  font-size: 16px;
  padding: 0;
}

.popup-close:hover {
  color: var(--color-text);
}

/* Klasör Yönetimi */
.folder-section {
  margin-bottom: 25px;
}

.folders-list {
  max-height: 300px;
  overflow-y: auto;
}

.folder-item {
  display: flex;
  flex-direction: column;
  padding: 12px 15px;
  border-bottom: 1px solid var(--color-border);
}

.folder-item:last-child {
  border-bottom: none;
}

.folder-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.folder-title {
  display: flex;
  align-items: center;
}

.folder-title i {
  margin-right: 10px;
  font-size: 16px;
  color: var(--color-text-light);
}

.folder-title input {
  width: 100%;
  padding: 5px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text);
  background-color: var(--color-card-bg);
}

.folder-actions {
  display: flex;
  gap: 10px;
}

.folder-content {
  padding-left: 20px;
}

.empty-folder {
  text-align: center;
  padding: 30px;
  color: var(--color-text-light);
}

.folder-files {
  display: flex;
  flex-wrap: wrap;
}

.folder-file-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid var(--color-border);
}

.file-info {
  flex: 1;
  display: flex;
  align-items: center;
}

.file-info i {
  margin-right: 10px;
  font-size: 16px;
  color: var(--color-text-light);
}

.file-info input {
  width: 100%;
  padding: 5px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text);
  background-color: var(--color-card-bg);
}

.file-actions {
  display: flex;
  gap: 10px;
}

.action-btn {
  background: none;
  border: none;
  color: var(--color-text-light);
  cursor: pointer;
  padding: 5px;
  transition: color 0.3s;
}

.action-btn:hover {
  color: var(--color-primary);
}

/* Klasör İsim Modal */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: var(--color-card-bg);
  padding: 20px;
  border-radius: 8px;
  max-width: 400px;
  width: 100%;
  color: var(--color-text);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--color-text);
}

.modal-close {
  background: none;
  border: none;
  color: var(--color-text-light);
  cursor: pointer;
  font-size: 16px;
}

.modal-body {
  margin-bottom: 15px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  color: var(--color-text);
}

.form-group input {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-card-bg);
  color: var(--color-text);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-secondary {
  background-color: var(--color-text-light);
  color: white;
}

.btn-primary {
  background-color: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background-color: var(--color-primary-dark);
}

.btn-secondary:hover {
  background-color: var(--color-text);
}

/* Discord stilinde koyu mod düzenlemeleri */
.theme-dark .card {
  background-color: #36393f;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

.theme-dark .card-header {
  border-color: rgba(255, 255, 255, 0.1);
}

.theme-dark .card-header h2 {
  color: #ffffff;
}

.theme-dark .file-upload-area {
  background-color: #2f3136;
  border: 2px dashed rgba(255, 255, 255, 0.2);
}

.theme-dark .file-upload-area.drag-active {
  background-color: rgba(114, 137, 218, 0.15);
  border-color: #7289da;
}

.theme-dark .file-upload-area p {
  color: #b9bbbe;
}

.theme-dark .btn-primary {
  background-color: #7289da;
}

.theme-dark .btn-primary:hover {
  background-color: #677bc4;
}

.theme-dark .btn-secondary {
  background-color: #4f545c;
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.1);
}

.theme-dark .btn-secondary:hover {
  background-color: #5d6269;
}

.theme-dark .folder-item {
  border-color: rgba(255, 255, 255, 0.1);
}

.theme-dark .folder-header {
  background-color: #2f3136;
}

.theme-dark .folder-header:hover {
  background-color: #40444b;
}

.theme-dark .folder-title {
  color: #ffffff;
}

.theme-dark .folder-content {
  background-color: #2a2c31;
}

.theme-dark .folder-file-item {
  background-color: #36393f;
}

.theme-dark .folder-file-item:hover {
  background-color: #40444b;
}

.theme-dark .empty-folder {
  color: #b9bbbe;
}

.theme-dark .modal-content {
  background-color: #36393f;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
}

.theme-dark .modal-header {
  border-color: rgba(255, 255, 255, 0.1);
}

.theme-dark .modal-header h3 {
  color: #ffffff;
}

.theme-dark label {
  color: #b9bbbe;
}

.theme-dark .form-control {
  background-color: #40444b;
  border-color: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.theme-dark .form-control:focus {
  border-color: #7289da;
  box-shadow: 0 0 0 2px rgba(114, 137, 218, 0.2);
}

.theme-dark .queue-item {
  background-color: #36393f;
  border-color: rgba(255, 255, 255, 0.1);
}

.theme-dark .queue-item:hover {
  background-color: #40444b;
}

.theme-dark .queue-item-name, 
.theme-dark .view-options .view-btn {
  color: #ffffff;
}

.theme-dark .file-card {
  background-color: #36393f;
}

.theme-dark .file-card:hover {
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.3);
}
</style> 