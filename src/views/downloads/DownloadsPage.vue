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
        
        <button @click="toggleGroupByDate" :class="{ active: groupByDate }" class="group-by-date-btn">
          <i class="fas fa-calendar-week"></i>
          <span>Tarih göre kapsa</span>
        </button>
        
        <div class="sort-dropdown">
          <button @click.stop="toggleSortDropdown" class="sort-button">
            <i class="fas fa-sort"></i>
            <span>Sıralama: {{ getSortLabel() }}</span>
          </button>
          <div v-show="showSortDropdown" class="dropdown-content">
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
    
    <!-- Klasör Gezinme Çubuğu (Aktif klasör varsa) -->
    <div v-if="currentFolder" class="folder-navigation">
      <button @click="goBackFolder" class="back-button" :disabled="folderHistory.length === 0">
        <i class="fas fa-arrow-left"></i>
        <span>Geri</span>
      </button>
      
      <div class="folder-path">
        <button @click="goToRoot" class="path-item root">
          <i class="fas fa-home"></i>
          <span>Ana Dizin</span>
        </button>
        <i class="fas fa-chevron-right path-separator"></i>
        
        <button v-for="(folder, index) in folderHistory" :key="index" 
          @click="goToHistoryIndex(index)" 
          class="path-item">
          <span>{{ folder.name }}</span>
          <i class="fas fa-chevron-right path-separator"></i>
        </button>
        
        <span class="current-folder">{{ currentFolder.name }}</span>
      </div>
    </div>
    
    <!-- Yükleniyor Göstergesi -->
    <div v-if="isLoading" class="loading-indicator">
      <i class="fas fa-spinner fa-spin fa-2x"></i>
      <p>Dosyalar yükleniyor...</p>
    </div>
    
    <!-- Klasör İçeriği (eğer bir klasör açıksa) -->
    <div v-else-if="currentFolder" class="card">
      <div class="card-header">
        <h2 class="folder-title">
          <i class="fas fa-folder-open"></i>
          {{ currentFolder.name }} Klasörü
        </h2>
      </div>
      
      <!-- Alt Klasörler -->
      <div v-if="folderContents.subfolders && folderContents.subfolders.length > 0" class="subfolder-section">
        <h3 class="section-title">Alt Klasörler</h3>
        <div class="folder-grid">
          <div v-for="folder in folderContents.subfolders" :key="folder.key" class="folder-card"
            @click="openFolder(folder)" @dblclick="openFolder(folder)">
            <div class="folder-icon">
              <i class="fas fa-folder fa-3x"></i>
            </div>
            <div class="folder-info">
              <h3 class="folder-name">{{ folder.name }}</h3>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Klasör İçindeki Dosyalar -->
      <div v-if="folderContents.files && folderContents.files.length > 0" class="folder-files-section">
        <h3 class="section-title">Dosyalar</h3>
        <div class="file-grid">
          <div v-for="file in folderContents.files" :key="file.key" class="file-card" :data-file-type="file.type">
            <div class="file-header">
              <div class="file-icon" :style="getFileIconStyle(file.type)">
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
            
            <!-- Klasör bilgisi etiketini favorilerde de göster -->
            <div v-if="(!currentFolder && searchQuery && file.key.includes('/')) || (!currentFolder && showOnlyFavorites && file.key.includes('/'))" class="folder-info-badge">
              <i class="fas fa-folder"></i>
              {{ getFolderNameFromKey(file.key) }}
            </div>
            
            <div class="file-actions">
              <button @click="downloadFile(file)" class="download-btn">
                <i class="fas fa-download"></i>
                <span>İndir</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Boş Klasör -->
      <div v-if="(!folderContents.files || folderContents.files.length === 0) && 
                 (!folderContents.subfolders || folderContents.subfolders.length === 0)" 
           class="empty-state">
        <i class="fas fa-folder-open fa-3x"></i>
        <p>Bu klasör boş</p>
      </div>
    </div>
    
    <!-- Ana Dizin Klasörleri ve Dosyaları -->
    <div v-else-if="s3Folders.length > 0 || filteredFiles.length > 0" class="card">
      <!-- S3 Klasörleri Listesi -->
      <div v-if="s3Folders.length > 0 && !searchQuery && !showOnlyFavorites && !groupByDate" class="folders-section">
        <h2 class="section-title">
          <i class="fas fa-folder"></i>
          Klasörler
        </h2>
        
        <div class="folder-grid">
          <div v-for="folder in s3Folders" :key="folder.key" class="folder-card"
            @click="openFolder(folder)" @dblclick="openFolder(folder)">
            <div class="folder-icon">
              <i class="fas fa-folder fa-3x"></i>
            </div>
            <div class="folder-info">
              <h3 class="folder-name">{{ folder.name }}</h3>
            </div>
            <div class="folder-actions">
              <button @click.stop="downloadFolder(folder)" class="folder-download-btn">
                <i class="fas fa-download"></i>
                <span>İndir</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Dosya Listesi Başlığı -->
      <div v-if="filteredFiles.length > 0 && !groupByDate" class="files-section">
        <h2 class="section-title">
          <i class="fas fa-file"></i>
          Dosyalar
        </h2>
        
        <div class="file-grid">
          <div v-for="file in filteredFiles" :key="file.key" class="file-card" :data-file-type="file.type">
            <div class="file-header">
              <div class="file-icon" :style="getFileIconStyle(file.type)">
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
            
            <!-- Klasör bilgisi etiketini favorilerde de göster -->
            <div v-if="(!currentFolder && searchQuery && file.key.includes('/')) || (!currentFolder && showOnlyFavorites && file.key.includes('/'))" class="folder-info-badge">
              <i class="fas fa-folder"></i>
              {{ getFolderNameFromKey(file.key) }}
            </div>
            
            <div class="file-actions">
              <button @click="downloadFile(file)" class="download-btn">
                <i class="fas fa-download"></i>
                <span>İndir</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Dosya Bulunamadı (Klasör ve dosya yoksa) -->
    <div v-if="filteredFiles.length === 0 && s3Folders.length === 0" class="card">
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
    
    <!-- Dosya Listesi (Tarih gruplarına göre) -->
    <transition-group 
      v-else-if="groupByDate && !currentFolder" 
      name="date-group-transition" 
      tag="div" 
      class="file-date-groups"
    >
      <!-- S3 Klasörleri Listesi -->
      <div v-if="s3Folders.length > 0 && !searchQuery && !showOnlyFavorites" class="folder-section file-date-group" key="folders-section">
        <h2 class="date-group-title">
          <i class="fas fa-folder"></i>
          Klasörler
        </h2>
        
        <div class="folder-grid">
          <div v-for="folder in s3Folders" :key="folder.key" class="folder-card"
            @click="openFolder(folder)" @dblclick="openFolder(folder)">
            <div class="folder-icon">
              <i class="fas fa-folder fa-3x"></i>
            </div>
            <div class="folder-info">
              <h3 class="folder-name">{{ folder.name }}</h3>
            </div>
            <div class="folder-actions">
              <button @click.stop="downloadFolder(folder)" class="folder-download-btn">
                <i class="fas fa-download"></i>
                <span>İndir</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Dosya Grupları -->
      <div v-for="(group, date) in groupedByDateFiles" :key="date" class="file-date-group">
        <h2 class="date-group-title">{{ date }}</h2>
        <div class="file-grid date-grouped">
          <div v-for="file in group" :key="file.key" class="file-card compact" :data-file-type="file.type">
            <div class="file-header">
              <div class="file-icon" :style="getFileIconStyle(file.type)">
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
              </div>
            </div>
            
            <!-- Klasör bilgisi etiketini favorilerde de göster -->
            <div v-if="(!currentFolder && searchQuery && file.key.includes('/')) || (!currentFolder && showOnlyFavorites && file.key.includes('/'))" class="folder-info-badge">
              <i class="fas fa-folder"></i>
              {{ getFolderNameFromKey(file.key) }}
            </div>
            
            <div class="file-actions">
              <button @click="downloadFile(file)" class="download-btn">
                <i class="fas fa-download"></i>
                <span>İndir</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition-group>
    
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
            <i :class="getFileIcon(preview.fileType)" class="mr-2" :style="{ color: getFileIconStyle(preview.fileType).color }"></i>
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
          
          <!-- Video önizleme -->
          <div v-else-if="preview.contentType === 'video'" class="video-preview">
            <video controls autoplay class="video-player">
              <source :src="preview.videoUrl" :type="getVideoMimeType(preview.fileType)">
              Tarayıcınız video oynatmayı desteklemiyor.
            </video>
          </div>
          
          <!-- Ses önizleme -->
          <div v-else-if="preview.contentType === 'audio'" class="audio-preview">
            <div class="audio-player-container">
              <div class="audio-file-info">
                <i :class="getFileIcon(preview.fileType)" class="fa-3x" :style="{ color: getFileIconStyle(preview.fileType).color }"></i>
                <h4>{{ preview.fileName }}</h4>
              </div>
              <audio controls autoplay class="audio-player">
                <source :src="preview.audioUrl" :type="getAudioMimeType(preview.fileType)">
                Tarayıcınız ses oynatmayı desteklemiyor.
              </audio>
            </div>
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
              <div class="share-file-icon" :style="getFileIconStyle(shareModal.fileType)">
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
      groupByDate: false,
      sortOption: 'date-desc', // varsayılan sıralama
      showSortDropdown: false,
      // Popup bildirimi için veri
      popup: {
        show: false,
        title: '',
        message: '',
        type: 'success', // 'success', 'error', 'info'
        timeout: null
      },
      // S3 Klasör verileri
      s3Folders: [],
      currentFolder: null, // Açık klasör (null ise ana dizindeyiz)
      folderHistory: [], // Gezinme geçmişi
      folderContents: {
        files: [],
        subfolders: []
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
        data: '',
        
        // Video ve Ses önizleme
        videoUrl: '',
        audioUrl: ''
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
      
      // Klasör içindeki dosyaları hariç tut (sadece ana dizindeki dosyaları göster, arama yoksa ve favorilerde değilsek)
      if (!this.currentFolder && !this.searchQuery && !this.showOnlyFavorites) {
        // Ana dizindeki dosyaları gösterirken, klasör içindeki dosyaları hariç tut
        // Klasörler "/" ile biter, bu nedenle "/" içeren anahtarları hariç tutuyoruz
        result = result.filter(file => !file.key.includes('/'));
      }
      
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
    },
    
    groupedByDateFiles() {
      // Tarihe göre dosyaları gruplandır
      const groups = {};
      
      for (const file of this.filteredFiles) {
        const date = new Date(file.lastModified);
        const dateKey = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
        const displayDate = this.formatDate(file.lastModified);
        
        if (!groups[displayDate]) {
          groups[displayDate] = [];
        }
        
        groups[displayDate].push(file);
      }
      
      // Grupları tarih sırasına göre sırala
      const sortedGroups = {};
      
      // Tarihleri bir diziye al ve sırala
      const sortedDates = Object.keys(groups).sort((a, b) => {
        // Tarihleri analiz et
        const datePartsA = a.split(' ');
        const datePartsB = b.split(' ');
        
        // Yıl karşılaştırması
        const yearA = parseInt(datePartsA[2], 10);
        const yearB = parseInt(datePartsB[2], 10);
        
        if (yearA !== yearB) {
          return this.sortOption.includes('desc') ? yearB - yearA : yearA - yearB;
        }
        
        // Ay karşılaştırması
        const months = {
          'Ocak': 0, 'Şubat': 1, 'Mart': 2, 'Nisan': 3, 'Mayıs': 4, 'Haziran': 5,
          'Temmuz': 6, 'Ağustos': 7, 'Eylül': 8, 'Ekim': 9, 'Kasım': 10, 'Aralık': 11
        };
        
        const monthA = months[datePartsA[1]];
        const monthB = months[datePartsB[1]];
        
        if (monthA !== monthB) {
          return this.sortOption.includes('desc') ? monthB - monthA : monthA - monthB;
        }
        
        // Gün karşılaştırması
        const dayA = parseInt(datePartsA[0], 10);
        const dayB = parseInt(datePartsB[0], 10);
        
        return this.sortOption.includes('desc') ? dayB - dayA : dayA - dayB;
      });
      
      // Sıralanmış grupları oluştur
      for (const date of sortedDates) {
        sortedGroups[date] = groups[date];
      }
      
      return sortedGroups;
    }
  },
  async mounted() {
    await this.fetchS3Files();
    await this.fetchS3Folders();

    // Sayfa üzerinde herhangi bir yere tıklandığında açık menüleri kapat
    document.addEventListener('click', this.handleOutsideClick);
  },
  beforeUnmount() {
    // Component yok edilmeden önce event listener'ı kaldır
    document.removeEventListener('click', this.handleOutsideClick);
  },
  methods: {
    // Sayfa üzerinde menü dışında bir yere tıklandığında açık menüleri kapat
    handleOutsideClick(event) {
      const sortDropdown = this.$el.querySelector('.sort-dropdown');
      if (sortDropdown && !sortDropdown.contains(event.target)) {
        this.showSortDropdown = false;
      }
    },

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
    
    // S3 Klasörleri getir
    async fetchS3Folders() {
      try {
        if (window.electron) {
          const result = await window.electron.listS3Folders();
          
          if (result.success) {
            this.s3Folders = result.folders;
          } else {
            console.error('Klasörler yüklenemedi:', result.message);
            this.s3Folders = [];
          }
        } else {
          console.error('Electron API bulunamadı');
          this.s3Folders = [];
        }
      } catch (error) {
        console.error('Klasörler yüklenirken hata:', error);
      }
    },
    
    // Klasör içeriğini getir
    async openFolder(folder) {
      this.isLoading = true;
      
      try {
        if (window.electron) {
          const result = await window.electron.listS3FolderContents(folder.key);
          
          if (result.success) {
            // Mevcut klasörü geçmişe ekle
            if (this.currentFolder) {
              this.folderHistory.push(this.currentFolder);
            }
            
            // Yeni klasörü aktif yap
            this.currentFolder = folder;
            this.folderContents = {
              files: result.files || [],
              subfolders: result.subfolders || []
            };
          } else {
            this.showPopup('Hata', result.message || 'Klasör içeriği yüklenemedi', 'error');
          }
        } else {
          this.showPopup('Hata', 'Electron API bulunamadı', 'error');
        }
      } catch (error) {
        console.error('Klasör içeriği yüklenirken hata:', error);
        this.showPopup('Hata', 'Klasör içeriği yüklenirken beklenmeyen bir hata oluştu', 'error');
      } finally {
        this.isLoading = false;
      }
    },
    
    // Bir önceki klasöre geri dön
    goBackFolder() {
      if (this.folderHistory.length > 0) {
        const previousFolder = this.folderHistory.pop();
        this.openFolder(previousFolder);
      } else {
        // Ana dizine dön
        this.currentFolder = null;
        this.folderContents = {
          files: [],
          subfolders: []
        };
      }
    },
    
    // Ana dizine dön
    goToRoot() {
      this.currentFolder = null;
      this.folderContents = {
        files: [],
        subfolders: []
      };
      this.folderHistory = [];
    },
    
    // Gezinme geçmişinde belirli bir klasöre git
    goToHistoryIndex(index) {
      // İndeks'e kadar olan klasörleri koru, diğerlerini kaldır
      const targetFolder = this.folderHistory[index];
      this.folderHistory = this.folderHistory.slice(0, index);
      this.openFolder(targetFolder);
    },
    
    // Klasörü indir
    async downloadFolder(folder) {
      try {
        if (window.electron) {
          this.showPopup('Bilgi', 'Klasör indirme işlemi başlatılıyor...', 'info');
          
          const result = await window.electron.downloadS3Folder({
            key: folder.key,
            name: folder.name
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
        console.error('Klasör indirme hatası:', error);
        this.showPopup('Hata', `İndirme sırasında bir hata oluştu: ${error.message}`, 'error');
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
    
    toggleGroupByDate() {
      this.groupByDate = !this.groupByDate;
      this.applyFilters();
    },
    
    toggleSortDropdown(event) {
      // Olayın yayılmasını engelle (dışarıda tıklama algılanmasın)
      event.stopPropagation();
      this.showSortDropdown = !this.showSortDropdown;
    },
    
    setSortOption(option) {
      this.sortOption = option;
      // Sıralama seçildikten sonra menüyü kapat
      this.showSortDropdown = false;
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
        '.rar': 'far fa-file-archive',
        '.mp4': 'far fa-file-video',
        '.mov': 'far fa-file-video',
        '.avi': 'far fa-file-video',
        '.webm': 'far fa-file-video',
        '.mp3': 'far fa-file-audio',
        '.wav': 'far fa-file-audio',
        '.ogg': 'far fa-file-audio',
        '.flac': 'far fa-file-audio',
        '.aac': 'far fa-file-audio'
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
        '.pdf',
        '.mp4', '.webm', '.mov', '.avi',
        '.mp3', '.wav', '.ogg', '.flac', '.aac'
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
              case 'video':
                this.preview.videoUrl = `data:video/${file.type.replace('.', '')};base64,${result.data}`;
                break;
              case 'audio':
                this.preview.audioUrl = `data:audio/${file.type.replace('.', '')};base64,${result.data}`;
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
      this.preview.videoUrl = '';
      this.preview.audioUrl = '';
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
    },
    
    getFileIconStyle(fileType) {
      const colorMap = {
        '.mp4': { bgColor: '#ffe9e8', color: '#e74c3c' }, // Video
        '.mov': { bgColor: '#ffe9e8', color: '#e74c3c' }, 
        '.avi': { bgColor: '#ffe9e8', color: '#e74c3c' }, 
        '.mkv': { bgColor: '#ffe9e8', color: '#e74c3c' },
        '.wmv': { bgColor: '#ffe9e8', color: '#e74c3c' },
        '.webm': { bgColor: '#ffe9e8', color: '#e74c3c' },
        
        '.mp3': { bgColor: '#fff9e3', color: '#f39c12' }, // Ses
        '.wav': { bgColor: '#fff9e3', color: '#f39c12' }, 
        '.ogg': { bgColor: '#fff9e3', color: '#f39c12' }, 
        '.flac': { bgColor: '#fff9e3', color: '#f39c12' },
        '.aac': { bgColor: '#fff9e3', color: '#f39c12' },
        
        '.xls': { bgColor: '#e4f8ed', color: '#2ecc71' }, // Excel
        '.xlsx': { bgColor: '#e4f8ed', color: '#2ecc71' },
        
        '.doc': { bgColor: '#e6f4fb', color: '#3498db' }, // Word
        '.docx': { bgColor: '#e6f4fb', color: '#3498db' },
        
        '.ppt': { bgColor: '#faeee7', color: '#e67e22' }, // PowerPoint
        '.pptx': { bgColor: '#faeee7', color: '#e67e22' },
        
        '.pdf': { bgColor: '#ffe9e8', color: '#e74c3c' }, // PDF
        
        '.jpg': { bgColor: '#f2e6f7', color: '#9b59b6' }, // Resim
        '.jpeg': { bgColor: '#f2e6f7', color: '#9b59b6' },
        '.png': { bgColor: '#f2e6f7', color: '#9b59b6' },
        '.gif': { bgColor: '#f2e6f7', color: '#9b59b6' },
        '.bmp': { bgColor: '#f2e6f7', color: '#9b59b6' },
        
        '.zip': { bgColor: '#e8edf1', color: '#34495e' }, // Arşiv
        '.rar': { bgColor: '#e8edf1', color: '#34495e' },
        '.7z': { bgColor: '#e8edf1', color: '#34495e' },
        '.tar': { bgColor: '#e8edf1', color: '#34495e' },
        '.gz': { bgColor: '#e8edf1', color: '#34495e' },
        
        '.txt': { bgColor: '#f0f2f3', color: '#7f8c8d' }, // Metin
        '.rtf': { bgColor: '#f0f2f3', color: '#7f8c8d' }
      };
      
      const defaultStyle = { bgColor: '#e9f1ff', color: '#4568dc' };
      const style = colorMap[fileType.toLowerCase()] || defaultStyle;
      
      return {
        backgroundColor: style.bgColor,
        color: style.color
      };
    },
    
    // Video MIME türünü al
    getVideoMimeType(fileType) {
      const mimeMap = {
        '.mp4': 'video/mp4',
        '.mov': 'video/quicktime',
        '.avi': 'video/x-msvideo',
        '.mkv': 'video/x-matroska',
        '.wmv': 'video/x-ms-wmv',
        '.webm': 'video/webm',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.flac': 'audio/flac',
        '.aac': 'audio/aac'
      };
      
      return mimeMap[fileType.toLowerCase()] || 'video/mp4';
    },
    
    // Ses MIME türünü al
    getAudioMimeType(fileType) {
      const mimeMap = {
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.flac': 'audio/flac',
        '.aac': 'audio/aac'
      };
      
      return mimeMap[fileType.toLowerCase()] || 'audio/mpeg';
    },
    
    // Klasör adını ana dizinden al
    getFolderNameFromKey(key) {
      // path formatı: klasörAdı/dosyaAdı
      const parts = key.split('/');
      if (parts.length > 1) {
        // Son eleman dosya adı, ondan önceki eleman klasör adı
        return parts[parts.length - 2]; // Klasör adını döndür
      }
      return '';
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
  max-width: 500px;
  display: flex;
  align-items: center;
  background-color: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0 15px;
  transition: all 0.3s;
}

.search-box:focus-within {
  border-color: #4568dc;
  box-shadow: 0 0 0 3px rgba(69, 104, 220, 0.1);
}

.search-box i.fas.fa-search {
  color: #64748b;
  font-size: 14px;
  margin-right: 10px;
  flex-shrink: 0;
}

.search-box input {
  width: 100%;
  padding: 12px 0;
  border: none;
  font-size: 14px;
  outline: none;
  background: transparent;
}

.clear-search {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0;
  margin-left: 5px;
  flex-shrink: 0;
}

.filter-options {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 10px;
}

.favorites-filter, .group-by-date-btn {
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
  white-space: nowrap;
}

.favorites-filter.active {
  background-color: #fff0f0;
  color: #e74c3c;
  border-color: #e74c3c;
}

.favorites-filter.active i {
  color: #e74c3c;
}

.group-by-date-btn.active {
  background-color: #e9f1ff;
  color: #4568dc;
  border-color: #4568dc;
}

.group-by-date-btn.active i {
  color: #4568dc;
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
  white-space: nowrap;
}

.dropdown-content {
  display: block;
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

/* Dosya Grup Başlıkları */
.file-date-groups {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.file-date-group {
  border-radius: 12px;
  background-color: #f8fafc;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.date-group-title {
  font-size: 18px;
  font-weight: 600;
  color: #334155;
  margin: 0 0 20px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid #e2e8f0;
}

.file-grid.date-grouped {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 15px;
}

.file-card.compact {
  transform: scale(0.95);
  transition: transform 0.2s;
}

.file-card.compact:hover {
  transform: scale(0.98);
}

.file-card.compact .file-icon {
  width: 50px;
  height: 50px;
}

.file-card.compact .file-name {
  font-size: 14px;
  margin-bottom: 10px;
}

.file-card.compact .file-header {
  padding: 15px;
}

.file-card.compact .file-info {
  padding: 0 15px 15px;
}

.file-card.compact .file-actions {
  padding: 10px 15px;
}

.file-card.compact .download-btn {
  padding: 8px 0;
  font-size: 13px;
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
  position: relative;
  border-top: 3px solid transparent;
}

.file-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

/* Dosya uzantısına göre renkli üst çizgiler */
.file-card[data-file-type=".mp4"], 
.file-card[data-file-type=".mov"], 
.file-card[data-file-type=".avi"], 
.file-card[data-file-type=".mkv"], 
.file-card[data-file-type=".wmv"] {
  border-top-color: #e74c3c; /* Video dosyaları için kırmızı */
}

.file-card[data-file-type=".mp3"], 
.file-card[data-file-type=".wav"], 
.file-card[data-file-type=".ogg"], 
.file-card[data-file-type=".flac"], 
.file-card[data-file-type=".aac"] {
  border-top-color: #f39c12; /* Ses dosyaları için sarı */
}

.file-card[data-file-type=".xls"], 
.file-card[data-file-type=".xlsx"] {
  border-top-color: #2ecc71; /* Excel dosyaları için yeşil */
}

.file-card[data-file-type=".doc"], 
.file-card[data-file-type=".docx"] {
  border-top-color: #3498db; /* Word dosyaları için mavi */
}

.file-card[data-file-type=".ppt"], 
.file-card[data-file-type=".pptx"] {
  border-top-color: #e67e22; /* PowerPoint dosyaları için turuncu */
}

.file-card[data-file-type=".pdf"] {
  border-top-color: #e74c3c; /* PDF dosyaları için kırmızı */
}

.file-card[data-file-type=".jpg"], 
.file-card[data-file-type=".jpeg"], 
.file-card[data-file-type=".png"], 
.file-card[data-file-type=".gif"], 
.file-card[data-file-type=".bmp"] {
  border-top-color: #9b59b6; /* Resim dosyaları için mor */
}

.file-card[data-file-type=".zip"], 
.file-card[data-file-type=".rar"], 
.file-card[data-file-type=".7z"], 
.file-card[data-file-type=".tar"], 
.file-card[data-file-type=".gz"] {
  border-top-color: #34495e; /* Arşiv dosyaları için koyu gri */
}

.file-card[data-file-type=".txt"], 
.file-card[data-file-type=".rtf"] {
  border-top-color: #7f8c8d; /* Metin dosyaları için gri */
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

/* Duyarlı Tasarım */
@media (max-width: 768px) {
  .search-filter-bar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-options {
    flex-wrap: wrap;
    justify-content: space-between;
  }
  
  .favorites-filter, .group-by-date-btn, .sort-dropdown {
    flex: 1;
    min-width: 150px;
  }
  
  .search-box {
    max-width: none;
  }
  
  .file-grid {
    grid-template-columns: 1fr;
  }
  
  .file-grid.date-grouped {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
}

@media (max-width: 576px) {
  .filter-options {
    flex-direction: column;
    align-items: stretch;
  }
  
  .file-grid.date-grouped {
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

/* Video Önizleme */
.video-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  overflow: auto;
}

.video-player {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
}

/* Ses Önizleme */
.audio-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  overflow: auto;
}

.audio-player-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.audio-file-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.audio-player {
  width: 100%;
  max-height: 70vh;
  object-fit: contain;
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

/* Animasyonlar - Tarih grupları geçişi */
.date-group-transition-enter-active, 
.date-group-transition-leave-active {
  transition: all 0.6s ease;
}

.date-group-transition-enter-from, 
.date-group-transition-leave-to {
  opacity: 0;
  transform: translateY(30px);
}

.date-group-transition-move {
  transition: transform 0.6s ease;
}

/* Dosya kartları geçişi */
.file-cards-transition-enter-active, 
.file-cards-transition-leave-active {
  transition: all 0.5s ease;
}

.file-cards-transition-enter-from, 
.file-cards-transition-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

.file-cards-transition-move {
  transition: transform 0.5s ease;
}

/* Kartların boyut değişimini animasyonlu yapma */
.file-card {
  transition: all 0.4s ease-in-out;
}

.file-card.compact {
  transform: scale(0.95);
  transition: all 0.4s ease-in-out;
}

.file-card.compact:hover {
  transform: scale(0.98);
  transition: all 0.3s ease-in-out;
}

.file-date-group {
  animation: fadeInUp 0.7s ease-in-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Klasör Gezinme Çubuğu (Aktif klasör varsa) */
.folder-navigation {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  background-color: #f8fafc;
  border-radius: 10px;
  padding: 8px 15px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.folder-path {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
  flex: 1;
  overflow: hidden;
}

.path-item {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #64748b;
  text-decoration: none;
  transition: all 0.3s;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 14px;
}

.path-item:hover {
  color: #4568dc;
  border-color: #4568dc;
  background-color: #e9f1ff;
}

.path-item.root {
  color: #4568dc;
  font-weight: 500;
}

.path-separator {
  color: #cbd5e1;
  margin: 0 2px;
}

.current-folder {
  color: #4568dc;
  font-weight: 600;
  padding: 6px 10px;
  background-color: #e9f1ff;
  border-radius: 6px;
  border: 1px solid #4568dc;
  font-size: 14px;
}

.back-button {
  background-color: white;
  border: 1px solid #e2e8f0;
  color: #64748b;
  cursor: pointer;
  padding: 8px 15px;
  border-radius: 6px;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 5px;
  margin-right: 10px;
  font-weight: 500;
}

.back-button:hover:not(:disabled) {
  color: #4568dc;
  border-color: #4568dc;
  background-color: #e9f1ff;
}

.back-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Klasör Stilleri */
.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #334155;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-title i {
  color: #4568dc;
}

.folders-section, .subfolder-section, .folder-files-section, .files-section {
  padding: 20px;
  border-bottom: 1px solid #f1f5f9;
}

.folders-section:last-child, .subfolder-section:last-child, 
.folder-files-section:last-child, .files-section:last-child {
  border-bottom: none;
}

.folder-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.folder-card {
  background-color: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer;
  border: 1px solid #f1f5f9;
}

.folder-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  border-color: #4568dc;
}

.folder-icon {
  background-color: #e9f1ff;
  color: #4568dc;
  width: 70px;
  height: 70px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 15px;
}

.folder-info {
  text-align: center;
  flex-grow: 1;
}

.folder-name {
  font-size: 16px;
  font-weight: 500;
  margin: 0;
  word-break: break-word;
}

.folder-actions {
  margin-top: 15px;
  width: 100%;
}

.folder-download-btn {
  width: 100%;
  padding: 8px 0;
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

.folder-download-btn:hover {
  background-color: #3b57b5;
}

.folder-title {
  font-size: 20px;
  font-weight: 600;
  color: #334155;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.folder-title i {
  color: #4568dc;
}

.card-header {
  padding: 20px;
  border-bottom: 1px solid #f1f5f9;
}

@media (max-width: 768px) {
  .folder-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
  
  .folder-card {
    padding: 15px;
  }
  
  .folder-icon {
    width: 50px;
    height: 50px;
    font-size: 0.8em;
  }
}

/* Klasör bilgisi (eğer dosya bir klasörde ise) */
.folder-info-badge {
  background-color: #e9f1ff;
  color: #4568dc;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  margin: 0 20px 8px 20px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(69, 104, 220, 0.2);
}

.folder-info-badge i {
  font-size: 10px;
}

/* Dosya kartının pozisyonu için */
.file-card {
  position: relative;
}

/* Koyu mod düzenlemeleri */
.theme-dark .card {
  background-color: #36393f;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

.theme-dark .search-filter-bar {
  background-color: #2f3136;
}

.theme-dark .search-box {
  background-color: #40444b;
  border-color: rgba(255, 255, 255, 0.1);
}

.theme-dark .search-box input {
  color: #ffffff;
}

.theme-dark .search-box input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.theme-dark .favorites-filter, 
.theme-dark .group-by-date-btn, 
.theme-dark .sort-button {
  background-color: #2f3136;
  color: #b9bbbe;
  border-color: rgba(255, 255, 255, 0.1);
}

.theme-dark .favorites-filter:hover, 
.theme-dark .group-by-date-btn:hover, 
.theme-dark .sort-button:hover {
  background-color: #40444b;
}

.theme-dark .favorites-filter.active, 
.theme-dark .group-by-date-btn.active {
  background-color: rgba(114, 137, 218, 0.2);
  color: #7289da;
  border-color: #7289da;
}

.theme-dark .dropdown-content {
  background-color: #36393f;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.1);
}

.theme-dark .dropdown-content button {
  color: #ffffff;
}

.theme-dark .dropdown-content button:hover {
  background-color: #40444b;
}

.theme-dark .dropdown-content button.active {
  background-color: rgba(114, 137, 218, 0.2);
  color: #7289da;
}

.theme-dark .folder-navigation {
  background-color: #2f3136;
  border-color: rgba(255, 255, 255, 0.1);
}

.theme-dark .back-button,
.theme-dark .path-item {
  background-color: #40444b;
  color: #b9bbbe;
  border-color: rgba(255, 255, 255, 0.1);
}

.theme-dark .back-button:hover,
.theme-dark .path-item:hover {
  background-color: #4f545c;
  color: #ffffff;
}

.theme-dark .path-separator {
  color: rgba(255, 255, 255, 0.3);
}

.theme-dark .current-folder {
  color: #7289da;
}

.theme-dark .folder-card {
  background-color: #2f3136;
  border-color: rgba(255, 255, 255, 0.1);
}

.theme-dark .folder-card:hover {
  background-color: #40444b;
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.3);
}

.theme-dark .folder-icon {
  color: #7289da;
}

.theme-dark .file-card {
  background-color: #36393f;
  border-color: rgba(255, 255, 255, 0.1);
}

.theme-dark .file-card:hover {
  background-color: #40444b;
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.3);
}

.theme-dark .file-actions-small button,
.theme-dark .file-actions button {
  background-color: #40444b;
  color: #b9bbbe;
  border-color: rgba(255, 255, 255, 0.1);
}

.theme-dark .file-actions-small button:hover,
.theme-dark .file-actions button:hover {
  background-color: #4f545c;
  color: #ffffff;
}

.theme-dark .file-actions-small button.favorited {
  color: #f04747;
  background-color: rgba(240, 71, 71, 0.2);
}

.theme-dark .section-title {
  color: #ffffff;
}

.theme-dark .file-name {
  color: #ffffff;
}

.theme-dark .file-meta {
  color: #b9bbbe;
}

/* Koyu mod için başlık ve klasör isimlerini düzenleme */
.theme-dark .page-title {
  color: #ffffff;
}

.theme-dark .folder-name {
  color: #ffffff;
}

.theme-dark .section-title {
  color: #ffffff;
}

.theme-dark .folder-title {
  color: #ffffff;
}

.theme-dark .klasörler {
  color: #ffffff;
}
</style> 