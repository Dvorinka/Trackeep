# Trackeep Landing Page Plan & Structure

## Project Overview
**Domain**: trackeep.org  
**Demo Domain**: demo.trackeep.org  
**Tech Stack**: Astro + TypeScript + Vite + Bun + TailwindCSS  
**Design System**: Papra-inspired clean UI with Inter font, custom color palette  
**Theme**: Dark mode support, no gradients, clean SaaS/PaaS aesthetic  

## UI Design System & Visual Plan

### Design Inspiration Analysis
Based on analysis of reference sites and existing Trackeep assets:

**Papra Design System** (from papra.html/css):
- Clean, minimalist aesthetic with subtle grid backgrounds
- Dark/light theme support with proper contrast
- Rounded corners (0.5rem radius)
- Sophisticated color palette with HSL values
- Icon-based visual elements using Tabler icons
- Card-based layouts with subtle borders

**Glance App**:
- Dashboard-focused widget approach
- Clean typography and spacing
- Mobile-first responsive design
- Subtle animations and transitions

**Maybe.co**:
- Professional finance app aesthetic
- Clean data visualization
- Trustworthy color scheme
- Clear CTAs and navigation

**n8n.io**:
- Technical workflow focus
- Modern developer-friendly design
- Strong visual hierarchy
- Interactive elements

**Immich.app**:
- Photo management focus
- Clean media presentation
- Strong brand colors
- Mobile app integration

**Umami.is**:
- Analytics dashboard aesthetic
- Clean data presentation
- Privacy-focused messaging
- Open source emphasis

### Enhanced Color Palette
```css
:root {
  /* Light Mode */
  --background: 250 250 250;           /* #fafafa */
  --foreground: 15 23 42;              /* #0f172a */
  --card: 255 255 255;                 /* #ffffff */
  --card-foreground: 15 23 42;         /* #0f172a */
  --popover: 255 255 255;              /* #ffffff */
  --popover-foreground: 15 23 42;      /* #0f172a */
  --primary: 91 196 242;               /* #5BC4F2 - Trackeep brand blue */
  --primary-foreground: 0 0 0;         /* #000000 */
  --secondary: 241 245 249;            /* #f1f5f9 */
  --secondary-foreground: 71 85 105;    /* #475569 */
  --muted: 241 245 249;                /* #f1f5f9 */
  --muted-foreground: 100 116 139;     /* #64748b */
  --accent: 241 245 249;               /* #f1f5f9 */
  --accent-foreground: 71 85 105;      /* #475569 */
  --destructive: 0 84.2% 60.2%;        /* #ef4444 */
  --destructive-foreground: 0 0% 98%; /* #fafafa */
  --border: 226 232 240;               /* #e2e8f0 */
  --input: 226 232 240;                /* #e2e8f0 */
  --ring: 217 70.2% 91.2%;             /* #dbeafe */
  --radius: 0.5rem;
  
  /* Custom Trackeep Colors */
  --trackeep-blue: 91 196 242;         /* #5BC4F2 */
  --trackeep-blue-dark: 14 165 233;    /* #0ea5e9 */
  --trackeep-green: 34 197 94;         /* #22c55e */
  --trackeep-orange: 251 146 60;       /* #fb923c */
  --trackeep-purple: 168 85 247;       /* #a855f7 */
}

[data-kb-theme="dark"] {
  /* Dark Mode */
  --background: 26 26 26;              /* #1a1a1a */
  --foreground: 250 250 250;           /* #fafafa */
  --card: 32 32 32;                    /* #202020 */
  --card-foreground: 250 250 250;      /* #fafafa */
  --popover: 32 32 32;                 /* #202020 */
  --popover-foreground: 250 250 250;    /* #fafafa */
  --primary-foreground: 250 250 250;   /* #fafafa */
  --secondary: 39 39 42;               /* #27272a */
  --secondary-foreground: 250 250 250; /* #fafafa */
  --muted: 39 39 42;                   /* #27272a */
  --muted-foreground: 163 163 163;     /* #a3a3a3 */
  --accent: 39 39 42;                  /* #27272a */
  --accent-foreground: 250 250 250;     /* #fafafa */
  --destructive: 0 62.8% 30.6%;        /* #dc2626 */
  --destructive-foreground: 250 250 250; /* #fafafa */
  --border: 39 39 42;                  /* #27272a */
  --input: 39 39 42;                   /* #27272a */
  --ring: 217 70.2% 91.2%;             /* #dbeafe */
}
```

