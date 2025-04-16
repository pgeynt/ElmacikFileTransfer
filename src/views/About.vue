<template>
  <div class="about">
    <h1>Hakkında Sayfası</h1>
    <p>Bu uygulama Electron, Vue.js ve Node.js kullanılarak geliştirilmiştir.</p>
    <p>
      <router-link to="/">Ana Sayfaya Dön</router-link>
    </p>
  </div>
</template>

<script>
export default {
  name: 'About'
}
</script>

<style scoped>
.about {
  padding: 20px;
}
a {
  color: #42b983;
  text-decoration: none;
}
</style> 