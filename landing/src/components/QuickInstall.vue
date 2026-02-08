<template>
  <div class="card-papra max-w-4xl mx-auto lg:mx-0 border-2 border-primary/20">
    <div class="mb-8">
      <h3 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 tracking-tight">Quick Install</h3>
      <p class="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">Get Trackeep running in seconds with one command</p>
    </div>
    
    <!-- Command Box -->
    <div class="relative bg-gray-900 dark:bg-black border border-gray-700 dark:border-gray-600 rounded-2xl p-6 mb-8 shadow-strong">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center space-x-2">
          <div class="w-3 h-3 rounded-full bg-red-500"></div>
          <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div class="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <span class="text-xs text-gray-400 font-mono">terminal</span>
      </div>
      
      <code class="text-lg font-mono text-green-400 break-leading-relaxed block">
        $ curl -sSL https://trackeep.org/install.sh | sh
      </code>
      
      <!-- Copy Button -->
      <button 
        @click="copyCommand"
        class="absolute top-6 right-6 p-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-papra group"
        :aria-label="copied ? 'Copied!' : 'Copy command'"
      >
        <i :class="copied ? 'ph ph-check text-green-400' : 'ph ph-copy text-gray-400 group-hover:text-white'" class="text-xl transition-colors"></i>
      </button>
    </div>

    <!-- Success Message -->
    <div v-if="copied" class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4 mb-8 shadow-soft">
      <p class="text-green-800 dark:text-green-200 font-medium flex items-center">
        <i class="ph ph-check-circle mr-2 text-xl"></i>
        Command copied to clipboard! Ready to install Trackeep.
      </p>
    </div>

    <!-- Social Proof Buttons -->
    <div class="flex flex-wrap gap-4 mb-8">
      <a 
        href="https://github.com/trackeep/trackeep" 
        target="_blank"
        class="flex items-center gap-3 px-6 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-papra group"
      >
        <i class="ph ph-github-logo text-xl text-gray-600 dark:text-gray-400 group-hover:text-primary transition-colors"></i>
        <span class="font-medium text-gray-700 dark:text-gray-300">View Source</span>
      </a>
      
      <a 
        href="https://discord.gg/trackeep" 
        target="_blank"
        class="flex items-center gap-3 px-6 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-papra group"
      >
        <i class="ph ph-discord-logo text-xl text-gray-600 dark:text-gray-400 group-hover:text-primary transition-colors"></i>
        <span class="font-medium text-gray-700 dark:text-gray-300">Join Discord</span>
      </a>
      
      <a 
        href="https://docs.trackeep.org" 
        target="_blank"
        class="flex items-center gap-3 px-6 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-papra group"
      >
        <i class="ph ph-book text-xl text-gray-600 dark:text-gray-400 group-hover:text-primary transition-colors"></i>
        <span class="font-medium text-gray-700 dark:text-gray-300">Documentation</span>
      </a>
    </div>

    <!-- Installation Info -->
    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
      <div class="flex items-start gap-3">
        <div class="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 p-2 rounded-lg">
          <i class="ph ph-info text-xl"></i>
        </div>
        <div class="text-sm text-gray-700 dark:text-gray-300">
          <p class="font-semibold mb-3 text-gray-900 dark:text-gray-100">The install script will:</p>
          <ul class="space-y-2 ml-4">
            <li class="flex items-start gap-2">
              <i class="ph ph-check-circle text-green-500 mt-0.5 flex-shrink-0"></i>
              <span>Check system requirements (Docker, Docker Compose)</span>
            </li>
            <li class="flex items-start gap-2">
              <i class="ph ph-check-circle text-green-500 mt-0.5 flex-shrink-0"></i>
              <span>Download the latest Trackeep release</span>
            </li>
            <li class="flex items-start gap-2">
              <i class="ph ph-check-circle text-green-500 mt-0.5 flex-shrink-0"></i>
              <span>Set up environment variables and database</span>
            </li>
            <li class="flex items-start gap-2">
              <i class="ph ph-check-circle text-green-500 mt-0.5 flex-shrink-0"></i>
              <span>Start all services and provide access URLs</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const copied = ref(false)

const copyCommand = async () => {
  const command = 'curl -sSL https://trackeep.org/install.sh | sh'
  
  try {
    await navigator.clipboard.writeText(command)
    copied.value = true
    
    // Reset after 3 seconds
    setTimeout(() => {
      copied.value = false
    }, 3000)
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = command
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 3000)
  }
}
</script>