### Typography System
**Font Family**: Inter (from existing Trackeep fonts.css)
- **Weights**: 300 (Light), 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)
- **Sizes**: 
  - xs: 0.75rem (12px)
  - sm: 0.875rem (14px)
  - base: 1rem (16px)
  - lg: 1.125rem (18px)
  - xl: 1.25rem (20px)
  - 2xl: 1.5rem (24px)
  - 3xl: 1.875rem (30px)
  - 4xl: 2.25rem (36px)
  - 5xl: 3rem (48px)
  - 6xl: 3.75rem (60px)

**Line Heights**:
- tight: 1.25
- normal: 1.5
- relaxed: 1.75

### Component Design System

#### 1. Navigation Bar
**Inspiration**: Papra + Maybe.co
- **Style**: Floating glassmorphism effect with backdrop blur
- **Layout**: Logo left, menu center, theme toggle + social links right
- **Mobile**: Hamburger menu with slide-out drawer
- **Elements**:
  - Logo with hover animation (rotate effect like Papra)
  - Active state indicators
  - Smooth transitions (200ms cubic-bezier)

#### 2. Hero Section
**Inspiration**: Papra + Immich + n8n
- **Background**: Subtle grid pattern with gradient overlay
- **Layout**: Split layout (text left, visual right) on desktop
- **Elements**:
  - Animated gradient blob background
  - Typography hierarchy: H1 (4xl/5xl), Subtitle (xl), CTAs
  - Interactive install command box
  - Feature highlights with icons

#### 3. Quick Install Component
**Inspiration**: Papra's code blocks + Glance's widgets
- **Style**: Dark terminal-style box with syntax highlighting
- **Features**:
  - One-click copy with success feedback
  - Command: `curl -sSL https://trackeep.org/install.sh | sh`
  - Animated typing effect
  - Social proof buttons (GitHub, Discord)

#### 4. Feature Cards
**Inspiration**: Papra's card system + n8n's workflow cards
- **Style**: Elevated cards with subtle borders
- **Layout**: 2-3 column grid with responsive adjustments
- **Elements**:
  - Icon + title + description structure
  - Hover effects (scale, shadow)
  - Gradient overlays for visual interest
  - Micro-animations on scroll

#### 5. Documentation Section
**Inspiration**: Umami's clean docs + Maybe's professional layout
- **Style**: Tabbed interface with search
- **Features**:
  - Full-text search across docs
  - Syntax-highlighted code blocks
  - Responsive table of contents
  - Dark/light theme support

#### 6. Demo Section
**Inspiration**: Immich's app showcase + n8n's interactive demos
- **Style**: Interactive iframe or screenshot carousel
- **Features**:
  - Live preview at demo.trackeep.org
  - Feature tour tooltips
  - Responsive device mockups
  - Performance metrics

### Visual Effects & Animations

#### Micro-interactions
- **Button hover**: Scale (1.05) + shadow + translateY(-2px)
- **Card hover**: Border color change + subtle shadow
- **Icon animations**: Rotate, scale, color transitions
- **Scroll animations**: Fade-in, slide-up effects

#### Background Effects
- **Grid pattern**: Subtle 24px grid (like Papra)
- **Gradient blobs**: Animated color gradients
- **Particle effects**: Optional subtle floating elements

#### Loading States
- **Skeleton loaders**: For dynamic content
- **Progress indicators**: For install process
- **Spinners**: Minimal, on-brand

### Responsive Design Strategy

#### Breakpoints
- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1024px (md)
- **Desktop**: 1024px - 1280px (lg)
- **Large Desktop**: > 1280px (xl)

#### Mobile Adaptations
- **Navigation**: Bottom sheet menu
- **Hero**: Stacked layout with full-width elements
- **Features**: Single column with larger touch targets
- **Install command**: Horizontal scroll with copy button

### Accessibility Considerations
- **WCAG 2.1 AA compliance**
- **Keyboard navigation**: All interactive elements
- **Screen reader**: Proper ARIA labels
- **Color contrast**: 4.5:1 minimum
- **Focus indicators**: Visible, consistent
- **Reduced motion**: Respect prefers-reduced-motion

### Performance Optimization
- **Images**: WebP format, lazy loading
- **Fonts**: Preload critical fonts, font-display: swap
- **JavaScript**: Minimal client-side JS (Astro islands)
- **CSS**: Critical CSS inlined, non-critical deferred
- **Animations**: CSS transforms (GPU accelerated)

