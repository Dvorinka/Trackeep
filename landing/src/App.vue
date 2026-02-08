<template>
  <div id="app" :class="{ 'dark': isDark }">
    <Navigation />
    <router-view />
    <Footer />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import Navigation from './components/Navigation.vue'
import Footer from './components/Footer.vue'
import { useTheme } from './composables/useTheme'

const { isDark } = useTheme()

onMounted(() => {
  // Check for system preference
  if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
})
</script>

<style>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.dark {
  color-scheme: dark;
}
</style>
