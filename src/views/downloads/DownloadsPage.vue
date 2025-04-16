<template>
  <div class="downloads-page">
    <h1 class="page-title">İndirilebilir Dosyalar</h1>
    
    <!-- Arama ve Filtre Bölümü -->
    <div class="search-filter-bar">
      <div class="search-box">
        <i class="fas fa-search"></i>
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="Dosya adı veya tarih ile ara..." 
          @input="applyFilters"
        />
        <button v-if="searchQuery" @click="clearSearch" class="clear-search">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="filter-options">
        <button @click="toggleFavoritesFilter" :class="{ active: showOnlyFavorites }" class="favorites-filter">
          <i class="fas fa-heart"></i>
          <span>Favoriler</span>
        </button>
        
        <div class="sort-dropdown">
          <button class="sort-button">
            <i class="fas fa-sort"></i>
            <span>Sıralama: {{ getSortLabel() }}</span>
          </button>
          <div class="dropdown-content">
            <button @click="setSortOption('name-asc')" :class="{ 'active': sortOption === 'name-asc' }">
              <i class="fas fa-sort-alpha-down"></i> İsim (A-Z)
            </button>
            <button @click="setSortOption('name-desc')" :class="{ 'active': sortOption === 'name-desc' }">
              <i class="fas fa-sort-alpha-up"></i> İsim (Z-A)
            </button>
            <button @click="setSortOption('date-desc')" :class="{ 'active': sortOption === 'date-desc' }">
              <i class="fas fa-calendar-alt"></i> Tarih (Yeni-Eski)
            </button>
            <button @click="setSortOption('date-asc')" :class="{ 'active': sortOption === 'date-asc' }">
              <i class="fas fa-calendar-alt"></i> Tarih (Eski-Yeni)
            </button>
            <button @click="setSortOption('size-desc')" :class="{ 'active': sortOption === 'size-desc' }">
              <i class="fas fa-weight-hanging"></i> Boyut (Büyük-Küçük)
            </button>
            <button @click="setSortOption('size-asc')" :class="{ 'active': sortOption === 'size-asc' }">
              <i class="fas fa-weight-hanging"></i> Boyut (Küçük-Büyük)
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Yükleniyor Göstergesi -->
    <div v-if="isLoading" class="loading-indicator">
      <i class="fas fa-spinner fa-spin fa-2x"></i>
      <p>Dosyalar yükleniyor...</p>
    </div>
    
    <!-- Dosya Bulunamadı -->
    <div v-else-if="filteredFiles.length === 0" class="card">
      <div class="empty-state">
        <i class="fas fa-search fa-3x"></i>
        <p v-if="searchQuery">
          "{{ searchQuery }}" aramasına uygun dosya bulunamadı
        </p>
        <p v-else-if="showOnlyFavorites">
          Henüz favori dosya eklenmemiş
        </p>
        <p v-else>
          Henüz indirilebilir dosya bulunmuyor
        </p>
      </div>
    </div>
    
    <!-- Dosya Listesi -->
    <div v-else class="file-grid">
      <div v-for="file in filteredFiles" :key="file.key" class="file-card">
        <div class="file-header">
          <div class="file-icon">
            <i :class="getFileIcon(file.type)" class="fa-2x"></i>
          </div>
          <div class="file-actions-small">
            <button 
              @click="toggleFileFavorite(file)" 
              class="action-btn-small" 
              :class="{'favorited': file.isFavorite}"
              title="Favori"
            >
              <i class="fas fa-heart"></i>
            </button>
            <button 
              @click="previewFile(file)" 
              class="action-btn-small" 
              :class="{'disabled': !isPreviewSupported(file.type)}"
              :disabled="!isPreviewSupported(file.type)"
              title="İncele"
            >
              <i class="fas fa-eye"></i>
            </button>
            <button 
              @click="shareFile(file)" 
              class="action-btn-small"
              title="Paylaş"
            >
              <i class="fas fa-share-alt"></i>
            </button>
          </div>
        </div>
        
        <div class="file-info">
          <h3 class="file-name">{{ file.name }}</h3>
          <div class="file-meta">
            <p class="file-size">{{ formatFileSize(file.size) }}</p>
            <p class="file-date">{{ formatDate(file.lastModified) }}</p>
          </div>
        </div>
        
        <div class="file-actions">
          <button @click="downloadFile(file)" class="download-btn">
            <i class="fas fa-download"></i>
            <span>İndir</span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Bildirim Popup -->
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
    
    <!-- Dosya Önizleme Modal -->
    <div v-if="preview.show" class="preview-modal" @click.self="closePreview">
      <div class="preview-container" :class="{'full-width': preview.contentType === 'excel' || preview.contentType === 'text'}">
        <div class="preview-header">
          <h3 class="preview-title">
            <i :class="getFileIcon(preview.fileType)" class="mr-2"></i>
            {{ preview.fileName }}
          </h3>
          <button @click="closePreview" class="preview-close" title="Kapat">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="preview-content" :class="preview.contentType">
          <!-- İçerik yükleniyor -->
          <div v-if="preview.loading" class="preview-loading">
            <i class="fas fa-spinner fa-spin fa-2x"></i>
            <p>İçerik yükleniyor...</p>
          </div>
          
          <!-- Excel önizleme -->
          <div v-else-if="preview.contentType === 'excel'" class="excel-preview">
            <div class="excel-tabs" v-if="preview.excelSheets.length > 1">
              <button 
                v-for="(sheet, index) in preview.excelSheets" 
                :key="index"
                @click="selectExcelSheet(index)"
                :class="{ 'active': index === preview.activeSheetIndex }"
                class="excel-tab-btn"
              >
                {{ sheet }}
              </button>
            </div>
            <div class="excel-table-container">
              <table class="excel-table" v-if="preview.excelData.length > 0">
                <tr>
                  <th v-for="(header, hIndex) in preview.excelHeaders" :key="hIndex">
                    {{ header }}
                  </th>
                </tr>
                <tr v-for="(row, rowIndex) in preview.excelData" :key="rowIndex">
                  <td v-for="(cell, cellIndex) in row" :key="cellIndex">
                    {{ cell }}
                  </td>
                </tr>
              </table>
              <div v-else class="no-data">
                <p>Bu Excel sayfasında veri bulunamadı.</p>
              </div>
            </div>
          </div>
          
          <!-- CSV önizleme -->
          <div v-else-if="preview.contentType === 'csv'" class="csv-preview">
            <table class="csv-table" v-if="preview.csvData.length > 0">
              <tr>
                <th v-for="(header, hIndex) in preview.csvHeaders" :key="hIndex">
                  {{ header }}
                </th>
              </tr>
              <tr v-for="(row, rowIndex) in preview.csvData" :key="rowIndex">
                <td v-for="(cell, cellIndex) in row" :key="cellIndex">
                  {{ cell }}
                </td>
              </tr>
            </table>
            <div v-else class="no-data">
              <p>Bu CSV dosyasında veri bulunamadı.</p>
            </div>
          </div>
          
          <!-- Metin önizleme -->
          <div v-else-if="preview.contentType === 'text'" class="text-preview">
            <pre>{{ preview.textContent }}</pre>
          </div>
          
          <!-- Resim önizleme -->
          <div v-else-if="preview.contentType === 'image'" class="image-preview">
            <img :src="preview.imageUrl" alt="Resim önizleme">
          </div>
          
          <!-- PDF önizleme -->
          <div v-else-if="preview.contentType === 'pdf'" class="pdf-preview">
            <iframe :src="preview.pdfUrl" width="100%" height="100%" frameborder="0"></iframe>
          </div>
          
          <!-- Desteklenmeyen dosya türü -->
          <div v-else class="unsupported-file">
            <i class="fas fa-exclamation-circle fa-3x"></i>
            <p>Bu dosya türü önizleme için desteklenmiyor.</p>
          </div>
        </div>
        
        <div class="preview-footer">
          <button @click="downloadPreviewedFile" class="btn btn-primary" v-if="preview.key">
            <i class="fas fa-download mr-2"></i>
            İndir
          </button>
        </div>
      </div>
    </div>
    
    <!-- Paylaşım Linki Modal -->
    <div v-if="shareModal.show" class="share-modal" @click.self="closeShareModal">
      <div class="share-container">
        <div class="share-header">
          <h3 class="share-title">
            <i class="fas fa-share-alt mr-2"></i>
            Dosya Paylaşım Linki
          </h3>
          <button @click="closeShareModal" class="share-close" title="Kapat">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="share-content">
          <div v-if="shareModal.loading" class="share-loading">
            <i class="fas fa-spinner fa-spin fa-2x"></i>
            <p>Paylaşım linki oluşturuluyor...</p>
          </div>
          
          <div v-else class="share-link-box">
            <div class="file-info-wrapper">
              <div class="share-file-icon">
                <i :class="getFileIcon(shareModal.fileType)" class="fa-2x"></i>
              </div>
              <div class="share-file-info">
                <h4>{{ shareModal.fileName }}</h4>
                <p class="share-expiry" v-if="shareModal.expiryDate">
                  <i class="fas fa-clock mr-1"></i>
                  {{ formatExpiryDate(shareModal.expiryDate) }} tarihine kadar geçerli
                </p>
              </div>
            </div>
            
            <div class="share-input-group">
              <input 
                type="text" 
                readonly
                ref="shareInput"
                :value="shareModal.url"
                class="share-input"
                @click="selectShareInput"
              />
              <button @click="copyShareLink" class="share-copy-btn">
                <i class="fas fa-copy"></i>
                <span>Kopyala</span>
              </button>
            </div>
            
            <div class="share-options">
              <div class="share-expiry-select">
                <label>Link Geçerlilik Süresi:</label>
                <select v-model="shareModal.duration" @change="regenerateShareLink">
                  <option value="1">1 Saat</option>
                  <option value="6">6 Saat</option>
                  <option value="24">24 Saat</option>
                  <option value="48">2 Gün</option>
                  <option value="168">1 Hafta</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import * as XLSX from 'xlsx';