### Brand Integration
- **Logo**: Consistent with existing Trackeep branding
- **Colors**: #5BC4F2 primary blue maintained
- **Typography**: Inter font from existing system
- **Iconography**: Tabler icons (consistent with Papra)
- **Voice**: Professional but approachable

### Content Strategy
- **Headlines**: Benefit-focused, action-oriented
- **Body text**: Clear, concise, scannable
- **CTAs**: Strong verbs, clear outcomes
- **Social proof**: GitHub stars, user testimonials
- **Technical credibility**: Stack logos, architecture diagrams

## Design System Reference

### Colors (from existing project)
- **Primary**: `#5BC4F2` (bright blue accent)  
- **Background**: Light `#FFFFFF`, Dark `#1A1A1A`
- **Foreground**: Light `#0A0A0A`, Dark `#FAFAFA`
- **Card**: Light `#FCFCFC`, Dark `#1A1A1A`
- **Border**: Light `#E2E8F0`, Dark `#262626`
- **Muted**: Light `#F2F2F2`, Dark `#262626`

### Typography
- **Font**: Inter (400, 500, 600, 700 weights)
- **Sizes**: xs(0.75rem), sm(0.875rem), base(1rem), lg(1.125rem), xl(1.25rem), 2xl(1.5rem), 3xl(1.875rem), 4xl(2.25rem), 6xl(3.75rem)

### Components (reuse from project)
- **Papra Button Variants**: `btn-primary`, `btn-secondary`, `btn-outline`
- **Card Styles**: `card-papra` with elevated borders and hover effects
- **Navigation Items**: `nav-item-papra` with active states
- **Transitions**: `transition-papra` with cubic-bezier easing
- **Grid Backgrounds**: Subtle 24px/48px grid patterns
- **Icon System**: Tabler icons with consistent sizing

### Project Documentation Integration
- **API Documentation**: Embedded from `docs/API.md` with syntax highlighting
- **Development Guide**: From `docs/DEVELOPMENT.md` with setup instructions
- **AI Features**: From `docs/AI_ASSISTANT.md` showcasing capabilities
- **Deployment Guide**: From `docs/DEPLOYMENT.md` with Docker instructions
- **Activity Rectangles**: From `docs/ACTIVITY_RECTANGLES_IMPLEMENTED.md` showing feature details

### Visual Asset Library
**Existing Images** (from landing folder):
- `image.png`, `image copy.png`, `image copy 2.png`, `image copy 3.png`
- **Usage**: Hero section, feature illustrations, demo screenshots
- **Style**: Clean, minimalist, dark mode compatible
- **Optimization**: WebP format, responsive loading

### Icon Library
**Source**: Tabler Icons (consistent with Papra)
- **Categories**: Interface, brands, file types, actions
- **Style**: Outline, consistent stroke width
- **Integration**: CSS mask-based for color theming
- **Examples**: 
  - `i-tabler-file-text` (documents)
  - `i-tabler-search` (search features)
  - `i-tabler-code` (developer tools)
  - `i-tabler-shield-lock` (security)
  - `i-tabler-brand-github` (social links)

## Landing Page Structure

### 1. Hero Section
**Purpose**: Immediate value proposition and call-to-action

**Components**:
- Navigation bar with logo and menu items
- **Quick Install Command**: Interactive curl command box with copy functionality
- Main headline with subheading
- Primary CTA button
- Hero image placeholder (large, prominent)
- Feature highlights (3-4 key benefits)

**Quick Install Command Section**:
- **Command**: `curl -sSL https://trackeep.org/install.sh | sh`
- **Features**:
  - Rounded input box with dark background
  - One-click copy functionality
  - Syntax highlighting for the command
  - Interactive setup script that:
    - Checks system requirements (Docker, Docker Compose)
    - Downloads latest Trackeep release
    - Sets up environment variables
    - Initializes database
    - Starts all services
    - Provides next steps and access URLs
- **Social Proof Buttons**: GitHub and Discord links below the command
- **Demo Mode**: Direct link to `demo.trackeep.org` for instant preview

**Content Ideas**:
- Headline: "Your Self-Hosted Productivity & Knowledge Hub"
- Subheading: "Track, save, and organize everything that matters to you - all in one place, under your control"
- Primary CTA: "Try Demo" (links to demo.trackeep.org)
- Secondary CTA: "Get Started" (install command)
- Tertiary CTA: "View Documentation" (links to docs)

### 2. Features Section
**Purpose**: Showcase core capabilities

