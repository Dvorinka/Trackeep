<template>
  <div class="min-h-screen">
    <!-- Hero Section -->
    <section class="relative py-24 lg:py-32 bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div class="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          <!-- Left Content -->
          <div class="text-center lg:text-left space-y-8">
            <div class="space-y-6">
              <h1 class="text-5xl lg:text-7xl font-bold text-gray-900 dark:text-gray-100 leading-tight tracking-tight">
                Your Self-Hosted
                <span class="text-primary">Productivity</span>
                <br class="hidden lg:block" />
                & <span class="text-primary">Knowledge</span> Hub
              </h1>
              
              <p class="text-xl lg:text-2xl text-gray-600 dark:text-gray-400 leading-relaxed text-pretty max-w-2xl">
                Track, save, and organize everything that matters to you — all in one place, under your control. 
                No subscriptions, no data mining, just pure productivity.
              </p>
            </div>

            <!-- Quick Install Component -->
            <QuickInstall class="scale-95 lg:scale-100" />

            <!-- Feature Highlights -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8">
              <div class="text-center lg:text-left group">
                <div class="flex items-center justify-center lg:justify-start mb-3">
                  <div class="bg-primary/10 text-primary p-3 rounded-xl group-hover:bg-primary/20 transition-papra">
                    <i class="ph ph-lock-simple text-2xl"></i>
                  </div>
                  <span class="font-semibold text-gray-900 dark:text-gray-100 ml-3">Privacy First</span>
                </div>
                <p class="text-gray-600 dark:text-gray-400 leading-relaxed">Your data stays yours</p>
              </div>
              
              <div class="text-center lg:text-left group">
                <div class="flex items-center justify-center lg:justify-start mb-3">
                  <div class="bg-primary/10 text-primary p-3 rounded-xl group-hover:bg-primary/20 transition-papra">
                    <i class="ph ph-code text-2xl"></i>
                  </div>
                  <span class="font-semibold text-gray-900 dark:text-gray-100 ml-3">Open Source</span>
                </div>
                <p class="text-gray-600 dark:text-gray-400 leading-relaxed">Transparent & customizable</p>
              </div>
              
              <div class="text-center lg:text-left group">
                <div class="flex items-center justify-center lg:justify-start mb-3">
                  <div class="bg-primary/10 text-primary p-3 rounded-xl group-hover:bg-primary/20 transition-papra">
                    <i class="ph ph-devices text-2xl"></i>
                  </div>
                  <span class="font-semibold text-gray-900 dark:text-gray-100 ml-3">All-in-One</span>
                </div>
                <p class="text-gray-600 dark:text-gray-400 leading-relaxed">Replace multiple apps</p>
              </div>
            </div>

            <!-- CTA Buttons -->
            <div class="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-8">
              <a href="#features" @click="(e) => handleCTAClick(e, 'features')" class="btn-primary text-center">
                Explore Features
              </a>
              <a href="https://demo.trackeep.org" target="_blank" class="btn-outline text-center">
                View Demo
              </a>
            </div>
          </div>

          <!-- Right Content - Hero Image -->
          <div class="relative">
            <div class="relative rounded-3xl overflow-hidden shadow-strong">
              <img 
                src="/hero-dashboard.png" 
                alt="Trackeep Dashboard" 
                class="w-full h-auto transform hover:scale-105 transition-papra duration-700"
                @error="(e: Event) => { const target = e.target as HTMLImageElement; target.style.display='none'; heroImageError = true }"
              />
              <!-- Placeholder if image fails to load -->
              <div v-if="heroImageError" class="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 border border-gray-200 dark:border-gray-600 rounded-3xl p-16 min-h-[500px] flex items-center justify-center">
                <div class="text-center">
                  <i class="ph ph-monitor text-8xl text-primary mb-6"></i>
                  <p class="text-xl text-gray-600 dark:text-gray-400 font-medium">Dashboard Preview</p>
                </div>
              </div>
            </div>
            
            <!-- Floating badges -->
            <div class="absolute -top-6 -right-6 bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-strong transform rotate-3">
              v1.0.0
            </div>
            <div class="absolute -bottom-6 -left-6 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 px-6 py-3 rounded-2xl font-bold shadow-strong transform -rotate-3">
              <i class="ph ph-star-fill text-yellow-500 mr-2"></i>
              4.9/5 Rating
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="py-24 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900">
      <div class="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div class="text-center mb-20">
          <h2 class="text-4xl lg:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-8 leading-tight tracking-tight">
            Everything You Need to Stay
            <span class="text-primary">Organized</span>
          </h2>
          <p class="text-xl lg:text-2xl text-gray-600 dark:text-gray-400 leading-relaxed text-pretty max-w-4xl mx-auto">
            Trackeep combines all your productivity tools into one seamless experience with powerful features designed for modern workflows
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard 
            icon="ph ph-bookmark-simple"
            title="Bookmarks & Links"
            description="Save and categorize web content with smart tags, powerful search, and automatic organization"
          />
          <FeatureCard 
            icon="ph ph-check-square"
            title="Task Management"
            description="Plan and track your to-dos with customizable workflows, due dates, and priority levels"
          />
          <FeatureCard 
            icon="ph ph-folder-simple"
            title="File Storage"
            description="Upload and organize documents with version control, sharing, and advanced search"
          />
          <FeatureCard 
            icon="ph ph-sparkle"
            title="AI-Powered"
            description="Smart recommendations and automated organization with optional AI features"
          />
          <FeatureCard 
            icon="ph ph-shield-check"
            title="Privacy First"
            description="Self-hosted and secure with end-to-end encryption and complete data control"
          />
          <FeatureCard 
            icon="ph ph-device-mobile"
            title="Mobile App"
            description="Native iOS and Android apps for on-the-go access and offline support"
          />
        </div>
      </div>
    </section>

    <!-- Benefits Section -->
    <section class="py-20 bg-white dark:bg-gray-900">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Why Choose
            <span class="text-primary">Trackeep</span>
          </h2>
          <p class="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            The perfect balance of simplicity, privacy, and power
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div class="text-center">
            <div class="bg-primary/10 text-primary w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <i class="ph ph-lock-simple text-2xl"></i>
            </div>
            <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Privacy First</h3>
            <p class="text-gray-600 dark:text-gray-400">Your data stays yours. No tracking, no data mining, complete control over your information.</p>
          </div>
          
          <div class="text-center">
            <div class="bg-primary/10 text-primary w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <i class="ph ph-code text-2xl"></i>
            </div>
            <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Open Source</h3>
            <p class="text-gray-600 dark:text-gray-400">Transparent and customizable. Audit the code, modify features, contribute to the community.</p>
          </div>
          
          <div class="text-center">
            <div class="bg-primary/10 text-primary w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <i class="ph ph-stack text-2xl"></i>
            </div>
            <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">All-in-One</h3>
            <p class="text-gray-600 dark:text-gray-400">Replace multiple apps with one unified platform for bookmarks, tasks, files, and knowledge.</p>
          </div>
          
          <div class="text-center">
            <div class="bg-primary/10 text-primary w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <i class="ph ph-sparkle text-2xl"></i>
            </div>
            <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">AI Optional</h3>
            <p class="text-gray-600 dark:text-gray-400">Use AI features when you want them, with full control over what gets processed.</p>
          </div>
          
          <div class="text-center">
            <div class="bg-primary/10 text-primary w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <i class="ph ph-credit-card text-2xl"></i>
            </div>
            <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">No Subscriptions</h3>
            <p class="text-gray-600 dark:text-gray-400">One-time setup, no monthly fees. Pay for hosting, not for features.</p>
          </div>
          
          <div class="text-center">
            <div class="bg-primary/10 text-primary w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <i class="ph ph-arrow-counter-clockwise text-2xl"></i>
            </div>
            <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Data Portability</h3>
            <p class="text-gray-600 dark:text-gray-400">Export your data anytime. No vendor lock-in, standard formats supported.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works Section -->
    <section id="how-it-works" class="py-20 bg-white dark:bg-gray-900">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Get Started in
            <span class="text-primary">3 Simple Steps</span>
          </h2>
          <p class="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            From zero to productivity in minutes
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="text-center">
            <div class="bg-primary text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              1
            </div>
            <h3 class="text-xl font-semibold mb-2">Deploy</h3>
            <p class="text-gray-600 dark:text-gray-400">Simple Docker setup with one command</p>
          </div>
          
          <div class="text-center">
            <div class="bg-primary text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              2
            </div>
            <h3 class="text-xl font-semibold mb-2">Configure</h3>
            <p class="text-gray-600 dark:text-gray-400">Set up your preferences and integrations</p>
          </div>
          
          <div class="text-center">
            <div class="bg-primary text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              3
            </div>
            <h3 class="text-xl font-semibold mb-2">Use</h3>
            <p class="text-gray-600 dark:text-gray-400">Start organizing your digital life</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Tech Stack Section -->
    <section id="tech-stack" class="py-20 bg-gray-50 dark:bg-gray-800/50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Built with
            <span class="text-primary">Modern Technology</span>
          </h2>
          <p class="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Powered by the best tools for performance and reliability
          </p>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div class="text-center">
            <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-4">
              <i class="ph ph-code text-4xl text-primary mb-2"></i>
              <h4 class="font-semibold">SolidJS</h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">Frontend Framework</p>
            </div>
          </div>
          
          <div class="text-center">
            <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-4">
              <i class="ph ph-gear text-4xl text-primary mb-2"></i>
              <h4 class="font-semibold">Go</h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">Backend Language</p>
            </div>
          </div>
          
          <div class="text-center">
            <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-4">
              <i class="ph ph-database text-4xl text-primary mb-2"></i>
              <h4 class="font-semibold">PostgreSQL</h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">Database</p>
            </div>
          </div>
          
          <div class="text-center">
            <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-4">
              <i class="ph ph-devices text-4xl text-primary mb-2"></i>
              <h4 class="font-semibold">React Native</h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">Mobile Apps</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Testimonials Section -->
    <section class="py-20 bg-gray-50 dark:bg-gray-800/50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Loved by
            <span class="text-primary">Productivity Enthusiasts</span>
          </h2>
          <p class="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            See what our users are saying about Trackeep
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
            <div class="flex items-center mb-4">
              <div class="bg-primary/20 text-primary w-10 h-10 rounded-full flex items-center justify-center mr-3">
                <i class="ph ph-user"></i>
              </div>
              <div>
                <h4 class="font-semibold text-gray-900 dark:text-gray-100">Sarah Chen</h4>
                <p class="text-sm text-gray-600 dark:text-gray-400">Product Manager</p>
              </div>
            </div>
            <p class="text-gray-600 dark:text-gray-400 italic">"Trackeep transformed how I organize my work. Having everything in one place saves me hours every week."</p>
            <div class="flex mt-4">
              <i class="ph ph-star-fill text-yellow-500"></i>
              <i class="ph ph-star-fill text-yellow-500"></i>
              <i class="ph ph-star-fill text-yellow-500"></i>
              <i class="ph ph-star-fill text-yellow-500"></i>
              <i class="ph ph-star-fill text-yellow-500"></i>
            </div>
          </div>
          
          <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
            <div class="flex items-center mb-4">
              <div class="bg-primary/20 text-primary w-10 h-10 rounded-full flex items-center justify-center mr-3">
                <i class="ph ph-user"></i>
              </div>
              <div>
                <h4 class="font-semibold text-gray-900 dark:text-gray-100">Alex Rodriguez</h4>
                <p class="text-sm text-gray-600 dark:text-gray-400">Software Developer</p>
              </div>
            </div>
            <p class="text-gray-600 dark:text-gray-400 italic">"Finally, a tool that respects my privacy. Self-hosting means I control my data completely."</p>
            <div class="flex mt-4">
              <i class="ph ph-star-fill text-yellow-500"></i>
              <i class="ph ph-star-fill text-yellow-500"></i>
              <i class="ph ph-star-fill text-yellow-500"></i>
              <i class="ph ph-star-fill text-yellow-500"></i>
              <i class="ph ph-star-fill text-yellow-500"></i>
            </div>
          </div>
          
          <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
            <div class="flex items-center mb-4">
              <div class="bg-primary/20 text-primary w-10 h-10 rounded-full flex items-center justify-center mr-3">
                <i class="ph ph-user"></i>
              </div>
              <div>
                <h4 class="font-semibold text-gray-900 dark:text-gray-100">Emily Watson</h4>
                <p class="text-sm text-gray-600 dark:text-gray-400">Content Creator</p>
              </div>
            </div>
            <p class="text-gray-600 dark:text-gray-400 italic">"The AI features are incredible but optional. I love having the choice to use them when needed."</p>
            <div class="flex mt-4">
              <i class="ph ph-star-fill text-yellow-500"></i>
              <i class="ph ph-star-fill text-yellow-500"></i>
              <i class="ph ph-star-fill text-yellow-500"></i>
              <i class="ph ph-star-fill text-yellow-500"></i>
              <i class="ph ph-star text-yellow-500"></i>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Final CTA Section -->
    <section class="py-20 bg-primary">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 class="text-3xl lg:text-4xl font-bold text-white mb-6">
          Ready to Take Control of Your Digital Life?
        </h2>
        <p class="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
          Join thousands of users who have already made the switch to self-hosted productivity. 
          No subscriptions, no data mining, just pure productivity.
        </p>
        
        <div class="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <a href="#features" @click="(e) => handleCTAClick(e, 'features')" class="bg-white text-primary px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
            Explore Features
          </a>
          <a href="https://demo.trackeep.org" target="_blank" class="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-primary transition-colors">
            View Live Demo
          </a>
        </div>
        
        <!-- Quick Install Command -->
        <div class="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 max-w-2xl mx-auto">
          <p class="text-white mb-4 font-medium">Install Trackeep in seconds:</p>
          <div class="relative bg-black/20 border border-white/30 rounded-lg p-4">
            <code class="text-white text-sm font-mono">curl -sSL https://trackeep.org/install.sh | sh</code>
            <button 
              @click="copyCommand"
              class="absolute top-2 right-2 p-2 bg-white/20 hover:bg-white/30 rounded transition-colors"
              aria-label="Copy command"
            >
              <i class="ph ph-copy text-white"></i>
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import QuickInstall from '../components/QuickInstall.vue'
import FeatureCard from '../components/FeatureCard.vue'
import { useSmoothScroll } from '../composables/useSmoothScroll'

const { scrollToSection } = useSmoothScroll()
const heroImageError = ref(false)

const copyCommand = async () => {
  const command = 'curl -sSL https://trackeep.org/install.sh | sh'
  
  try {
    await navigator.clipboard.writeText(command)
  } catch (err) {
    const textArea = document.createElement('textarea')
    textArea.value = command
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
  }
}

const handleCTAClick = (event: Event, sectionId: string) => {
  event.preventDefault()
  scrollToSection(sectionId)
}
</script>
