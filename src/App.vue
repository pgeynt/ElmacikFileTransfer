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
  }
}
</script>

<style>
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