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
  // Yükleme geçmişi işlemleri
  getUploadHistory: () => ipcRenderer.invoke('get-upload-history'),
  deleteHistoryItem: (id) => ipcRenderer.invoke('delete-history-item', id),
  // S3 Dosya Listesi ve İndirme İşlemleri
  listS3Files: () => ipcRenderer.invoke('list-s3-files'),
  downloadS3File: (fileInfo) => ipcRenderer.invoke('download-s3-file', fileInfo),
  previewS3File: (fileInfo) => ipcRenderer.invoke('preview-s3-file', fileInfo),
  generateShareLink: (fileInfo) => ipcRenderer.invoke('generate-share-link', fileInfo),
  toggleFavorite: (key) => ipcRenderer.invoke('toggle-favorite', key)
}); 