export default {
  name: 'DownloadsPage',
  data() {
    return {
      s3Files: [],
      isLoading: true,
      searchQuery: '',
      showOnlyFavorites: false,
      sortOption: 'date-desc', // varsayılan sıralama
      // Popup bildirimi için veri
      popup: {
        show: false,
        title: '',
        message: '',
        type: 'success', // 'success', 'error', 'info'
        timeout: null
      },
      // Dosya önizleme için veri
      preview: {
        show: false,
        loading: false,
        fileName: '',
        fileType: '',
        contentType: '', // 'excel', 'image', 'text', 'pdf', 'csv'
        key: null,
        
        // Excel önizleme
        excelData: [],
        excelSheets: [],
        excelHeaders: [],
        activeSheetIndex: 0,
        
        // CSV önizleme
        csvData: [],
        csvHeaders: [],
        
        // Metin önizleme
        textContent: '',
        
        // Resim ve PDF önizleme
        imageUrl: '',
        pdfUrl: '',
        data: ''
      },
      // Paylaşım modal için veri
      shareModal: {
        show: false,
        loading: false,
        fileName: '',
        fileType: '',
        key: null,
        url: '',
        expiryDate: null,
        duration: '24' // Varsayılan 24 saat
      }
    }
  },
  computed: {
    filteredFiles() {
      // Önce favorileri filtrele
      let result = [...this.s3Files];
      
      if (this.showOnlyFavorites) {
        result = result.filter(file => file.isFavorite);
      }
      
      // Sonra arama yap
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        result = result.filter(file => {
          // Dosya adında ara
          if (file.name.toLowerCase().includes(query)) {
            return true;
          }
          
          // Tarihte ara (örn: "2023", "Ocak" gibi)
          const dateStr = this.formatDate(file.lastModified).toLowerCase();
          if (dateStr.includes(query)) {
            return true;
          }
          
          return false;
        });
      }
      
      // Sıralama uygula
      result = this.sortFiles(result);
      
      return result;
    }
  },
  async mounted() {
    await this.fetchS3Files();
  },
  methods: {
    async fetchS3Files() {
      this.isLoading = true;
      
      try {
        if (window.electron) {
          const result = await window.electron.listS3Files();
          
          if (result.success) {
            this.s3Files = result.files;
          } else {
            this.showPopup('Hata', result.message || 'Dosyalar yüklenirken bir hata oluştu', 'error');
            this.s3Files = [];
          }
        } else {
          console.error('Electron API bulunamadı');
          this.s3Files = [];
        }
      } catch (error) {
        console.error('Dosyalar yüklenirken hata:', error);
        this.showPopup('Hata', 'Dosyalar yüklenirken beklenmeyen bir hata oluştu', 'error');
      } finally {
        this.isLoading = false;
      }
    },
    
    async downloadFile(file) {
      try {
        if (window.electron) {
          this.showPopup('Bilgi', 'İndirme işlemi başlatılıyor...', 'info');
          
          const result = await window.electron.downloadS3File({
            key: file.key,
            name: file.name
          });
          
          if (result.success) {
            this.showPopup('Başarılı', result.message, 'success');
          } else {
            this.showPopup('Hata', result.message, 'error');
          }
        } else {
          this.showPopup('Hata', 'İndirme işlevi yalnızca Electron ortamında kullanılabilir', 'error');
        }
      } catch (error) {
        console.error('Dosya indirme hatası:', error);
        this.showPopup('Hata', `İndirme sırasında bir hata oluştu: ${error.message}`, 'error');
      }
    },
    
    async toggleFileFavorite(file) {
      try {
        if (window.electron) {
          const result = await window.electron.toggleFavorite(file.key);
          
          if (result.success) {
            // Dosyanın favori durumunu güncelle
            file.isFavorite = result.isFavorite;
            
            // Bildirim göster
            const message = result.isFavorite ? 
              `${file.name} favorilere eklendi` : 
              `${file.name} favorilerden çıkarıldı`;
            
            this.showPopup('Bilgi', message, 'info');
          } else {
            this.showPopup('Hata', result.message, 'error');
          }
        }
      } catch (error) {
        console.error('Favori işlemi hatası:', error);
        this.showPopup('Hata', `Favori işlemi sırasında bir hata oluştu: ${error.message}`, 'error');
      }
    },
    
    toggleFavoritesFilter() {
      this.showOnlyFavorites = !this.showOnlyFavorites;
    },
    
    setSortOption(option) {
      this.sortOption = option;
    },
    
    getSortLabel() {
      const labels = {
        'name-asc': 'İsim (A-Z)',
        'name-desc': 'İsim (Z-A)',
        'date-desc': 'En Yeni',
        'date-asc': 'En Eski',
        'size-desc': 'En Büyük',
        'size-asc': 'En Küçük'
      };
      
      return labels[this.sortOption] || 'En Yeni';
    },
    
    sortFiles(files) {
      switch(this.sortOption) {
        case 'name-asc':
          return [...files].sort((a, b) => a.name.localeCompare(b.name));
        case 'name-desc':
          return [...files].sort((a, b) => b.name.localeCompare(a.name));
        case 'date-desc':
          return [...files].sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
        case 'date-asc':
          return [...files].sort((a, b) => new Date(a.lastModified) - new Date(b.lastModified));
        case 'size-desc':
          return [...files].sort((a, b) => b.size - a.size);
        case 'size-asc':
          return [...files].sort((a, b) => a.size - b.size);
        default:
          return files;
      }
    },
    
    applyFilters() {
      // Filtreleme computed property üzerinden otomatik yapılıyor
    },
    
    clearSearch() {
      this.searchQuery = '';
    },
    
    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
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
    
    // Dosya önizlemeyi destekler mi?
    isPreviewSupported(fileType) {
      const supportedTypes = [
        '.xlsx', '.xls', '.csv', 
        '.txt', '.json', '.xml', '.html', '.css', '.js',
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp',
        '.pdf'
      ];
      
      return supportedTypes.includes(fileType.toLowerCase());
    },
    
    // Dosya önizleme
    async previewFile(file) {
      if (!this.isPreviewSupported(file.type)) {
        this.showPopup('Bilgi', 'Bu dosya türü önizleme için desteklenmiyor', 'info');
        return;
      }
      
      // Önizleme modalını göster ve yükleme durumunu başlat
      this.preview.show = true;
      this.preview.loading = true;
      this.preview.fileName = file.name;
      this.preview.fileType = file.type;
      this.preview.key = file.key;
      
      // İçeriği temizle
      this.clearPreviewContent();
      
      try {
        if (window.electron) {
          const result = await window.electron.previewS3File({
            key: file.key,
            type: file.type
          });
          
          if (result.success) {
            // İçerik türüne göre önizleme hazırla
            this.preview.contentType = result.contentType;
            
            switch (result.contentType) {
              case 'excel':
                this.processExcelData(result.data);
                break;
              case 'csv':
                this.processCsvData(result.data);
                break;
              case 'text':
                this.preview.textContent = result.data;
                break;
              case 'image':
                this.preview.imageUrl = `data:image/${file.type.replace('.', '')};base64,${result.data}`;
                break;
              case 'pdf':
                this.preview.pdfUrl = `data:application/pdf;base64,${result.data}`;
                break;
            }
          } else {
            this.showPopup('Hata', result.message, 'error');
            this.closePreview();
          }
        } else {
          this.showPopup('Hata', 'Önizleme işlevi yalnızca Electron ortamında kullanılabilir', 'error');
          this.closePreview();
        }
      } catch (error) {
        console.error('Dosya önizleme hatası:', error);
        this.showPopup('Hata', `Önizleme sırasında bir hata oluştu: ${error.message}`, 'error');
        this.closePreview();
      } finally {
        this.preview.loading = false;
      }
    },
    
    // Excel verilerini işle
    processExcelData(base64Data) {
      try {
        // Base64 verisini kaydet
        this.preview.data = base64Data;
        
        // Base64'ten binary'ye dönüştür
        const binaryString = window.atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const workbook = XLSX.read(bytes, { type: 'array' });
        
        // Sayfa listesini al
        this.preview.excelSheets = workbook.SheetNames;
        
        if (this.preview.excelSheets.length > 0) {
          // İlk sayfayı göster
          this.selectExcelSheet(0);
        }
      } catch (error) {
        console.error('Excel işleme hatası:', error);
        this.showPopup('Hata', 'Excel verisi işlenirken bir hata oluştu', 'error');
      }
    },
    
    // Excel sayfası seç
    selectExcelSheet(index) {
      try {
        if (!this.preview.excelSheets[index]) return;
        
        this.preview.activeSheetIndex = index;
        
        // Base64'ten binary'ye dönüştür (tekrar)
        const binaryString = window.atob(this.preview.data || '');
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const workbook = XLSX.read(bytes, { type: 'array' });
        
        // Seçilen sayfayı al
        const sheetName = this.preview.excelSheets[index];
        const worksheet = workbook.Sheets[sheetName];
        
        // JSON'a dönüştür
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length > 0) {
          // İlk satır başlık olarak kullanılır
          this.preview.excelHeaders = jsonData[0];
          
          // Kalan satırlar veri olarak kullanılır
          this.preview.excelData = jsonData.slice(1);
        } else {
          this.preview.excelHeaders = [];
          this.preview.excelData = [];
        }
      } catch (error) {
        console.error('Excel sayfası seçme hatası:', error);
        this.preview.excelHeaders = [];
        this.preview.excelData = [];
      }
    },
    
    // CSV verilerini işle
    processCsvData(csvString) {
      try {
        const lines = csvString.split('\n');
        
        if (lines.length > 0) {
          // İlk satır başlık olarak kullanılır
          this.preview.csvHeaders = lines[0].split(',').map(header => header.trim());
          
          // Kalan satırlar veri olarak kullanılır
          this.preview.csvData = lines.slice(1)
            .filter(line => line.trim() !== '')
            .map(line => line.split(',').map(cell => cell.trim()));
        } else {
          this.preview.csvHeaders = [];
          this.preview.csvData = [];
        }
      } catch (error) {
        console.error('CSV işleme hatası:', error);
        this.preview.csvHeaders = [];
        this.preview.csvData = [];
      }
    },
    
    // Önizleme içeriğini temizle
    clearPreviewContent() {
      this.preview.excelData = [];
      this.preview.excelSheets = [];
      this.preview.excelHeaders = [];
      this.preview.activeSheetIndex = 0;
      this.preview.csvData = [];
      this.preview.csvHeaders = [];
      this.preview.textContent = '';
      this.preview.imageUrl = '';
      this.preview.pdfUrl = '';
      this.preview.data = '';
    },
    
    // Önizlenen dosyayı indir
    async downloadPreviewedFile() {
      if (!this.preview.key) return;
      
      try {
        // Dosya adını çıkar
        const fileName = this.preview.fileName;
        
        // İndirme fonksiyonunu çağır
        const result = await window.electron.downloadS3File({
          key: this.preview.key,
          name: fileName
        });
        
        if (result.success) {
          this.showPopup('Başarılı', result.message, 'success');
        } else {
          this.showPopup('Hata', result.message, 'error');
        }
      } catch (error) {
        console.error('Dosya indirme hatası:', error);
        this.showPopup('Hata', `İndirme sırasında bir hata oluştu: ${error.message}`, 'error');
      }
    },
    
    // Önizleme modalını kapat
    closePreview() {
      this.preview.show = false;
      setTimeout(() => {
        this.clearPreviewContent();
      }, 300);
    },
    
    // Dosya paylaşım linki oluştur
    async shareFile(file) {
      // Modal göster ve durumu sıfırla
      this.shareModal.show = true;
      this.shareModal.loading = true;
      this.shareModal.fileName = file.name;
      this.shareModal.fileType = file.type;
      this.shareModal.key = file.key;
      this.shareModal.url = '';
      this.shareModal.expiryDate = null;
      
      try {
        await this.generateShareLink();
      } catch (error) {
        console.error('Paylaşım linki oluşturma hatası:', error);
        this.showPopup('Hata', 'Paylaşım linki oluşturulurken bir hata oluştu', 'error');
        this.closeShareModal();
      } finally {
        this.shareModal.loading = false;
      }
    },
    
    // Paylaşım linki yeniden oluştur (süre değiştiğinde)
    async regenerateShareLink() {
      // Yükleme durumunu aktifleştir
      this.shareModal.loading = true;
      
      try {
        await this.generateShareLink();
      } catch (error) {
        console.error('Paylaşım linki güncelleme hatası:', error);
        this.showPopup('Hata', 'Paylaşım linki güncellenirken bir hata oluştu', 'error');
      } finally {
        this.shareModal.loading = false;
      }
    },
    
    // Paylaşım linki oluşturma ortak fonksiyonu
    async generateShareLink() {
      if (!window.electron) {
        this.showPopup('Hata', 'Bu özellik yalnızca Electron ortamında kullanılabilir', 'error');
        return;
      }
      
      const result = await window.electron.generateShareLink({
        key: this.shareModal.key,
        name: this.shareModal.fileName,
        expiration: parseInt(this.shareModal.duration)
      });
      
      if (result.success) {
        this.shareModal.url = result.url;
        this.shareModal.expiryDate = result.expiration;
      } else {
        this.showPopup('Hata', result.message, 'error');
        this.closeShareModal();
      }
    },
    
    // Paylaşım linki kopyala
    copyShareLink() {
      if (!this.shareModal.url) return;
      
      try {
        // Metin alanını seç
        this.selectShareInput();
        
        // Panoya kopyala
        document.execCommand('copy');
        
        // Başarılı bildirim göster
        this.showPopup('Başarılı', 'Paylaşım linki panoya kopyalandı', 'success');
      } catch (error) {
        console.error('Kopyalama hatası:', error);
        this.showPopup('Hata', 'Link kopyalanamadı', 'error');
      }
    },
    
    // Paylaşım giriş alanını seç
    selectShareInput() {
      if (this.$refs.shareInput) {
        this.$refs.shareInput.select();
      }
    },
    
    // Paylaşım modal kapatma
    closeShareModal() {
      this.shareModal.show = false;
    },
    
    // Geçerlilik tarihini formatla
    formatExpiryDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }
}
</script>

