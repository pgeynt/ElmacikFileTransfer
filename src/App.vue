<template>
  <MainLayout>
    <router-view></router-view>
  </MainLayout>
</template>

<script>
import MainLayout from './components/layout/MainLayout.vue'

export default {
  name: 'App',
  components: {
    MainLayout
  },
  async mounted() {
    // Uygulama başlarken kaydedilmiş temayı yükle
    if (window.electron) {
      try {
        const savedTheme = await window.electron.getAppTheme();
        if (savedTheme) {
          this.applyThemeToDOM(savedTheme);
        }
      } catch (error) {
        console.error('Tema yüklenirken hata:', error);
      }
    }
  },
  methods: {
    applyThemeToDOM(themeId) {
      // Önceki temaları temizle
      document.body.className = '';
      // Yeni temayı ekle
      document.body.classList.add(`theme-${themeId}`);
    }
  }
}
</script>

<style>
:root {
  /* Tema renk değişkenleri */
  --color-primary: #4568dc;
  --color-primary-rgb: 69, 104, 220;
  --color-primary-dark: #3b57b5;
  --color-primary-light: #6d8eff;
  --color-secondary: #e9f1ff;
  --color-secondary-rgb: 233, 241, 255;
  --color-background: #f8fafc;
  --color-card-bg: #ffffff;
  --color-text: #0f172a;
  --color-text-rgb: 15, 23, 42;
  --color-text-light: #64748b;
  --color-text-light-rgb: 100, 116, 139;
  --color-border: #e2e8f0;
  --color-success: #4CAF50;
  --color-success-rgb: 76, 175, 80;
  --color-success-dark: #3d8b40;
  --color-error: #F44336;
  --color-error-rgb: 244, 67, 54;
  --color-error-dark: #d32f2f;
  --color-warning: #FFC107;
  --color-warning-rgb: 255, 193, 7;
  --color-warning-dark: #b45309;
  --color-info: #2196F3;
  --color-info-rgb: 33, 150, 243;
  --color-info-dark: #0c7cd5;
}

/* Tema spesifik genel stiller */
body {
  background-color: var(--color-background);
  color: var(--color-text);
  transition: background-color 0.3s ease, color 0.3s ease;
}

.page-title {
  color: var(--color-text);
}

.card {
  background-color: var(--color-card-bg);
  border-color: var(--color-border);
}

/* Dark mod için */
body.theme-dark {
  --color-primary: #6d8eff;
  --color-primary-rgb: 109, 142, 255;
  --color-primary-dark: #4568dc;
  --color-primary-light: #93aeff;
  --color-secondary: #1e293b;
  --color-secondary-rgb: 30, 41, 59;
  --color-background: #0f172a;
  --color-card-bg: #1e293b;
  --color-text: #f1f5f9;
  --color-text-rgb: 241, 245, 249;
  --color-text-light: #94a3b8;
  --color-text-light-rgb: 148, 163, 184;
  --color-border: #334155;
  --color-success: #4ade80;
  --color-success-rgb: 74, 222, 128;
  --color-success-dark: #22c55e;
  --color-error: #f87171;
  --color-error-rgb: 248, 113, 113;
  --color-error-dark: #ef4444;
  --color-warning: #facc15;
  --color-warning-rgb: 250, 204, 21;
  --color-warning-dark: #eab308;
  --color-info: #38bdf8;
  --color-info-rgb: 56, 189, 248;
  --color-info-dark: #0ea5e9;
}

/* Cyan mod için */
body.theme-cyan {
  --color-primary: #06b6d4;
  --color-primary-rgb: 6, 182, 212;
  --color-primary-dark: #0891b2;
  --color-primary-light: #22d3ee;
  --color-secondary: #e0faff;
  --color-secondary-rgb: 224, 250, 255;
  --color-background: #f0fdff;
  --color-card-bg: #ffffff;
  --color-text: #0e7490;
  --color-text-rgb: 14, 116, 144;
  --color-text-light: #0891b2;
  --color-text-light-rgb: 8, 145, 178;
  --color-border: #cffafe;
  --color-success: #4ade80;
  --color-success-rgb: 74, 222, 128;
  --color-success-dark: #22c55e;
  --color-error: #f87171;
  --color-error-rgb: 248, 113, 113;
  --color-error-dark: #ef4444;
  --color-warning: #facc15;
  --color-warning-rgb: 250, 204, 21;
  --color-warning-dark: #eab308;
  --color-info: #38bdf8;
  --color-info-rgb: 56, 189, 248;
  --color-info-dark: #0ea5e9;
}

