// Scroll progress indicator
document.addEventListener('DOMContentLoaded', () => {
    // Create progress bar
    const progressBar = document.createElement('div');
    progressBar.id = 'scroll-progress';
    progressBar.className = 'fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-trackeep-purple transform-origin-left z-50 transition-transform duration-150';
    progressBar.style.transform = 'scaleX(0)';
    document.body.appendChild(progressBar);
    
    // Update progress on scroll
    const updateProgress = () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const progress = scrollTop / scrollHeight;
        progressBar.style.transform = `scaleX(${progress})`;
    };
    
    // Throttled scroll handler
    let ticking = false;
    const requestTick = () => {
        if (!ticking) {
            window.requestAnimationFrame(updateProgress);
            ticking = true;
            setTimeout(() => { ticking = false; }, 16);
        }
    };
    
    window.addEventListener('scroll', requestTick, { passive: true });
    
    // Hide progress bar when at top
    const toggleVisibility = () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        if (scrollTop === 0) {
            progressBar.style.opacity = '0';
        } else {
            progressBar.style.opacity = '1';
        }
    };
    
    window.addEventListener('scroll', toggleVisibility, { passive: true });
    toggleVisibility(); // Initial state
});

// Enhanced smooth scrolling for anchor links
document.addEventListener('DOMContentLoaded', () => {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                const offsetTop = targetElement.offsetTop - 80; // Account for fixed header
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
});

// Add hover effect to cards with 3D tilt
document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.feature-card, .card-papra');
    
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 10;
            const rotateY = (centerX - x) / 10;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0)';
        });
    });
});

// Add typing effect to hero section
document.addEventListener('DOMContentLoaded', () => {
    const heroTitle = document.querySelector('h1 .gradient-text');
    if (!heroTitle) return;
    
    const text = heroTitle.textContent;
    heroTitle.textContent = '';
    heroTitle.style.borderRight = '3px solid hsl(var(--primary))';
    heroTitle.style.animation = 'blink 1s infinite';
    
    let index = 0;
    const typeWriter = () => {
        if (index < text.length) {
            heroTitle.textContent += text.charAt(index);
            index++;
            setTimeout(typeWriter, 100);
        } else {
            heroTitle.style.borderRight = 'none';
            heroTitle.style.animation = '';
        }
    };
    
    // Start typing after page load
    setTimeout(typeWriter, 500);
});

// Add blink animation for typing cursor
const style = document.createElement('style');
style.textContent = `
    @keyframes blink {
        0%, 50% { border-color: hsl(var(--primary)); }
        51%, 100% { border-color: transparent; }
    }
`;
document.head.appendChild(style);
