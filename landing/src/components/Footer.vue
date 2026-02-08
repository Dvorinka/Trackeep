<template>
  <footer class="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 mt-auto">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
        <!-- Logo and Description -->
        <div class="col-span-1 md:col-span-2">
          <div class="flex items-center mb-4">
            <img 
              src="/trackeep-logo-bg.png" 
              alt="Trackeep" 
              class="h-8 w-auto mr-3"
              @error="(e: Event) => { const target = e.target as HTMLImageElement; target.style.display='none'; logoError = true }"
            />
            <span v-if="logoError" class="text-xl font-bold text-primary">Trackeep</span>
          </div>
          <p class="text-gray-600 dark:text-gray-400 max-w-md">
            Your self-hosted productivity & knowledge hub. Track, save, and organize everything that matters to you - all in one place, under your control.
          </p>
        </div>

        <!-- Product Links -->
        <div>
          <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-4">Product</h3>
          <ul class="space-y-2">
            <li><a href="#features" class="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">Features</a></li>
            <li><a href="#how-it-works" class="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">How It Works</a></li>
            <li><a href="https://demo.trackeep.org" target="_blank" class="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">Demo</a></li>
            <li><a href="https://github.com/trackeep/trackeep/releases" target="_blank" class="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">Changelog</a></li>
          </ul>
        </div>

        <!-- Resources Links -->
        <div>
          <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-4">Resources</h3>
          <ul class="space-y-2">
            <li><a href="https://docs.trackeep.org" target="_blank" class="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">Documentation</a></li>
            <li><a href="https://github.com/trackeep/trackeep" target="_blank" class="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">GitHub</a></li>
            <li><a href="https://discord.gg/trackeep" target="_blank" class="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">Discord</a></li>
            <li><a href="mailto:support@trackeep.org" class="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">Contact</a></li>
          </ul>
        </div>
      </div>

      <!-- Bottom Section -->
      <div class="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
        <div class="flex flex-col md:flex-row justify-between items-center">
          <div class="flex items-center space-x-6 mb-4 md:mb-0">
            <a href="/privacy" class="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors text-sm">Privacy Policy</a>
            <a href="/terms" class="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors text-sm">Terms of Service</a>
          </div>
          
          <div class="flex items-center space-x-4">
            <a href="https://github.com/trackeep/trackeep" target="_blank" class="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">
              <i class="ph ph-github-logo text-xl"></i>
            </a>
            <a href="https://discord.gg/trackeep" target="_blank" class="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">
              <i class="ph ph-discord-logo text-xl"></i>
            </a>
            <a href="https://twitter.com/trackeep" target="_blank" class="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">
              <i class="ph ph-twitter-logo text-xl"></i>
            </a>
          </div>
        </div>
        
        <div class="mt-4 text-center text-gray-600 dark:text-gray-400 text-sm">
          © {{ currentYear }} Trackeep. All rights reserved. Built with ❤️ and open source.
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const logoError = ref(false)
const currentYear = computed(() => new Date().getFullYear())
</script>
