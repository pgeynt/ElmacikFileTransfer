# Electron + Vue.js + Node.js Uygulaması

Bu proje, Electron kullanarak masaüstü uygulaması geliştirmek, Vue.js ile modern bir kullanıcı arayüzü oluşturmak ve Node.js ile arka planda işlemler yapmak için bir başlangıç şablonudur.

## Özellikler

- Electron 35+
- Vue.js 3
- Vue Router 4
- Vite ile hızlı geliştirme
- IPC haberleşme örneği (Electron ve Vue arasında)
- Node.js API'larına erişim

## Başlarken

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme modunda çalıştır (sadece Vue UI tarafı)
npm run dev

# Electron ve Vue'yu birlikte çalıştır (tek komutla)
npm run electron:serve

# Üretim için build al
npm run build
```

## Proje Yapısı

- `/electron` - Electron ana süreci ve preload scriptleri
- `/src` - Vue.js uygulaması (renderer süreci)
- `/public` - Statik dosyalar
- `/dist` - Build çıktısı (üretim için) 