<style scoped>
.downloads-page {
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
}

/* Arama ve Filtre Bölümü */
.search-filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  flex-wrap: wrap;
  gap: 15px;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 250px;
}

.search-box i {
  position: absolute;
  left: 15px;
  top: 50%;
  transform: translateY(-50%);
  color: #64748b;
}

.search-box input {
  width: 100%;
  padding: 12px 40px 12px 40px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: all 0.3s;
}

.search-box input:focus {
  border-color: #4568dc;
  box-shadow: 0 0 0 3px rgba(69, 104, 220, 0.1);
}

.clear-search {
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
}

.filter-options {
  display: flex;
  gap: 10px;
}

.favorites-filter {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 15px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  color: #64748b;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.favorites-filter.active {
  background-color: #fff0f0;
  color: #e74c3c;
  border-color: #e74c3c;
}

.favorites-filter.active i {
  color: #e74c3c;
}

.sort-dropdown {
  position: relative;
  display: inline-block;
}

.sort-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 15px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  color: #64748b;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.dropdown-content {
  display: none;
  position: absolute;
  right: 0;
  background-color: white;
  min-width: 200px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  z-index: 10;
  border-radius: 8px;
  padding: 5px 0;
  margin-top: 5px;
}

.sort-dropdown:hover .dropdown-content {
  display: block;
}