**Layout**: Grid of feature cards (3-4 columns)

**Features to highlight**:
- **Bookmarks & Links**: Save and categorize web content
- **Task Management**: Plan and track your to-dos
- **File Storage**: Upload and organize documents
- **AI-Powered**: Smart recommendations (optional)
- **Privacy First**: Self-hosted and secure
- **Mobile App**: Native iOS and Android

### 3. How It Works Section
**Purpose**: Simple explanation of the setup process

**Steps**:
1. **Deploy**: Simple Docker setup
2. **Configure**: Set up your preferences
3. **Use**: Start organizing your digital life

### 4. Benefits Section
**Purpose**: Why choose Trackeep over alternatives

**Key benefits**:
- **Privacy**: Your data stays yours
- **Open Source**: Transparent and customizable
- **All-in-One**: Replace multiple apps
- **AI Optional**: Use only what you want
- **Self-Hosted**: No subscriptions or data mining

### 5. Tech Stack Section
**Purpose**: Build credibility with developers

**Technologies**:
- **Frontend**: Astro, TypeScript, TailwindCSS
- **Backend**: Go, PostgreSQL
- **Mobile**: React Native
- **Package Manager**: Bun
- **Build Tool**: Vite
- **DevOps**: Docker, GitHub Actions

### 6. Documentation Section
**Purpose**: Comprehensive project documentation

**Sections**:
- **API Reference**: Complete API documentation
- **Development Guide**: Setup and contribution guidelines
- **AI Features**: AI integration documentation
- **Deployment Guide**: Production deployment instructions
- **Activity Rectangles**: Feature implementation details

### 7. Pricing Section (if applicable)
**Purpose**: Clear pricing information

**Options**:
- **Free**: Open source, self-hosted
- **Premium**: Optional support/features
- **Enterprise**: Custom solutions

### 8. Demo Section
**Purpose**: Interactive demonstration

**Features**:
- **Live Demo**: Link to demo.trackeep.org
- **Demo Credentials**: Pre-configured access
- **Feature Tour**: Guided walkthrough
- **Interactive Elements**: Try core features

### 9. Testimonials Section
**Purpose**: Social proof

**Layout**: Carousel or grid of user quotes

### 10. Call-to-Action Section
**Purpose**: Final conversion opportunity

**Content**: Strong CTA with benefits summary

### 11. Footer
**Purpose**: Navigation and legal information

**Links**:
- Documentation (integrated docs)
- GitHub
- Demo (demo.trackeep.org)
- Privacy Policy
- Terms of Service
- Contact

## Technical Implementation Plan

### Project Structure
```
landing/
├── src/
│   ├── components/
│   │   ├── HeroSection.astro
│   │   ├── Navigation.astro
│   │   ├── FeatureCard.astro
│   │   ├── Footer.astro
│   │   ├── QuickInstall.astro
│   │   ├── Documentation.astro
│   │   └── ui/
│   │       ├── Button.astro
│   │       ├── Card.astro
│   │       └── Container.astro
│   ├── layouts/
│   │   └── Layout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── docs/
│   │   │   ├── api.astro
│   │   │   ├── development.astro
│   │   │   ├── ai-features.astro
│   │   │   ├── deployment.astro
│   │   │   └── activity-rectangles.astro
│   │   └── demo.astro
│   ├── content/
│   │   └── docs/  # Markdown content for docs
│   ├── assets/
│   │   ├── images/
│   │   │   ├── hero-placeholder.png
│   │   │   ├── feature-1.png
│   │   │   ├── feature-2.png
│   │   │   └── feature-3.png
│   │   └── styles/
│   │       └── main.css
│   ├── utils/
│   │   ├── theme.ts
│   │   └── scroll.ts
│   └── env.d.ts
├── public/
│   ├── favicon.ico
│   ├── trackeep-logo.svg
│   └── install.sh
├── package.json
├── astro.config.mjs
├── tailwind.config.mjs
├── bun.lockb
└── tsconfig.json
```

### Key Components

#### Navigation Component
- Logo on left
- Menu items center
- Theme toggle right
- Mobile hamburger menu

#### Quick Install Component
- Dark rounded box with command display
- Copy button with clipboard functionality
- Syntax highlighting for curl command
- Success feedback when copied
- GitHub and Discord action buttons

#### Hero Section
- Split layout: text left, image right
- Animated elements on scroll
- Clear CTAs
- Quick install command prominently displayed

#### Feature Cards
- Icon + title + description
- Hover effects
- Consistent spacing

