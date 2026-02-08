<template>
  <div class="card-papra group hover:scale-105 transition-papra duration-300 border-2 border-transparent hover:border-primary/20">
    <div class="flex items-center mb-6">
      <div class="bg-gradient-to-br from-primary/10 to-primary/20 text-primary p-4 rounded-2xl group-hover:from-primary/20 group-hover:to-primary/30 transition-papra">
        <i :class="icon" class="text-3xl"></i>
      </div>
    </div>
    
    <h3 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 leading-tight">{{ title }}</h3>
    <p class="text-lg text-gray-600 dark:text-gray-400 leading-relaxed text-pretty">{{ description }}</p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  icon: string
  title: string
  description: string
}

defineProps<Props>()
</script>
