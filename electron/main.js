const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const AWS = require('aws-sdk');

// AWS yapılandırması
const awsConfig = {
  accessKeyId: 'eAUWqj82L05v2SHDeuNF',
  secretAccessKey: 'Cut7KAWd9Gp9Apg50WJ42lUheOK2FdcZbI75yMT5',
  endpoint: 'https://minio-api.apps.elmacik.com.tr',
  s3ForcePathStyle: true,
  signatureVersion: 'v4'
};

// Yükleme geçmişini saklamak için
let uploadHistory = [];

// Geçmiş verisini kaydetmek için dosya yolu
const historyFilePath = path.join(app.getPath('userData'), 'upload-history.json');

// Geçmiş verisini dosyadan yükle
function loadUploadHistory() {
  try {
    if (fs.existsSync(historyFilePath)) {
      const data = fs.readFileSync(historyFilePath, 'utf8');
      uploadHistory = JSON.parse(data);
    }
  } catch (error) {
    console.error('Geçmiş yüklenirken hata:', error);
    uploadHistory = [];
  }
}

// Geçmiş verisini dosyaya kaydet
function saveUploadHistory() {
  try {
    fs.writeFileSync(historyFilePath, JSON.stringify(uploadHistory), 'utf8');
  } catch (error) {
    console.error('Geçmiş kaydedilirken hata:', error);
  }
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Development veya production moda göre farklı URL'leri yükle
  const startUrl = process.env.NODE_ENV === 'development'
    ? 'http://localhost:5173' // Vite dev server
    : url.format({
        pathname: path.join(__dirname, '../dist/index.html'),
        protocol: 'file:',
        slashes: true
      });

  mainWindow.loadURL(startUrl);

  // Dev tools'u açmak için (geliştirme modunda)
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// IPC haberleşme örneği
ipcMain.on('message', (event, arg) => {
  console.log('Received message from renderer:', arg);
  // Node.js functionality example (process data, use node modules, etc)
  event.reply('message-reply', `Processed by Node.js: ${arg}`);
});

// Dosya diyaloğu açma
ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections']
  });
  
  if (canceled) {
    return null;
  }
  
  // Seçilen dosyaların bilgilerini topla
  const filesInfo = await Promise.all(
    filePaths.map(async (filePath) => {
      const stats = fs.statSync(filePath);
      const fileExtension = path.extname(filePath).toLowerCase();
      const name = path.basename(filePath);
      
      return {
        name: name,
        path: filePath,
        size: stats.size,
        type: fileExtension,
        lastModified: stats.mtime
      };
    })
  );
  
  return filesInfo;
});

// Dosya okuma
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content;
  } catch (error) {
    return null;
  }
});

// Dosya kaydetme
ipcMain.handle('save-file', async (event, { filePath, content }) => {
  try {
    fs.writeFileSync(filePath, content);
    return true;
  } catch (error) {
    return false;
  }
});

// Yükleme kuyruğu
let uploadQueue = [];
let isUploading = false;

// Yükleme durumu izleme
ipcMain.on('add-to-upload-queue', (event, filePath) => {
  // Dosyayı kuyruğa ekle
  uploadQueue.push({
    filePath,
    status: 'pending', // 'pending', 'uploading', 'completed', 'error'
    addedAt: new Date()
  });
  
  // Kuyruk durumunu gönder
  mainWindow.webContents.send('upload-queue-updated', getQueueStatus());
  
  // Eğer aktif yükleme yoksa, sıradaki dosyayı yüklemeye başla
  if (!isUploading) {
    processNextInQueue();
  }
});

// Kuyruk durumunu al
function getQueueStatus() {
  return {
    queue: uploadQueue,
    isUploading: isUploading
  };
}

// Kuyruk durumunu istemciye gönder
ipcMain.handle('get-upload-queue', () => {
  return getQueueStatus();
});

