// Enhanced parallax and micro-interactions for Trackeep landing page

class ParallaxController {
  constructor() {
    this.elements = [];
    this.init();
  }

  init() {
    // Find all parallax elements
    this.elements = document.querySelectorAll('[data-speed]');
    
    // Add scroll listener
    window.addEventListener('scroll', () => this.handleScroll());
    
    // Initial update
    this.handleScroll();
  }

  handleScroll() {
    const scrolled = window.pageYOffset;
    const windowHeight = window.innerHeight;

    this.elements.forEach(element => {
      const rect = element.getBoundingClientRect();
      const elementTop = rect.top + scrolled;
      const elementHeight = rect.height;
      
      // Only apply parallax if element is in view
      if (elementTop < scrolled + windowHeight && elementTop + elementHeight > scrolled) {
        const speed = parseFloat(element.dataset.speed) || 0.5;
        const yPos = -(scrolled * speed);
        
        element.style.transform = `translate3d(0, ${yPos}px, 0)`;
      }
    });
  }
}

class MagneticButtons {
  constructor() {
    this.init();
  }

  init() {
    const buttons = document.querySelectorAll('.magnetic-button');
    
    buttons.forEach(button => {
      button.addEventListener('mousemove', (e) => this.handleMouseMove(e, button));
      button.addEventListener('mouseleave', (e) => this.handleMouseLeave(e, button));
    });
  }

  handleMouseMove(e, button) {
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    const distance = Math.sqrt(x * x + y * y);
    const maxDistance = Math.max(rect.width, rect.height) / 2;
    
    if (distance < maxDistance) {
      const strength = (maxDistance - distance) / maxDistance;
      const moveX = (x / maxDistance) * strength * 10;
      const moveY = (y / maxDistance) * strength * 10;
      
      button.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.05)`;
    }
  }

  handleMouseLeave(e, button) {
    button.style.transform = 'translate(0, 0) scale(1)';
  }
}

class ScrollReveal {
  constructor() {
    this.elements = [];
    this.init();
  }

  init() {
    this.elements = document.querySelectorAll('.scroll-reveal');
    
    // Initial check
    this.checkElements();
    
    // Add scroll listener
    window.addEventListener('scroll', () => this.checkElements(), { passive: true });
    
    // Add resize listener
    window.addEventListener('resize', () => this.checkElements());
  }

  checkElements() {
    const windowHeight = window.innerHeight;
    const triggerBottom = windowHeight * 0.85;

    this.elements.forEach(element => {
      const elementTop = element.getBoundingClientRect().top;
      
      if (elementTop < triggerBottom) {
        element.classList.add('revealed');
      }
    });
  }
}

class SmoothScroll {
  constructor() {
    this.init();
  }

  init() {
    // Add smooth scroll behavior for anchor links
    document.addEventListener('click', (e) => {
      if (e.target.tagName === 'A' && e.target.hash) {
        const target = document.querySelector(e.target.hash);
        if (target) {
          e.preventDefault();
          this.scrollToElement(target);
        }
      }
    });
  }

  scrollToElement(element) {
    const headerOffset = 80; // Account for fixed header
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }
}

class ParticleAnimation {
  constructor() {
    this.particles = [];
    this.init();
  }

  init() {
    const particleFields = document.querySelectorAll('.particle-field');
    
    particleFields.forEach(field => {
      this.createParticles(field);
    });
  }

  createParticles(field) {
    const particleCount = 20;
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 10 + 's';
      particle.style.animationDuration = (10 + Math.random() * 10) + 's';
      
      field.appendChild(particle);
      this.particles.push(particle);
    }
  }
}

class ThemeEnhancer {
  constructor() {
    this.init();
  }

  init() {
    // Add enhanced theme transitions
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
        setTimeout(() => {
          document.body.style.transition = '';
        }, 300);
      });
    }
  }
}

// Initialize all controllers when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ParallaxController();
  new MagneticButtons();
  new ScrollReveal();
  new SmoothScroll();
  new ParticleAnimation();
  new ThemeEnhancer();
  
  // Add loading animation removal
  setTimeout(() => {
    document.body.classList.add('loaded');
  }, 100);
});

// Add intersection observer for better performance
const observerOptions = {
  root: null,
  rootMargin: '0px',
  threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
    }
  });
}, observerOptions);

// Observe all scroll-reveal elements
document.addEventListener('DOMContentLoaded', () => {
  const revealElements = document.querySelectorAll('.scroll-reveal');
  revealElements.forEach(el => observer.observe(el));
});