.dropdown-content button {
  width: 100%;
  text-align: left;
  padding: 10px 15px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  color: #64748b;
  display: flex;
  align-items: center;
}

.dropdown-content button i {
  margin-right: 10px;
  width: 16px;
}

.dropdown-content button:hover {
  background-color: #f8fafc;
}

.dropdown-content button.active {
  background-color: #e9f1ff;
  color: #4568dc;
}

/* Yükleniyor Göstergesi */
.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: #64748b;
}

.loading-indicator i {
  margin-bottom: 15px;
}

/* Boş Durumu */
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

/* Dosya Kartları */
.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.file-card {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  display: flex;
  flex-direction: column;
}

.file-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.file-header {
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.file-icon {
  width: 60px;
  height: 60px;
  background-color: #e9f1ff;
  border-radius: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #4568dc;
}

.file-actions-small {
  display: flex;
  gap: 8px;
}

.action-btn-small {
  background: none;
  border: none;
  font-size: 16px;
  color: #64748b;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn-small:hover {
  background-color: #f1f5f9;
  color: #4568dc;
}

.action-btn-small.favorited {
  color: #e74c3c;
}

.action-btn-small.favorited:hover {
  background-color: #fff0f0;
}

.action-btn-small.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.file-info {
  padding: 0 20px 20px;
  flex-grow: 1;
}

.file-name {
  margin: 0 0 15px 0;
  font-size: 16px;
  font-weight: 500;
  color: #0f172a;
  word-break: break-word;
}

.file-meta {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.file-size, .file-date {
  margin: 0;
  font-size: 13px;
  color: #64748b;
  display: flex;
  align-items: center;
}

.file-size::before {
  content: '\f0b2';
  font-family: 'Font Awesome 5 Free';
  font-weight: 900;
  margin-right: 8px;
  font-size: 12px;
}

.file-date::before {
  content: '\f073';
  font-family: 'Font Awesome 5 Free';
  font-weight: 900;
  margin-right: 8px;
  font-size: 12px;
}

.file-actions {
  padding: 15px 20px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  justify-content: center;
}

.download-btn {
  width: 100%;
  padding: 10px 0;
  background-color: #4568dc;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  transition: background-color 0.3s;
}

.download-btn:hover {
  background-color: #3b57b5;
}

.download-btn:active {
  transform: scale(0.98);
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

/* Duyarlı Tasarım */
@media (max-width: 768px) {
  .search-filter-bar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .file-grid {
    grid-template-columns: 1fr;
  }
}

/* Önizleme Modal */
.preview-modal {
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

.preview-container {
  background-color: white;
  border-radius: 10px;
  width: 80%;
  max-width: 1200px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  position: relative;
}

.preview-container.full-width {
  width: 90%;
  max-width: 1400px;
}

.preview-header {
  padding: 15px 20px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  display: flex;
  align-items: center;
}

.mr-2 {
  margin-right: 8px;
}

.preview-close {
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

.preview-close:hover {
  background-color: #f1f5f9;
  color: #ef4444;
}

.preview-content {
  flex: 1;
  overflow: auto;
  position: relative;
  min-height: 200px;
  padding: 20px;
}

/* Yükleniyor Göstergesi */
.preview-loading {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.8);
  color: #64748b;
}

.preview-loading i {
  margin-bottom: 15px;
}

/* Excel Önizleme */
.excel-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.excel-tabs {
  display: flex;
  overflow-x: auto;
  margin-bottom: 15px;
  border-bottom: 1px solid #e2e8f0;
}

.excel-tab-btn {
  padding: 8px 16px;
  background: none;
  border: none;
  font-size: 14px;
  color: #64748b;
  cursor: pointer;
  white-space: nowrap;
  border-bottom: 2px solid transparent;
}

.excel-tab-btn.active {
  color: #4568dc;
  border-bottom-color: #4568dc;
  font-weight: 500;
}

.excel-table-container {
  flex: 1;
  overflow: auto;
}

.excel-table, .csv-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.excel-table th, .csv-table th {
  background-color: #f8fafc;
  padding: 10px;
  position: sticky;
  top: 0;
  text-align: left;
  border: 1px solid #e2e8f0;
  font-weight: 600;
  color: #0f172a;
}

.excel-table td, .csv-table td {
  padding: 8px 10px;
  border: 1px solid #e2e8f0;
}

.excel-table tr:nth-child(even), .csv-table tr:nth-child(even) {
  background-color: #f8fafc;
}

/* Metin Önizleme */
.text-preview {
  height: 100%;
  overflow: auto;
}

.text-preview pre {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  line-height: 1.5;
  background-color: #f8fafc;
  padding: 15px;
  border-radius: 5px;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
  color: #334155;
  max-height: 100%;
  overflow: auto;
}

/* Resim Önizleme */
.image-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  overflow: auto;
}

.image-preview img {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
}

/* PDF Önizleme */
.pdf-preview {
  height: 70vh;
  width: 100%;
}

/* Desteklenmeyen Dosya */
.unsupported-file, .no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #64748b;
  text-align: center;
}

.unsupported-file i, .no-data i {
  margin-bottom: 15px;
  color: #cbd5e1;
}

.preview-footer {
  padding: 15px 20px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  transition: all 0.3s;
  border: none;
}

.btn-primary {
  background-color: #4568dc;
  color: white;
}

.btn-primary:hover {
  background-color: #3b57b5;
}

/* Paylaşım Modal */
.share-modal {
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

.share-container {
  background-color: white;
  border-radius: 10px;
  width: 90%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.share-header {
  padding: 15px 20px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.share-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  display: flex;
  align-items: center;
}

.share-close {
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

.share-close:hover {
  background-color: #f1f5f9;
  color: #ef4444;
}

.share-content {
  padding: 20px;
  position: relative;
  min-height: 200px;
}

.share-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: #64748b;
}

.share-loading i {
  margin-bottom: 15px;
}

.share-link-box {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.file-info-wrapper {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 10px;
}

.share-file-icon {
  width: 50px;
  height: 50px;
  background-color: #e9f1ff;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #4568dc;
}

.share-file-info {
  flex: 1;
}

.share-file-info h4 {
  margin: 0 0 5px 0;
  font-size: 16px;
  font-weight: 500;
  color: #0f172a;
}

.share-expiry {
  margin: 0;
  font-size: 13px;
  color: #64748b;
  display: flex;
  align-items: center;
}

.share-input-group {
  display: flex;
  gap: 10px;
  width: 100%;
}

.share-input {
  flex: 1;
  padding: 12px 15px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  background-color: #f8fafc;
  outline: none;
  font-family: monospace;
  transition: all 0.3s;
}

.share-input:focus {
  border-color: #4568dc;
  box-shadow: 0 0 0 3px rgba(69, 104, 220, 0.1);
}

.share-copy-btn {
  padding: 0 20px;
  background-color: #4568dc;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  transition: background-color 0.3s;
  white-space: nowrap;
}

.share-copy-btn:hover {
  background-color: #3b57b5;
}

.share-options {
  margin-top: 10px;
}

.share-expiry-select {
  display: flex;
  align-items: center;
  gap: 10px;
}

.share-expiry-select label {
  font-size: 14px;
  color: #64748b;
}

.share-expiry-select select {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  color: #0f172a;
  background-color: white;
  cursor: pointer;
  transition: all 0.3s;
}

.share-expiry-select select:focus {
  border-color: #4568dc;
  outline: none;
}

.mr-1 {
  margin-right: 4px;
}

@media (max-width: 576px) {
  .share-input-group {
    flex-direction: column;
  }
  
  .share-expiry-select {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
}
</style> 