// Sonraki dosyayı yükle
async function processNextInQueue() {
  if (uploadQueue.length === 0 || isUploading) {
    return;
  }
  
  isUploading = true;
  
  // Kuyruktaki ilk dosyayı al
  const currentUpload = uploadQueue[0];
  currentUpload.status = 'uploading';
  
  // Durum güncellemesini bildir
  mainWindow.webContents.send('upload-queue-updated', getQueueStatus());
  
  try {
    // S3'e yükle
    const result = await uploadFileToS3(currentUpload.filePath);
    
    // Sonucu güncelle
    if (result.success) {
      currentUpload.status = 'completed';
      currentUpload.result = result;
    } else {
      currentUpload.status = 'error';
      currentUpload.error = result.message;
    }
    
    // Geçmişe ekle (hem başarılı hem başarısız)
    addToUploadHistory(currentUpload, result);
    
    // Sonucu bildir
    mainWindow.webContents.send('upload-completed', {
      filePath: currentUpload.filePath,
      success: result.success,
      message: result.message,
      data: result.success ? result.data : null
    });
  } catch (error) {
    console.error('Kuyruk yükleme hatası:', error);
    currentUpload.status = 'error';
    currentUpload.error = error.message;
    
    // Hata durumunu bildir
    mainWindow.webContents.send('upload-completed', {
      filePath: currentUpload.filePath,
      success: false,
      message: `Yükleme hatası: ${error.message}`
    });
    
    // Geçmişe ekle
    addToUploadHistory(currentUpload, {
      success: false,
      message: `Yükleme hatası: ${error.message}`
    });
  } finally {
    // Tamamlanan dosyayı kuyruktan çıkar
    uploadQueue.shift();
    isUploading = false;
    
    // Durum güncellemesini bildir
    mainWindow.webContents.send('upload-queue-updated', getQueueStatus());
    
    // Kuyrukta başka dosya varsa işleme devam et
    if (uploadQueue.length > 0) {
      processNextInQueue();
    }
  }
}

// Geçmişe başarısız yüklemeleri de ekle
function addToUploadHistory(uploadItem, result) {
  // Upload history içerisine başarı durumunu ekleyerek kaydet
  try {
    const filePath = uploadItem.filePath;
    const fileName = path.basename(filePath);
    const stats = fs.statSync(filePath);
    const fileExtension = path.extname(filePath).toLowerCase();
    
    const historyItem = {
      id: Date.now().toString(),
      name: fileName,
      size: stats.size,
      type: fileExtension,
      uploadDate: new Date().toISOString(),
      success: result.success, // Başarı durumu
      errorMessage: result.success ? null : result.message // Hata mesajı
    };
    
    // Eğer başarılı ise S3 bilgilerini ekle
    if (result.success && result.data) {
      historyItem.s3Location = result.data.Location;
      historyItem.s3Key = result.data.Key;
    }
    
    uploadHistory.unshift(historyItem);
    saveUploadHistory();
  } catch (error) {
    console.error('Geçmiş kaydedilirken hata:', error);
  }
}

// S3'e dosya yükleme fonksiyonu (tekrar kullanılabilir)
async function uploadFileToS3(filePath) {
  try {
    // AWS S3 istemcisini MinIO ayarlarıyla yapılandır
    const s3 = new AWS.S3(awsConfig);

    const fileContent = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);

    const params = {
      Bucket: 'elmacikbucket',    // Mevcut MinIO bucket adınız
      Key: `${Date.now()}-${fileName}`, // Benzersiz isimlendirme
      Body: fileContent
    };

    const uploadResult = await s3.upload(params).promise();

    return {
      success: true,
      message: 'Dosya başarıyla yüklendi',
      data: uploadResult
    };
  } catch (error) {
    console.error('S3 yükleme hatası:', error);
    return {
      success: false,
      message: `Yükleme hatası: ${error.message}`,
      error: error
    };
  }
}


// S3'e dosya yükleme (eski metot - kuyruk kullanmayanlar için)
ipcMain.handle('upload-to-s3', async (event, filePath) => {
  // Doğrudan yükleme API'sini çağır
  return await uploadFileToS3(filePath);
});

