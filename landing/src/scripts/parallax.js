// Parallax scrolling effect for gradient blobs
document.addEventListener('DOMContentLoaded', () => {
    const blobs = document.querySelectorAll('.parallax-slow');
    const heroSection = document.querySelector('section');
    
    if (!blobs.length || !heroSection) return;
    
    const handleScroll = () => {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        
        blobs.forEach((blob, index) => {
            const speed = 0.5 + (index * 0.1);
            const yPos = -(scrolled * speed);
            blob.style.transform = `translateY(${yPos}px)`;
        });
    };
    
    const handleMouseMove = (e) => {
        const mouseX = e.clientX / window.innerWidth - 0.5;
        const mouseY = e.clientY / window.innerHeight - 0.5;
        
        blobs.forEach((blob, index) => {
            const speed = 20 + (index * 10);
            const x = mouseX * speed;
            const y = mouseY * speed;
            blob.style.transform = `translate(${x}px, ${y}px)`;
        });
    };
    
    // Add scroll listener with throttling
    let ticking = false;
    const requestTick = () => {
        if (!ticking) {
            window.requestAnimationFrame(handleScroll);
            ticking = true;
            setTimeout(() => { ticking = false; }, 16);
        }
    };
    
    window.addEventListener('scroll', requestTick, { passive: true });
    
    // Add mouse movement listener for subtle parallax
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    
    // Reset blob positions on mouse leave
    document.addEventListener('mouseleave', () => {
        blobs.forEach(blob => {
            blob.style.transform = 'translate(0, 0)';
        });
    });
});

// Smooth scroll reveal animation
document.addEventListener('DOMContentLoaded', () => {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
            }
        });
    }, observerOptions);
    
    // Observe all scroll-reveal elements
    document.querySelectorAll('.scroll-reveal').forEach(el => {
        observer.observe(el);
    });
});

// Enhanced copy functionality with visual feedback
document.addEventListener('DOMContentLoaded', () => {
    const copyButton = document.getElementById('copy-button');
    const copyIcon = document.getElementById('copy-icon');
    const checkIcon = document.getElementById('check-icon');
    const copyText = document.getElementById('copy-text');
    const command = 'curl -sSL https://trackeep.org/install.sh | sh';

    if (!copyButton) return;

    copyButton.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(command);
            
            // Show success state with enhanced animation
            copyIcon?.classList.add('hidden');
            checkIcon?.classList.remove('hidden');
            copyText.textContent = 'Copied!';
            copyButton.classList.add('bg-green-600/50', 'hover:bg-green-700/50', 'border-green-500/50', 'scale-110');
            copyButton.classList.remove('bg-gray-700/50', 'hover:bg-gray-600/50', 'border-gray-600/50');
            
            // Add success pulse effect
            copyButton.style.animation = 'pulse 0.5s ease-in-out';
            
            // Reset after 2 seconds
            setTimeout(() => {
                copyIcon?.classList.remove('hidden');
                checkIcon?.classList.add('hidden');
                copyText.textContent = 'Copy';
                copyButton.classList.remove('bg-green-600/50', 'hover:bg-green-700/50', 'border-green-500/50', 'scale-110');
                copyButton.classList.add('bg-gray-700/50', 'hover:bg-gray-600/50', 'border-gray-600/50');
                copyButton.style.animation = '';
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            
            // Show error state
            copyText.textContent = 'Failed';
            copyButton.classList.add('bg-red-600/50', 'border-red-500/50');
            
            setTimeout(() => {
                copyText.textContent = 'Copy';
                copyButton.classList.remove('bg-red-600/50', 'border-red-500/50');
            }, 1500);
        }
    });
});

// Theme toggle functionality
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const html = document.documentElement;
    
    if (!themeToggle) return;
    
    // Get current theme
    const currentTheme = localStorage.getItem('theme') || 'system';
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Set initial theme
    if (currentTheme === 'dark' || (currentTheme === 'system' && systemPrefersDark)) {
        html.classList.add('dark');
    }
    
    themeToggle.addEventListener('click', () => {
        const isDark = html.classList.toggle('dark');
        const newTheme = isDark ? 'dark' : 'light';
        
        localStorage.setItem('theme', newTheme);
        
        // Add animation class
        themeToggle.style.animation = 'rotate 0.3s ease-in-out';
        setTimeout(() => {
            themeToggle.style.animation = '';
        }, 300);
    });
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        const currentTheme = localStorage.getItem('theme') || 'system';
        if (currentTheme === 'system') {
            html.classList.toggle('dark', e.matches);
        }
    });
});

// Mobile menu functionality
document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (!mobileMenuButton || !mobileMenu) return;
    
    mobileMenuButton.addEventListener('click', () => {
        const isHidden = mobileMenu.classList.contains('hidden');
        
        if (isHidden) {
            mobileMenu.classList.remove('hidden');
            mobileMenu.classList.add('animate-slide-up');
            mobileMenuButton.style.animation = 'rotate 0.3s ease-in-out';
        } else {
            mobileMenu.classList.add('hidden');
            mobileMenu.classList.remove('animate-slide-up');
            mobileMenuButton.style.animation = 'rotate-reverse 0.3s ease-in-out';
        }
        
        setTimeout(() => {
            mobileMenuButton.style.animation = '';
        }, 300);
    });
    
    // Close mobile menu when clicking on links
    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
            mobileMenu.classList.remove('animate-slide-up');
        });
    });
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!mobileMenuButton.contains(e.target) && !mobileMenu.contains(e.target)) {
            mobileMenu.classList.add('hidden');
            mobileMenu.classList.remove('animate-slide-up');
        }
    });
});

// Add loading animation for page load
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});

// Performance optimization: Debounce scroll events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add CSS for additional animations
const style = document.createElement('style');
style.textContent = `
    @keyframes rotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(180deg); }
    }
    
    @keyframes rotate-reverse {
        from { transform: rotate(180deg); }
        to { transform: rotate(0deg); }
    }
    
    body:not(.loaded) * {
        animation-play-state: paused !important;
    }
    
    body.loaded * {
        animation-play-state: running !important;
    }
`;
document.head.appendChild(style);