#### Documentation Component
- **API Reference**: Embedded from `docs/API.md`
- **Development Guide**: From `docs/DEVELOPMENT.md`
- **AI Features**: From `docs/AI_ASSISTANT.md`
- **Deployment Guide**: From `docs/DEPLOYMENT.md`
- **Activity Rectangles**: From `docs/ACTIVITY_RECTANGLES_IMPLEMENTED.md`
- **Searchable**: Full-text search across docs
- **Theme-aware**: Dark/light mode support

### Responsive Design
- **Mobile**: Single column, stacked layout
- **Tablet**: Two-column layouts
- **Desktop**: Full multi-column experience

### Performance Considerations
- **Astro Islands**: Minimal client-side JavaScript
- **Lazy load images**: Optimized loading
- **Optimize fonts**: Inter from existing CDN
- **Bun runtime**: Fast package management and building
- **Vite bundling**: Optimized production builds
- **Static generation**: SEO-optimized pre-rendering

### SEO Optimization
- Semantic HTML5 structure
- Meta tags for each section
- Structured data markup
- Fast loading times

## Content Strategy

### Messaging Pillars
1. **Simplicity**: Easy to set up and use
2. **Privacy**: Your data, your rules
3. **Flexibility**: Works for individuals and teams
4. **Open Source**: Transparent and community-driven

### Tone of Voice
- Clean and professional
- Approachable and helpful
- Technical but accessible
- Confident but not arrogant

## Image Requirements

### Placeholders needed:
1. **Hero Image**: Large, high-quality dashboard screenshot
2. **Feature Images**: 3-4 illustrations of key features
3. **Tech Stack Logos**: Go, SolidJS, React Native, Docker
4. **Testimonials**: User avatars (optional)

### Image Guidelines:
- Clean, minimalist style
- Consistent color palette
- No gradients (per requirements)
- Dark mode compatible
- Optimized for web (WebP format)

## Development Phases

### Phase 1: Foundation (Week 1)
- Set up Astro + Vite + TailwindCSS + Bun
- Create basic layout structure
- Implement navigation and footer
- Add theme switching
- **Create QuickInstall component with curl command**
- **Set up documentation integration**

### Phase 2: Content Sections (Week 2)
- Build hero section with install command
- Add features grid
- Create benefits section
- **Integrate project documentation**
- **Add demo section with demo.trackeep.org link**
- Implement responsive design

### Phase 3: Polish (Week 3)
- Add animations and transitions
- Optimize performance
- SEO implementation
- Cross-browser testing
- **Test install script functionality**

### Phase 4: Launch (Week 4)
- Final content review
- Domain setup (trackeep.org)
- **Configure demo.trackeep.org**
- Analytics integration
- Performance monitoring
- **Deploy install script to trackeep.org/install.sh**
- **Set up documentation routing**

## Success Metrics
- **Page Load Speed**: < 2 seconds
- **Mobile Score**: > 90 on Lighthouse
- **Conversion Rate**: Track demo signups
- **SEO Ranking**: Target keywords positioning

## Next Steps
1. Approve this plan and structure
2. Set up the Astro project with Bun dependencies
3. Create the basic component library
4. **Build QuickInstall component with curl command**
5. **Integrate project documentation from docs/**
6. Start building sections from top to bottom
7. **Add demo.trackeep.org configuration**
8. Integrate with existing design system
9. Add real content and images
10. **Create and deploy the install.sh script**
11. Test and optimize for production

## Install Script Implementation

### install.sh Script Features
```bash
#!/bin/bash
# Interactive Trackeep installation script

# System requirements check
# - Docker & Docker Compose detection
# - OS compatibility (Linux, macOS)
# - Minimum disk space and memory

# Download latest release
# - Fetch from GitHub releases API
# - Verify checksums
# - Extract to /opt/trackeep

# Environment setup
# - Generate secure JWT secret
# - Create .env file with defaults
# - Set up database (SQLite by default)

# Service initialization
# - Start Docker containers
# - Wait for services to be ready
# - Run database migrations
# - Create admin user

# Post-installation
# - Display access URLs
# - Show default credentials
# - Provide next steps
# - Offer demo data import option
```

### Interactive Features
- **Progress indicators** with colored output
- **User prompts** for configuration options
- **Error handling** with helpful messages
- **Rollback capability** if installation fails
- **Update checking** for existing installations

---

This plan leverages your existing design system while creating a professional, modern landing page that showcases Trackeep's value proposition effectively.