// Yükleme geçmişini al
ipcMain.handle('get-upload-history', async () => {
  return uploadHistory;
});

// S3 istemcisi oluşturma fonksiyonu (tekrarlı kullanım için)
function createS3Client() {
  return new AWS.S3(awsConfig);
}

// S3 bucket'tan tüm dosyaları listele
ipcMain.handle('list-s3-files', async () => {
  try {
    const s3 = createS3Client();
    
    const params = {
      Bucket: 'elmacikbucket'
    };
    
    const data = await s3.listObjectsV2(params).promise();
    
    // Favorileri yerel depolamadan al
    let favorites = [];
    try {
      const favoritesPath = path.join(app.getPath('userData'), 'favorites.json');
      if (fs.existsSync(favoritesPath)) {
        favorites = JSON.parse(fs.readFileSync(favoritesPath, 'utf8'));
      }
    } catch (error) {
      console.error('Favori dosyaları yüklenirken hata:', error);
    }
    
    // Dosya listesini daha kullanışlı bir formata dönüştür
    const files = data.Contents.map(item => {
      const fileName = item.Key.split('/').pop();
      const fileExtension = path.extname(fileName).toLowerCase();
      const lastModified = item.LastModified;
      const size = item.Size;
      
      // Dosya favorilerde mi kontrol et
      const isFavorite = favorites.includes(item.Key);
      
      return {
        key: item.Key,
        name: fileName,
        type: fileExtension,
        lastModified: lastModified,
        size: size,
        isFavorite: isFavorite
      };
    });
    
    return {
      success: true,
      files: files
    };
  } catch (error) {
    console.error('S3 dosyaları listelenirken hata:', error);
    return {
      success: false,
      message: `Hata: ${error.message}`,
      files: []
    };
  }
});

// S3'ten dosya indir
ipcMain.handle('download-s3-file', async (event, { key, name }) => {
  try {
    const s3 = createS3Client();
    
    const params = {
      Bucket: 'elmacikbucket',
      Key: key
    };
    
    // İndirme için kullanıcıdan klasör seç
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Dosyayı kaydetmek için klasör seçin'
    });
    
    if (canceled) {
      return {
        success: false,
        message: 'İndirme işlemi iptal edildi'
      };
    }
    
    // Hedef dosya yolu
    const targetPath = path.join(filePaths[0], name);
    
    // Dosyayı S3'ten al
    const data = await s3.getObject(params).promise();
    
    // Dosyayı yerel olarak kaydet
    fs.writeFileSync(targetPath, data.Body);
    
    return {
      success: true,
      message: `${name} dosyası başarıyla indirildi`,
      path: targetPath
    };
  } catch (error) {
    console.error('S3 dosyası indirilirken hata:', error);
    return {
      success: false,
      message: `İndirme hatası: ${error.message}`
    };
  }
});

// Favori dosyaları kaydet/kaldır
ipcMain.handle('toggle-favorite', async (event, key) => {
  try {
    const favoritesPath = path.join(app.getPath('userData'), 'favorites.json');
    let favorites = [];
    
    // Mevcut favorileri yükle
    if (fs.existsSync(favoritesPath)) {
      favorites = JSON.parse(fs.readFileSync(favoritesPath, 'utf8'));
    }
    
    // Favoriye ekle veya çıkar
    const index = favorites.indexOf(key);
    if (index === -1) {
      favorites.push(key);
    } else {
      favorites.splice(index, 1);
    }
    
    // Favorileri kaydet
    fs.writeFileSync(favoritesPath, JSON.stringify(favorites), 'utf8');
    
    return {
      success: true,
      isFavorite: index === -1, // Eğer önceden favori değilse, şimdi favori
      favorites: favorites
    };
  } catch (error) {
    console.error('Favori işlemi sırasında hata:', error);
    return {
      success: false,
      message: `Favori işlemi hatası: ${error.message}`
    };
  }
});

