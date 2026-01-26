# Trackeep – Your Self-Hosted Productivity & Knowledge Hub

> **Tagline:** "Track, save, and organize everything that matters to you."

## Project Overview

Trackeep is an open-source, self-hosted platform designed to help you store, organize, and track all your digital content—from bookmarks and documents to learning progress, tasks, media, and files. Think of it as a hybrid of Papr, Notion, Pocket, and Todo apps, built for developers, learners, and knowledge workers who want full control over their data.

With Trackeep, everything you save is centralized, searchable, and easy to manage, while remaining self-hosted so you maintain full privacy and ownership.

## Core Features

### 1. Bookmarks & Link Management
- Save and categorize links, articles, videos, and web resources
- Tag and search efficiently to retrieve content quickly
- Import/export from browser or other tools

### 2. Learning & Progress Tracking
- Track courses, tutorials, and personal learning paths
- Record progress on skills or tasks over time
- Integrate video resources like YouTube for reference

### 3. Task & To-Do Lists
- Plan future tasks, create checklists, and mark completed items
- Organize tasks by priority, category, or tags

### 4. Media & File Storage
- Upload, store, and manage documents, presentations, images, and videos
- Quick download and optional preview (for supported formats)

### 5. Notes & Annotations
- Add personal notes to saved links, files, or tasks
- Keep all related content in one place

### 6. Tagging & Organization
- Assign multiple tags or categories for efficient sorting
- Use smart rules for automated tagging

### 7. Privacy & Self-Hosting
- Fully self-hosted; no third-party servers required
- Data is yours—encrypted and controlled

### 8. Optional Integrations
- Browser extensions for faster saving
- API endpoints for custom scripts and automation

## Tech Stack

### Frontend
- **SolidJS + TSX** – Modern, reactive, declarative UI framework
- **Shadcn Solid** – Ready-to-use, clean UI components
- **UnoCSS** – Instant, atomic CSS engine for fast, responsive styling
- **Tabler Icons** – Open-source, minimalist icon set
- **Theme Color:** `#39b9ff` (Go-inspired, bright blue accent for buttons, highlights, and focus states)
- **Dark Mode** – Main UI styled for low-light environments with custom color palette:
  - Background: `#18181b`
  - Sidebar/Card Background: `#141415` 
  - Borders: `#262626`
  - Primary Text: `#fafafa`
  - Secondary Text: `#a3a3a3`

### Backend
- **Golang** – Core API, data management, and business logic
- **PostgreSQL / SQLite** – Primary database for storing bookmarks, tasks, and files (SQLite for lightweight/self-hosted setups)
- **Bun** – Lightweight Node runtime for scripting or web utilities
- **Rust** – Optional high-performance modules for tasks Go cannot handle efficiently (e.g., file indexing, search)

### Deployment
- **Docker & Docker Compose** – Easy deployment, reproducible setup, and cross-platform compatibility
- Self-hostable on any Linux server, VPS, or local machine

## Target Users

- Lifelong learners and students tracking personal growth
- Developers or knowledge workers who want a central hub for bookmarks, tasks, and media
- Anyone seeking a self-hosted alternative to Notion, Papr, Pocket, or Google Keep

## Why Trackeep?

- Combines bookmarks, files, tasks, and learning progress in one central hub
- Self-hosted & open-source for privacy and flexibility
- Clean, modern UI inspired by Papr with a bold Go-blue accent (`#39b9ff`)
- Scalable and modular backend using Golang + Rust + Postgres/SQLite

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Go 1.21+ (for local development)
- Node.js 18+ (for frontend development)
- PostgreSQL or SQLite

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/trackeep.git
   cd trackeep
   ```

2. **Using Docker Compose (Recommended)**
   ```bash
   docker-compose up -d
   ```

3. **Manual Installation**
   ```bash
   # Backend
   cd backend
   go mod download
   go run main.go
   
   # Frontend
   cd frontend
   npm install
   npm run dev
   ```

### Configuration

Copy the example configuration files and modify them according to your needs:

```bash
cp backend/config.example.yaml backend/config.yaml
cp frontend/.env.example frontend/.env
```

## Development

### Project Structure
```
trackeep/
├── backend/          # Go API server
├── frontend/         # SolidJS frontend
├── docker-compose.yml
├── README.md
└── docs/            # Additional documentation
```

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by Papr, Notion, Pocket, and various productivity tools
- Built with modern web technologies for performance and scalability
- Community-driven and open-source
