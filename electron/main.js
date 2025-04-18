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
  try {
    // S3 durumlarını kontrol et
    await checkS3FileExistence();
    return uploadHistory;
  } catch (error) {
    console.error('Geçmiş yüklenirken hata:', error);
    return uploadHistory;
  }
});

// S3'teki dosyaların varlığını kontrol et ve geçmişi güncelle
async function checkS3FileExistence() {
  try {
    const s3 = createS3Client();
    
    // Sadece başarılı yüklenen ve S3 anahtarı olan dosyaları kontrol et
    const itemsToCheck = uploadHistory.filter(item => item.success && item.s3Key);
    
    // Dosyaların S3'teki varlığını kontrol et
    for (const item of itemsToCheck) {
      try {
        const params = {
          Bucket: 'elmacikbucket',
          Key: item.s3Key
        };
        
        // head metodu ile dosyanın varlığını kontrol et
        await s3.headObject(params).promise();
        
        // Dosya S3'te hala varsa
        item.existsInStorage = true;
      } catch (err) {
        // Dosya S3'te yoksa
        if (err.code === 'NotFound') {
          item.existsInStorage = false;
        } else {
          console.error(`Dosya durumu kontrol edilirken hata: ${err.message}`);
          // Hata durumunda var olduğunu varsayalım
          item.existsInStorage = true;
        }
      }
    }
    
    // Geçmiş verisini güncelle
    saveUploadHistory();
  } catch (error) {
    console.error('S3 dosya varlığı kontrolünde hata:', error);
  }
}

// S3 istemcisi oluşturma fonksiyonu (tekrarlı kullanım için)
function createS3Client() {
  return new AWS.S3(awsConfig);
}