// Yükleme geçmişinden kayıt silme
ipcMain.handle('delete-history-item', async (event, id) => {
  try {
    // ID'ye göre kayıt ara ve sil
    const index = uploadHistory.findIndex(item => item.id === id);
    
    if (index !== -1) {
      // Kayıt varsa sil
      uploadHistory.splice(index, 1);
      
      // Güncel geçmişi kaydet
      saveUploadHistory();
      
      return {
        success: true,
        message: 'Geçmiş kaydı başarıyla silindi'
      };
    } else {
      return {
        success: false,
        message: 'Belirtilen geçmiş kaydı bulunamadı'
      };
    }
  } catch (error) {
    console.error('Geçmiş kaydı silinirken hata:', error);
    return {
      success: false,
      message: `Silme hatası: ${error.message}`
    };
  }
});

// S3'ten dosya içeriğini getir ve önizle
ipcMain.handle('preview-s3-file', async (event, { key, type }) => {
  try {
    const s3 = createS3Client();
    
    const params = {
      Bucket: 'elmacikbucket',
      Key: key
    };
    
    // Dosyayı S3'ten al
    const data = await s3.getObject(params).promise();
    
    // Excel dosyaları için içerik işleme
    if (type === '.xlsx' || type === '.xls') {
      // Excel verisi olarak döndür, frontend'de işlenecek
      return {
        success: true,
        contentType: 'excel',
        data: data.Body.toString('base64'),
        fileName: key.split('/').pop() // Dosya adını al
      };
    }
    // CSV dosyaları için
    else if (type === '.csv') {
      return {
        success: true,
        contentType: 'csv',
        data: data.Body.toString('utf-8'),
        fileName: key.split('/').pop()
      };
    }
    // PDF dosyaları için
    else if (type === '.pdf') {
      return {
        success: true,
        contentType: 'pdf',
        data: data.Body.toString('base64'),
        fileName: key.split('/').pop()
      };
    }
    // Metin dosyaları için
    else if (['.txt', '.json', '.xml', '.html', '.css', '.js'].includes(type)) {
      return {
        success: true,
        contentType: 'text',
        data: data.Body.toString('utf-8'),
        fileName: key.split('/').pop()
      };
    }
    // Resim dosyaları için
    else if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(type)) {
      return {
        success: true,
        contentType: 'image',
        data: data.Body.toString('base64'),
        fileName: key.split('/').pop()
      };
    }
    // Diğer dosya türleri için
    else {
      return {
        success: false,
        message: 'Bu dosya türü önizleme için desteklenmiyor'
      };
    }
  } catch (error) {
    console.error('S3 dosya önizleme hatası:', error);
    return {
      success: false,
      message: `Önizleme hatası: ${error.message}`
    };
  }
});

// S3 dosyası için paylaşılabilir link oluştur
ipcMain.handle('generate-share-link', async (event, { key, name, expiration = 24 }) => {
  try {
    const s3 = createS3Client();
    
    // URL süresi (saat cinsinden) - varsayılan 24 saat
    const expirationSeconds = expiration * 60 * 60;
    
    const params = {
      Bucket: 'elmacikbucket',
      Key: key,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(name)}"`,
      Expires: expirationSeconds // URL'nin geçerlilik süresi (saniye cinsinden)
    };
    
    // Geçici paylaşım URL'si oluştur
    const url = await s3.getSignedUrlPromise('getObject', params);
    
    return {
      success: true,
      url: url,
      message: `${name} için ${expiration} saatlik paylaşım linki oluşturuldu`,
      expiration: new Date(Date.now() + expirationSeconds * 1000).toISOString()
    };
  } catch (error) {
    console.error('Paylaşım linki oluşturma hatası:', error);
    return {
      success: false,
      message: `Paylaşım linki oluşturma hatası: ${error.message}`
    };
  }
});

// Uygulama başladığında geçmişi yükle
app.on('ready', () => {
  createWindow();
  loadUploadHistory();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
}); 