/* Yeşil mod için */
body.theme-green {
  --color-primary: #10b981;
  --color-primary-rgb: 16, 185, 129;
  --color-primary-dark: #059669;
  --color-primary-light: #34d399;
  --color-secondary: #d1fae5;
  --color-secondary-rgb: 209, 250, 229;
  --color-background: #f0fff4;
  --color-card-bg: #ffffff;
  --color-text: #047857;
  --color-text-rgb: 4, 120, 87;
  --color-text-light: #059669;
  --color-text-light-rgb: 5, 150, 105;
  --color-border: #a7f3d0;
  --color-success: #4ade80;
  --color-success-rgb: 74, 222, 128;
  --color-success-dark: #22c55e;
  --color-error: #f87171;
  --color-error-rgb: 248, 113, 113;
  --color-error-dark: #ef4444;
  --color-warning: #facc15;
  --color-warning-rgb: 250, 204, 21;
  --color-warning-dark: #eab308;
  --color-info: #38bdf8;
  --color-info-rgb: 56, 189, 248;
  --color-info-dark: #0ea5e9;
}

/* Mor mod için */
body.theme-purple {
  --color-primary: #8b5cf6;
  --color-primary-rgb: 139, 92, 246;
  --color-primary-dark: #7c3aed;
  --color-primary-light: #a78bfa;
  --color-secondary: #ede9fe;
  --color-secondary-rgb: 237, 233, 254;
  --color-background: #f5f3ff;
  --color-card-bg: #ffffff;
  --color-text: #5b21b6;
  --color-text-rgb: 91, 33, 182;
  --color-text-light: #7c3aed;
  --color-text-light-rgb: 124, 58, 237;
  --color-border: #c4b5fd;
  --color-success: #4ade80;
  --color-success-rgb: 74, 222, 128;
  --color-success-dark: #22c55e;
  --color-error: #f87171;
  --color-error-rgb: 248, 113, 113;
  --color-error-dark: #ef4444;
  --color-warning: #facc15;
  --color-warning-rgb: 250, 204, 21;
  --color-warning-dark: #eab308;
  --color-info: #38bdf8;
  --color-info-rgb: 56, 189, 248;
  --color-info-dark: #0ea5e9;
}

/* Gri mod için */
body.theme-gray {
  --color-primary: #64748b;
  --color-primary-rgb: 100, 116, 139;
  --color-primary-dark: #475569;
  --color-primary-light: #94a3b8;
  --color-secondary: #f1f5f9;
  --color-secondary-rgb: 241, 245, 249;
  --color-background: #f8fafc;
  --color-card-bg: #ffffff;
  --color-text: #334155;
  --color-text-rgb: 51, 65, 85;
  --color-text-light: #64748b;
  --color-text-light-rgb: 100, 116, 139;
  --color-border: #e2e8f0;
  --color-success: #4ade80;
  --color-success-rgb: 74, 222, 128;
  --color-success-dark: #22c55e;
  --color-error: #f87171;
  --color-error-rgb: 248, 113, 113;
  --color-error-dark: #ef4444;
  --color-warning: #facc15;
  --color-warning-rgb: 250, 204, 21;
  --color-warning-dark: #eab308;
  --color-info: #38bdf8;
  --color-info-rgb: 56, 189, 248;
  --color-info-dark: #0ea5e9;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  color: #2c3e50;
  background-color: #f5f7fb;
}

a {
  text-decoration: none;
  color: inherit;
}

h1, h2, h3, h4, h5, h6 {
  font-weight: 600;
}

.page-title {
  margin-bottom: 20px;
  font-size: 24px;
  color: #2c3e50;
}

.card {
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  padding: 20px;
  margin-bottom: 20px;
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  border: none;
  font-weight: 500;
  transition: background-color 0.3s, opacity 0.3s;
}

.btn-primary {
  background-color: #4568dc;
  color: white;
}

.btn-primary:hover {
  background-color: #3b5ac9;
}
</style> 