// S3'te klasör oluşturma (klasörler S3'te aslında içi boş nesnelerdir)
async function createS3FolderObject(folderName) {
  try {
    const s3 = createS3Client();
    
    const folderKey = `${folderName}/`;  // Klasör adından sonra / karakteri ekleyerek klasör olduğunu belirtiyoruz
    
    const params = {
      Bucket: 'elmacikbucket',
      Key: folderKey,
      Body: '' // Boş içerik
    };
    
    const result = await s3.putObject(params).promise();
    
    return {
      success: true,
      message: `${folderName} klasörü oluşturuldu`,
      key: folderKey,
      data: result
    };
  } catch (error) {
    console.error('S3 klasör oluşturma hatası:', error);
    return {
      success: false,
      message: `Klasör oluşturma hatası: ${error.message}`
    };
  }
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
    // Video dosyaları için
    else if (['.mp4', '.webm', '.ogg', '.mov', '.avi'].includes(type)) {
      return {
        success: true,
        contentType: 'video',
        data: data.Body.toString('base64'),
        fileName: key.split('/').pop()
      };
    }
    // Ses dosyaları için
    else if (['.mp3', '.wav', '.ogg', '.flac', '.aac'].includes(type)) {
      return {
        success: true,
        contentType: 'audio',
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

// S3'ten dosya sil
ipcMain.handle('delete-s3-file', async (event, { key }) => {
  try {
    const s3 = createS3Client();
    
    const params = {
      Bucket: 'elmacikbucket',
      Key: key
    };
    
    // S3'ten dosyayı sil
    await s3.deleteObject(params).promise();
    
    // Geçmiş kaydını güncelle (dosya silinmiş olarak işaretle veya sil)
    const historyIndex = uploadHistory.findIndex(item => item.s3Key === key);
    if (historyIndex !== -1) {
      uploadHistory.splice(historyIndex, 1);
      saveUploadHistory();
    }
    
    // Favorilerden de kaldır (eğer favoride ise)
    try {
      const favoritesPath = path.join(app.getPath('userData'), 'favorites.json');
      if (fs.existsSync(favoritesPath)) {
        let favorites = JSON.parse(fs.readFileSync(favoritesPath, 'utf8'));
        const index = favorites.indexOf(key);
        if (index !== -1) {
          favorites.splice(index, 1);
          fs.writeFileSync(favoritesPath, JSON.stringify(favorites), 'utf8');
        }
      }
    } catch (error) {
      console.error('Favorilerden kaldırma hatası:', error);
    }
    
    return {
      success: true,
      message: 'Dosya başarıyla silindi'
    };
  } catch (error) {
    console.error('S3 dosya silme hatası:', error);
    return {
      success: false,
      message: `Silme hatası: ${error.message}`
    };
  }
});

// S3 dosyasını yeniden adlandır
ipcMain.handle('rename-s3-file', async (event, { key, newName }) => {
  try {
    const s3 = createS3Client();
    
    // Dosya uzantısını koru
    const oldName = key.split('/').pop();
    const extension = path.extname(oldName);
    
    // Yeni adda uzantı yoksa ekle
    let adjustedNewName = newName;
    if (!path.extname(adjustedNewName)) {
      adjustedNewName += extension;
    }
    
    // Dosyanın yeni anahtarını oluştur (klasör yapısını koru)
    const folderPath = key.substring(0, key.lastIndexOf('/') + 1);
    const newKey = folderPath + adjustedNewName;
    
    // Kopya oluştur (AWS S3'te yeniden adlandırma işlevi olmadığı için kopyala-sil yöntemi)
    const copyParams = {
      Bucket: 'elmacikbucket',
      CopySource: `elmacikbucket/${key}`,
      Key: newKey
    };
    
    await s3.copyObject(copyParams).promise();
    
    // Orijinal dosyayı sil
    const deleteParams = {
      Bucket: 'elmacikbucket',
      Key: key
    };
    
    await s3.deleteObject(deleteParams).promise();
    
    // Yeni dosya için imzalı URL oluştur
    const signedUrl = await s3.getSignedUrlPromise('getObject', {
      Bucket: 'elmacikbucket',
      Key: newKey,
      Expires: 60 * 60 * 24 * 7 // 7 gün geçerli
    });
    
    // Geçmiş kaydını güncelle
    let updated = false;
    for (let item of uploadHistory) {
      if (item.s3Key === key) {
        item.name = adjustedNewName;
        item.s3Key = newKey;
        item.s3Location = signedUrl;
        updated = true;
      }
    }
    
    if (updated) {
      saveUploadHistory();
    }
    
    // Favorileri güncelle (eğer bu dosya favorilerdeyse)
    try {
      const favoritesPath = path.join(app.getPath('userData'), 'favorites.json');
      if (fs.existsSync(favoritesPath)) {
        let favorites = JSON.parse(fs.readFileSync(favoritesPath, 'utf8'));
        const index = favorites.indexOf(key);
        if (index !== -1) {
          favorites[index] = newKey;
          fs.writeFileSync(favoritesPath, JSON.stringify(favorites), 'utf8');
        }
      }
    } catch (error) {
      console.error('Favorileri güncelleme hatası:', error);
    }
    
    return {
      success: true,
      message: 'Dosya adı başarıyla değiştirildi',
      newKey: newKey,
      newLocation: signedUrl
    };
  } catch (error) {
    console.error('S3 dosya adı değiştirme hatası:', error);
    return {
      success: false,
      message: `Yeniden adlandırma hatası: ${error.message}`
    };
  }
});

// S3'te dosya var mı kontrol et
ipcMain.handle('check-file-exists-in-s3', async (event, key) => {
  try {
    const s3 = createS3Client();
    
    const params = {
      Bucket: 'elmacikbucket',
      Key: key
    };
    
    try {
      // head metodu ile dosyanın varlığını kontrol et
      await s3.headObject(params).promise();
      return { exists: true };
    } catch (err) {
      if (err.code === 'NotFound') {
        return { exists: false };
      } else {
        console.error(`S3 dosya kontrolünde hata: ${err.message}`);
        throw err;
      }
    }
  } catch (error) {
    console.error('S3 dosya varlığı kontrolünde hata:', error);
    return { exists: false, error: error.message };
  }
});

// S3 klasör oluşturma
ipcMain.handle('create-s3-folder', async (event, folderName) => {
  try {
    return await createS3FolderObject(folderName);
  } catch (error) {
    console.error('S3 klasör oluşturma hatası:', error);
    return { 
      success: false, 
      message: `Klasör oluşturma hatası: ${error.message}` 
    };
  }
});

// Klasör yükleme (birden fazla dosyayı bir klasör altında yükleme)
ipcMain.handle('upload-folder', async (event, folderData) => {
  try {
    const s3 = createS3Client();
    const folderName = folderData.name;
    const files = folderData.files;
    
    // Önce klasörü oluştur
    const folderResult = await createS3FolderObject(folderName);
    
    if (!folderResult.success) {
      return folderResult;
    }
    
    // Sonuçları takip etmek için
    const results = {
      success: true,
      folderKey: folderResult.key,
      uploadedFiles: [],
      failedFiles: [],
      message: ''
    };
    
    // Dosyaları tek tek yükle
    for (const file of files) {
      try {
        const fileContent = fs.readFileSync(file.path);
        const fileName = path.basename(file.path);
        
        const params = {
          Bucket: 'elmacikbucket',
          Key: `${folderName}/${fileName}`, // Klasör içinde dosya
          Body: fileContent
        };
        
        const uploadResult = await s3.upload(params).promise();
        
        // Başarılı yüklemeyi kaydet
        results.uploadedFiles.push({
          name: fileName,
          s3Key: uploadResult.Key,
          location: uploadResult.Location
        });
        
        // Yükleme geçmişine ekle
        addToUploadHistory(
          {
            filePath: file.path,
            status: 'completed'
          }, 
          {
            success: true,
            message: 'Dosya klasör içinde başarıyla yüklendi',
            data: uploadResult
          }
        );
      } catch (error) {
        console.error(`${file.name} dosyası yüklenirken hata:`, error);
        
        // Başarısız yüklemeyi kaydet
        results.failedFiles.push({
          name: file.name,
          error: error.message
        });
        
        // Yükleme geçmişine hatayı ekle
        addToUploadHistory(
          {
            filePath: file.path,
            status: 'error'
          }, 
          {
            success: false,
            message: `Yükleme hatası: ${error.message}`
          }
        );
      }
    }
    
    // Sonuç mesajını oluştur
    if (results.failedFiles.length === 0) {
      results.message = `${folderName} klasörü ve içindeki ${results.uploadedFiles.length} dosya başarıyla yüklendi`;
    } else if (results.uploadedFiles.length === 0) {
      results.success = false;
      results.message = `${folderName} klasörü oluşturuldu fakat hiçbir dosya yüklenemedi`;
    } else {
      results.success = true; // En az bir dosya yüklendiyse başarılı sayıyoruz
      results.message = `${folderName} klasörü oluşturuldu. ${results.uploadedFiles.length} dosya yüklendi, ${results.failedFiles.length} dosya yüklenemedi`;
    }
    
    return results;
  } catch (error) {
    console.error('Klasör yükleme hatası:', error);
    return { 
      success: false, 
      message: `Klasör yükleme hatası: ${error.message}` 
    };
  }
});

// S3'teki klasörleri listele
ipcMain.handle('list-s3-folders', async () => {
  try {
    const s3 = createS3Client();
    
    const params = {
      Bucket: 'elmacikbucket',
      Delimiter: '/' // Klasörleri bulmak için
    };
    
    const data = await s3.listObjectsV2(params).promise();
    
    // CommonPrefixes klasörleri temsil eder
    const folders = data.CommonPrefixes ? data.CommonPrefixes.map(prefix => {
      // Prefix sonundaki / karakterini kaldır
      const folderName = prefix.Prefix.replace(/\/$/, '');
      
      return {
        name: folderName,
        key: prefix.Prefix
      };
    }) : [];
    
    return {
      success: true,
      folders: folders
    };
  } catch (error) {
    console.error('S3 klasörleri listelenirken hata:', error);
    return {
      success: false,
      message: `Klasörleri listeleme hatası: ${error.message}`,
      folders: []
    };
  }
});

// Klasör içeriğini listeleme
ipcMain.handle('list-s3-folder-contents', async (event, folderKey) => {
  try {
    const s3 = createS3Client();
    
    const params = {
      Bucket: 'elmacikbucket',
      Prefix: folderKey // Klasör ön eki (klasör yolu)
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
    
    // Klasör içindeki dosyaları filtrele (klasör nesnesinin kendisini ve alt klasörleri hariç tut)
    const files = data.Contents
      .filter(item => {
        // Klasör nesnesinin kendisini hariç tut (sondaki / ile biten)
        if (item.Key === folderKey) return false;
        
        // Alt klasörleri hariç tut (ek / içerenler)
        const keyWithoutPrefix = item.Key.substring(folderKey.length);
        return !keyWithoutPrefix.includes('/');
      })
      .map(item => {
        const fileName = item.Key.split('/').pop();
        const fileExtension = path.extname(fileName).toLowerCase();
        
        // Dosya favorilerde mi kontrol et
        const isFavorite = favorites.includes(item.Key);
        
        return {
          key: item.Key,
          name: fileName,
          type: fileExtension,
          lastModified: item.LastModified,
          size: item.Size,
          isFavorite: isFavorite
        };
      });
    
    // Alt klasörleri bul (CommonPrefixes içinde)
    let subfolders = [];
    
    // Ek bir sorgu ile alt klasörleri bulalım
    try {
      const subfoldersParams = {
        Bucket: 'elmacikbucket',
        Prefix: folderKey,
        Delimiter: '/'
      };
      
      const subfoldersData = await s3.listObjectsV2(subfoldersParams).promise();
      
      if (subfoldersData.CommonPrefixes && subfoldersData.CommonPrefixes.length > 0) {
        subfolders = subfoldersData.CommonPrefixes.map(prefix => {
          // Ana klasör hariç alt klasörleri ekle
          if (prefix.Prefix !== folderKey) {
            const folderName = prefix.Prefix.split('/').filter(p => p).pop();
            
            return {
              key: prefix.Prefix,
              name: folderName,
              isFolder: true,
              lastModified: new Date(), // Klasörler için varsayılan tarih
              size: 0
            };
          }
        }).filter(f => f); // undefined olanları filtrele
      }
    } catch (error) {
      console.error('Alt klasörleri bulma hatası:', error);
    }
    
    return {
      success: true,
      folderKey: folderKey,
      folderName: folderKey.split('/').filter(p => p).pop(),
      files: files,
      subfolders: subfolders
    };
  } catch (error) {
    console.error('Klasör içeriği listelenirken hata:', error);
    return {
      success: false,
      message: `Klasör içeriği listeleme hatası: ${error.message}`
    };
  }
});

// S3'ten klasör indir
ipcMain.handle('download-s3-folder', async (event, folderInfo) => {
  try {
    const s3 = createS3Client();
    
    // Kullanıcıdan klasörü kaydetmek için yer seç
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Klasörü kaydetmek için konum seçin'
    });
    
    if (canceled) {
      return {
        success: false,
        message: 'İndirme işlemi iptal edildi'
      };
    }
    
    // Klasör içindeki dosyaları listele
    const params = {
      Bucket: 'elmacikbucket',
      Prefix: folderInfo.key
    };
    
    const data = await s3.listObjectsV2(params).promise();
    
    if (data.Contents.length === 0) {
      return {
        success: false,
        message: 'Klasör boş'
      };
    }
    
    // İndirme sonuçlarını sakla
    const results = {
      success: true,
      downloadedFiles: [],
      failedFiles: [],
      folderPath: ''
    };
    
    // Hedef klasörü oluştur
    const folderName = folderInfo.name || folderInfo.key.split('/').filter(p => p).pop();
    const targetFolderPath = path.join(filePaths[0], folderName);
    
    results.folderPath = targetFolderPath;
    
    // Klasörü oluştur (yoksa)
    if (!fs.existsSync(targetFolderPath)) {
      fs.mkdirSync(targetFolderPath, { recursive: true });
    }
    
    // Her dosyayı indir
    for (const item of data.Contents) {
      // Klasör nesnesinin kendisini atlayalım
      if (item.Key === folderInfo.key) continue;
      
      try {
        // Dosya yolunu al
        const relativePath = item.Key.substring(folderInfo.key.length);
        
        // Dosya adı / içeriyorsa alt klasörde demektir
        if (relativePath.includes('/')) {
          // Alt klasör yolu oluştur
          const subfolderPath = path.join(targetFolderPath, path.dirname(relativePath));
          
          // Alt klasör yoksa oluştur
          if (!fs.existsSync(subfolderPath)) {
            fs.mkdirSync(subfolderPath, { recursive: true });
          }
        }
        
        // Dosyayı indir
        const fileParams = {
          Bucket: 'elmacikbucket',
          Key: item.Key
        };
        
        const fileData = await s3.getObject(fileParams).promise();
        
        // Dosya adını al
        const fileName = item.Key.split('/').pop();
        
        // Dosyayı kaydet
        const filePath = path.join(targetFolderPath, relativePath);
        fs.writeFileSync(filePath, fileData.Body);
        
        // Başarılı indirmeyi kaydet
        results.downloadedFiles.push({
          key: item.Key,
          name: fileName,
          path: filePath
        });
      } catch (error) {
        console.error(`${item.Key} indirilirken hata:`, error);
        
        // Hatalı indirmeyi kaydet
        results.failedFiles.push({
          key: item.Key,
          name: item.Key.split('/').pop(),
          error: error.message
        });
      }
    }
    
    // Sonuç mesajını oluştur
    if (results.failedFiles.length === 0) {
      results.message = `${folderName} klasörü ve içindeki ${results.downloadedFiles.length} dosya başarıyla indirildi`;
    } else if (results.downloadedFiles.length === 0) {
      results.success = false;
      results.message = `Hiçbir dosya indirilemedi`;
    } else {
      results.success = true; // En az bir dosya indirildiyse başarılı sayıyoruz
      results.message = `${results.downloadedFiles.length} dosya indirildi, ${results.failedFiles.length} dosya indirilemedi`;
    }
    
    return results;
  } catch (error) {
    console.error('Klasör indirme hatası:', error);
    return {
      success: false,
      message: `İndirme hatası: ${error.message}`
    };
  }
});

// S3'ten klasör sil (klasör ve içindeki tüm dosyalar)
ipcMain.handle('delete-s3-folder', async (event, folderKey) => {
  try {
    const s3 = createS3Client();
    
    // Önce klasördeki tüm dosyaları listele
    const listParams = {
      Bucket: 'elmacikbucket',
      Prefix: folderKey // Klasör altındaki tüm dosyaları bul
    };
    
    const listedObjects = await s3.listObjectsV2(listParams).promise();
    
    if (listedObjects.Contents.length === 0) {
      return {
        success: false,
        message: 'Klasör boş veya bulunamadı'
      };
    }
    
    // Silinecek nesneleri hazırla
    const deleteParams = {
      Bucket: 'elmacikbucket',
      Delete: {
        Objects: listedObjects.Contents.map(({ Key }) => ({ Key })),
        Quiet: false
      }
    };
    
    // Nesneleri sil
    const deleteResult = await s3.deleteObjects(deleteParams).promise();
    
    // Sonuç dön
    return {
      success: true,
      message: `${folderKey} klasörü ve içindeki ${deleteResult.Deleted.length} dosya silindi`,
      deleted: deleteResult.Deleted
    };
  } catch (error) {
    console.error('S3 klasör silme hatası:', error);
    return {
      success: false,
      message: `Klasör silme hatası: ${error.message}`
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