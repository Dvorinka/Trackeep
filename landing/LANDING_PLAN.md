# Trackeep Landing Page Plan & Structure

## Project Overview
**Domain**: trackeep.org  
**Tech Stack**: Vue 3 + TypeScript + Vite + UnoCSS  
**Design System**: Papra-inspired clean UI with Inter font, custom color palette  
**Theme**: Dark mode support, no gradients, clean SaaS/PaaS aesthetic  

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
- Papra button variants (`btn-primary`, `btn-secondary`, `btn-outline`)
- Card styles (`card-papra`)
- Navigation items (`nav-item-papra`)
- Transitions (`transition-papra`)

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

**Content Ideas**:
- Headline: "Your Self-Hosted Productivity & Knowledge Hub"
- Subheading: "Track, save, and organize everything that matters to you - all in one place, under your control"
- CTA: "Get Started" or "View Demo"

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
- **Frontend**: SolidJS, TypeScript, UnoCSS
- **Backend**: Go, PostgreSQL
- **Mobile**: React Native
- **DevOps**: Docker, GitHub Actions

### 6. Pricing Section (if applicable)
**Purpose**: Clear pricing information

**Options**:
- **Free**: Open source, self-hosted
- **Premium**: Optional support/features
- **Enterprise**: Custom solutions

### 7. Testimonials Section
**Purpose**: Social proof

**Layout**: Carousel or grid of user quotes

### 8. Call-to-Action Section
**Purpose**: Final conversion opportunity

**Content**: Strong CTA with benefits summary

### 9. Footer
**Purpose**: Navigation and legal information

**Links**:
- Documentation
- GitHub
- Privacy Policy
- Terms of Service
- Contact

## Technical Implementation Plan

### Project Structure
```
landing/
├── src/
│   ├── components/
│   │   ├── HeroSection.vue
│   │   ├── Navigation.vue
│   │   ├── FeatureCard.vue
│   │   ├── Footer.vue
│   │   ├── QuickInstall.vue
│   │   └── ui/
│   │       ├── Button.vue
│   │       ├── Card.vue
│   │       └── Container.vue
│   ├── composables/
│   │   ├── useTheme.ts
│   │   └── useScroll.ts
│   ├── assets/
│   │   ├── images/
│   │   │   ├── hero-placeholder.png
│   │   │   ├── feature-1.png
│   │   │   ├── feature-2.png
│   │   │   └── feature-3.png
│   │   └── styles/
│   │       └── main.css
│   ├── App.vue
│   ├── main.ts
│   └── router.ts
├── public/
│   ├── favicon.ico
│   └── trackeep-logo.svg
├── package.json
├── vite.config.ts
├── uno.config.ts
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

#### Container Component
- Max-width wrapper
- Responsive padding
- Center alignment

### Responsive Design
- **Mobile**: Single column, stacked layout
- **Tablet**: Two-column layouts
- **Desktop**: Full multi-column experience

### Performance Considerations
- Lazy load images
- Optimize fonts (Inter from existing CDN)
- Minimize JavaScript bundle
- Use CSS-in-JS for styling

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
- Set up Vue + Vite + UnoCSS
- Create basic layout structure
- Implement navigation and footer
- Add theme switching
- **Create QuickInstall component with curl command**

### Phase 2: Content Sections (Week 2)
- Build hero section with install command
- Add features grid
- Create benefits section
- Implement responsive design

### Phase 3: Polish (Week 3)
- Add animations and transitions
- Optimize performance
- SEO implementation
- Cross-browser testing
- **Test install script functionality**

### Phase 4: Launch (Week 4)
- Final content review
- Domain setup
- Analytics integration
- Performance monitoring
- **Deploy install script to trackeep.org/install.sh**

## Success Metrics
- **Page Load Speed**: < 2 seconds
- **Mobile Score**: > 90 on Lighthouse
- **Conversion Rate**: Track demo signups
- **SEO Ranking**: Target keywords positioning

## Next Steps
1. Approve this plan and structure
2. Set up the Vue project with dependencies
3. Create the basic component library
4. **Build QuickInstall component with curl command**
5. Start building sections from top to bottom
6. Integrate with existing design system
7. Add real content and images
8. **Create and deploy the install.sh script**
9. Test and optimize for production

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
