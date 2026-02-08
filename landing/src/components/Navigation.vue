<template>
  <nav class="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 shadow-soft">
    <div class="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
      <div class="flex justify-between items-center h-20">
        <!-- Logo -->
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <img 
              src="/trackeep-logo-bg.png" 
              alt="Trackeep" 
              class="h-10 w-auto transition-papra hover:scale-105"
              @error="(e: Event) => { const target = e.target as HTMLImageElement; target.style.display='none'; logoError = true }"
            />
            <span v-if="logoError" class="text-3xl font-bold text-primary tracking-tight">Trackeep</span>
          </div>
        </div>

        <!-- Desktop Navigation -->
        <div class="hidden lg:block">
          <div class="flex items-center space-x-12">
            <a href="#features" @click="(e) => handleNavClick(e, 'features')" class="nav-item-papra text-lg">Features</a>
            <a href="#how-it-works" @click="(e) => handleNavClick(e, 'how-it-works')" class="nav-item-papra text-lg">How It Works</a>
            <a href="#tech-stack" @click="(e) => handleNavClick(e, 'tech-stack')" class="nav-item-papra text-lg">Tech Stack</a>
            <a href="https://docs.trackeep.org" target="_blank" class="nav-item-papra text-lg">Docs</a>
            <a href="https://github.com/trackeep/trackeep" target="_blank" class="nav-item-papra text-lg flex items-center gap-2">
              <i class="ph ph-github-logo text-xl"></i>
              GitHub
            </a>
          </div>
        </div>

        <!-- Theme Toggle & Mobile Menu Button -->
        <div class="flex items-center space-x-4">
          <button 
            @click="toggleTheme"
            class="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-papra group"
            :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            <i :class="isDark ? 'ph ph-sun' : 'ph ph-moon'" class="text-xl text-gray-600 dark:text-gray-400 group-hover:text-primary transition-colors"></i>
          </button>

          <!-- Mobile menu button -->
          <button 
            @click="toggleMobileMenu"
            class="lg:hidden p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-papra"
            :aria-label="isMobileMenuOpen ? 'Close menu' : 'Open menu'"
          >
            <i :class="isMobileMenuOpen ? 'ph ph-x' : 'ph ph-list'" class="text-xl text-gray-600 dark:text-gray-400"></i>
          </button>
        </div>
      </div>

      <!-- Mobile Navigation -->
      <div v-if="isMobileMenuOpen" class="lg:hidden border-t border-gray-200 dark:border-gray-700 mt-4 pt-4">
        <div class="space-y-3">
          <a href="#features" @click="(e) => handleNavClick(e, 'features')" class="block px-4 py-3 text-lg nav-item-papra rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">Features</a>
          <a href="#how-it-works" @click="(e) => handleNavClick(e, 'how-it-works')" class="block px-4 py-3 text-lg nav-item-papra rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">How It Works</a>
          <a href="#tech-stack" @click="(e) => handleNavClick(e, 'tech-stack')" class="block px-4 py-3 text-lg nav-item-papra rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">Tech Stack</a>
          <a href="https://docs.trackeep.org" @click="closeMobileMenu" target="_blank" class="block px-4 py-3 text-lg nav-item-papra rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">Docs</a>
          <a href="https://github.com/trackeep/trackeep" @click="closeMobileMenu" target="_blank" class="block px-4 py-3 text-lg nav-item-papra rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2">
            <i class="ph ph-github-logo text-xl"></i>
            GitHub
          </a>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useTheme } from '../composables/useTheme'
import { useSmoothScroll } from '../composables/useSmoothScroll'

const { isDark, toggleTheme } = useTheme()
const { scrollToSection } = useSmoothScroll()
const isMobileMenuOpen = ref(false)
const logoError = ref(false)

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
}

const handleNavClick = (event: Event, sectionId: string) => {
  event.preventDefault()
  scrollToSection(sectionId)
  closeMobileMenu()
}
</script>
