// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Vue uygulaması ve Electron/Node.js arasında köprü oluştur
contextBridge.exposeInMainWorld('electron', {
  sendMessage: (message) => {
    ipcRenderer.send('message', message);
  },
  onMessage: (callback) => {
    ipcRenderer.on('message-reply', (event, arg) => {
      callback(arg);
    });
  },
  // Dosya işlemleri için yeni metodlar
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (fileData) => ipcRenderer.invoke('save-file', fileData),
  getFileIcon: (filePath) => ipcRenderer.invoke('get-file-icon', filePath),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  // AWS S3 dosya yükleme işlemi
  uploadToS3: (filePath) => ipcRenderer.invoke('upload-to-s3', filePath),
  // Yükleme kuyruğu işlemleri
  addToUploadQueue: (filePath) => ipcRenderer.send('add-to-upload-queue', filePath),
  getUploadQueue: () => ipcRenderer.invoke('get-upload-queue'),
  onUploadQueueUpdated: (callback) => {
    ipcRenderer.on('upload-queue-updated', (event, arg) => {
      callback(arg);
    });
  },
  onUploadCompleted: (callback) => {
    ipcRenderer.on('upload-completed', (event, arg) => {
      callback(arg);
    });
  },
  // Klasör işlemleri için yeni fonksiyonlar
  uploadFolder: (folderData) => ipcRenderer.invoke('upload-folder', folderData),
  createS3Folder: (folderName) => ipcRenderer.invoke('create-s3-folder', folderName),
  listS3Folders: () => ipcRenderer.invoke('list-s3-folders'),
  deleteS3Folder: (folderKey) => ipcRenderer.invoke('delete-s3-folder', folderKey),
  // Yükleme geçmişi işlemleri
  getUploadHistory: () => ipcRenderer.invoke('get-upload-history'),
  deleteHistoryItem: (id) => ipcRenderer.invoke('delete-history-item', id),
  // S3 Dosya Kontrolü
  checkFileExistsInS3: (key) => ipcRenderer.invoke('check-file-exists-in-s3', key),
  // S3 Dosya Listesi ve İndirme İşlemleri
  listS3Files: () => ipcRenderer.invoke('list-s3-files'),
  downloadS3File: (fileInfo) => ipcRenderer.invoke('download-s3-file', fileInfo),
  previewS3File: (fileInfo) => ipcRenderer.invoke('preview-s3-file', fileInfo),
  generateShareLink: (fileInfo) => ipcRenderer.invoke('generate-share-link', fileInfo),
  toggleFavorite: (key) => ipcRenderer.invoke('toggle-favorite', key),
  // S3 Dosya Yönetimi için Yeni Metodlar
  renameS3File: (fileInfo) => ipcRenderer.invoke('rename-s3-file', fileInfo),
  deleteS3File: (fileInfo) => ipcRenderer.invoke('delete-s3-file', fileInfo),
  // S3 Klasör İşlemleri
  listS3FolderContents: (folderKey) => ipcRenderer.invoke('list-s3-folder-contents', folderKey),
  downloadS3Folder: (folderInfo) => ipcRenderer.invoke('download-s3-folder', folderInfo),
  // Tema Ayarları
  getAppTheme: () => ipcRenderer.invoke('get-app-theme'),
  setAppTheme: (themeId) => ipcRenderer.invoke('set-app-theme', themeId)
}); 