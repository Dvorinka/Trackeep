// Comprehensive mock data for Trackeep demo mode
// This file provides realistic sample data for all features

export interface MockDocument {
  id: string;
  name: string;
  size: string;
  type: string;
  createdAt: string;
  tags: Array<{ name: string; color: string }>;
  description?: string;
  content?: string;
}

export interface MockBookmark {
  id: string;
  title: string;
  url: string;
  description: string;
  tags: Array<{ name: string; color: string }>;
  createdAt: string;
  favicon?: string;
  screenshot?: string;
  category?: string;
}

export interface MockTask {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  tags: Array<{ name: string; color: string }>;
  createdAt: string;
  completedAt?: string;
  estimatedTime?: number;
  actualTime?: number;
  projectId?: string;
  assignee?: string;
}

export interface MockNote {
  id: string;
  title: string;
  content: string;
  tags: Array<{ name: string; color: string }>;
  createdAt: string;
  updatedAt: string;
  isMarkdown: boolean;
  attachments?: Array<{ name: string; size: string; type: string }>;
  folder?: string;
}

export interface MockTimeEntry {
  id: string;
  description: string;
  startTime: string;
  endTime?: string;
  duration: number;
  billable: boolean;
  hourlyRate?: number;
  projectId?: string;
  taskId?: string;
  tags: string[];
  date: string;
}

export interface MockVideo {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnail: string;
  duration: string;
  channel: string;
  channelId: string;
  publishedAt: string;
  tags: Array<{ name: string; color: string }>;
  category?: string;
}

export interface MockLearningPath {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  progress: number;
  modules: Array<{
    id: string;
    title: string;
    description: string;
    completed: boolean;
    resources: Array<{ type: string; title: string; url: string }>;
  }>;
  tags: Array<{ name: string; color: string }>;
  createdAt: string;
  enrolledAt?: string;
}

export interface MockCalendarEvent {
  id: string;
  title: string;
  description: string;
  start: string;
  end: string;
  allDay: boolean;
  type: 'meeting' | 'task' | 'reminder' | 'personal' | 'deadline';
  location?: string;
  attendees?: Array<{ name: string; email: string }>;
  tags: Array<{ name: string; color: string }>;
}

export interface MockActivity {
  id: string;
  type: 'document' | 'bookmark' | 'task' | 'note' | 'video' | 'time_entry' | 'learning_path';
  action: string;
  title: string;
  timestamp: string;
  icon: string;
  details?: any;
}

// Mock data generators
export const mockDocuments: MockDocument[] = [
  {
    id: 'doc_1',
    name: 'WooCommerce CSV Import Tutorial',
    size: '205.12 KB',
    type: 'docx',
    createdAt: '3 days ago',
    tags: [
      { name: 'ecommerce', color: '#3b82f6' },
      { name: 'tutorial', color: '#10b981' }
    ],
    description: 'Step-by-step guide for importing products into WooCommerce using CSV files',
    content: '# WooCommerce CSV Import Tutorial\n\nThis comprehensive guide covers...'
  },
  {
    id: 'doc_2',
    name: 'Tomáš Dvořák - CV 2024',
    size: '2.21 MB',
    type: 'pdf',
    createdAt: '2 days ago',
    tags: [
      { name: 'resume', color: '#8b5cf6' },
      { name: 'personal', color: '#f59e0b' }
    ],
    description: 'Professional resume and portfolio overview for 2024',
    content: '# Tomáš Dvořák\n\n## Senior Full Stack Developer...'
  },
  {
    id: 'doc_3',
    name: 'Chazzy Bar Business Plan',
    size: '1.45 MB',
    type: 'pptx',
    createdAt: '1 week ago',
    tags: [
      { name: 'business', color: '#ef4444' },
      { name: 'presentation', color: '#06b6d4' }
    ],
    description: 'Comprehensive business plan for Chazzy Bar startup',
    content: '# Chazzy Bar Business Plan\n\n## Executive Summary...'
  },
  {
    id: 'doc_4',
    name: 'EIDOLON Project Story',
    size: '25.40 KB',
    type: 'txt',
    createdAt: '2 weeks ago',
    tags: [
      { name: 'creative', color: '#ec4899' },
      { name: 'writing', color: '#84cc16' }
    ],
    description: 'Creative writing project - EIDOLON universe backstory',
    content: '# EIDOLON: The Beginning\n\nIn the year 2047, the world had changed beyond recognition...'
  },
  {
    id: 'doc_5',
    name: 'EIDOLON Technical Overview',
    size: '861.35 KB',
    type: 'md',
    createdAt: '2 weeks ago',
    tags: [
      { name: 'technical', color: '#f97316' },
      { name: 'documentation', color: '#6366f1' }
    ],
    description: 'Technical specifications and architecture for EIDOLON project',
    content: '# EIDOLON Technical Architecture\n\n## System Overview\n\nThe EIDOLON system consists of multiple interconnected components...'
  },
  {
    id: 'doc_6',
    name: 'BizoniUH Sponsorship Proposal',
    size: '7.52 MB',
    type: 'pdf',
    createdAt: '3 weeks ago',
    tags: [
      { name: 'sponsorship', color: '#14b8a6' },
      { name: 'marketing', color: '#a855f7' }
    ],
    description: 'Sponsorship proposal for BizoniUH event partnership',
    content: '# BizoniUH Sponsorship Proposal\n\n## Partnership Opportunities...'
  },
  {
    id: 'doc_7',
    name: 'API Documentation v2.1',
    size: '1.2 MB',
    type: 'pdf',
    createdAt: '1 month ago',
    tags: [
      { name: 'api', color: '#0ea5e9' },
      { name: 'documentation', color: '#6366f1' }
    ],
    description: 'Complete API documentation for Trackeep platform',
    content: '# Trackeep API Documentation\n\n## Authentication\n\nAll API requests require authentication using Bearer tokens...'
  },
  {
    id: 'doc_8',
    name: 'Q4 2024 Financial Report',
    size: '3.4 MB',
    type: 'xlsx',
    createdAt: '2 months ago',
    tags: [
      { name: 'finance', color: '#059669' },
      { name: 'report', color: '#7c3aed' }
    ],
    description: 'Quarterly financial analysis and projections',
    content: '# Q4 2024 Financial Report\n\n## Revenue Analysis\n\nTotal revenue: $2.4M (+15% YoY)'
  },
  {
    id: 'doc_9',
    name: 'Proměna - Theater Script',
    size: '195.12 KB',
    type: 'txt',
    createdAt: '3 days ago',
    tags: [
      { name: 'Maturita', color: '#dc2626' },
      { name: 'theater', color: '#7c2d12' }
    ],
    description: 'Czech theater play for graduation exam',
    content: '# Proměna\n\n## Dramatis Personae\n\n* Gregor Samsa\n* Grete Samsa\n* Herr Samsa\n* Frau Samsa'
  },
  {
    id: 'doc_10',
    name: 'Kytice - Poetry Collection',
    size: '230.19 KB',
    type: 'txt',
    createdAt: '3 days ago',
    tags: [
      { name: 'Maturita', color: '#dc2626' },
      { name: 'poetry', color: '#059669' }
    ],
    description: 'Collection of Czech poems for literature exam',
    content: '# Kytice\n\n## Kytice od Karla Jaromíra Erbena\n\n### Svatební košile\n\nUž potichu na posteli\nmrtva ležela dívka...'
  },
  {
    id: 'doc_11',
    name: 'Král Lávra - Analysis',
    size: '183.79 KB',
    type: 'md',
    createdAt: '3 days ago',
    tags: [
      { name: 'Maturita', color: '#dc2626' },
      { name: 'analysis', color: '#7c3aed' }
    ],
    description: 'Literary analysis of Král Lávra for graduation exam',
    content: '# Král Lávra\n\n## Analysis of Karel Čapek\'s Work\n\n### Historical Context\n\nWritten in 1923, "Král Lávra" is one of Čapek\'s most significant works...'
  },
  {
    id: 'doc_12',
    name: 'Lakomec - Study Guide',
    size: '56.49 KB',
    type: 'txt',
    createdAt: '3 days ago',
    tags: [
      { name: 'Maturita', color: '#dc2626' },
      { name: 'study', color: '#0891b2' }
    ],
    description: 'Study guide for Molière\'s The Miser',
    content: '# Lakomec\n\n## Study Guide for Molière\'s Play\n\n### Character Analysis\n\n**Harpagon**: The main protagonist, a wealthy but miserly old man...'
  },
  {
    id: 'doc_13',
    name: 'Machine Learning Basics',
    size: '1.8 MB',
    type: 'pdf',
    createdAt: '1 week ago',
    tags: [
      { name: 'AI', color: '#10b981' },
      { name: 'machine learning', color: '#3b82f6' }
    ],
    description: 'Introduction to machine learning concepts and algorithms',
    content: '# Machine Learning Basics\n\n## Introduction\n\nMachine Learning is a subset of artificial intelligence that enables systems to learn and improve from experience...'
  },
  {
    id: 'doc_14',
    name: 'React Native Development Guide',
    size: '2.3 MB',
    type: 'pdf',
    createdAt: '2 weeks ago',
    tags: [
      { name: 'mobile', color: '#8b5cf6' },
      { name: 'react native', color: '#61dafb' }
    ],
    description: 'Complete guide to React Native mobile app development',
    content: '# React Native Development\n\n## Getting Started\n\nReact Native is a framework for building mobile applications using JavaScript and React...'
  },
  {
    id: 'doc_15',
    name: 'Database Design Patterns',
    size: '945 KB',
    type: 'md',
    createdAt: '3 weeks ago',
    tags: [
      { name: 'database', color: '#06b6d4' },
      { name: 'architecture', color: '#f97316' }
    ],
    description: 'Common database design patterns and best practices',
    content: '# Database Design Patterns\n\n## Overview\n\nThis document covers essential database design patterns that every developer should know...'
  },
  {
    id: 'doc_16',
    name: 'Project Dashboard Screenshot',
    size: '245.8 KB',
    type: 'png',
    createdAt: '1 day ago',
    tags: [
      { name: 'design', color: '#ec4899' },
      { name: 'ui', color: '#8b5cf6' }
    ],
    description: 'Screenshot of the new project dashboard design',
    content: 'Image file showing the new dashboard interface'
  },
  {
    id: 'doc_17',
    name: 'Team Meeting Recording',
    size: '15.2 MB',
    type: 'mp4',
    createdAt: '2 days ago',
    tags: [
      { name: 'meeting', color: '#ef4444' },
      { name: 'team', color: '#10b981' }
    ],
    description: 'Recording of the weekly team sync meeting',
    content: 'Video file of team meeting discussion'
  },
  {
    id: 'doc_18',
    name: 'Product Requirements Document',
    size: '512 KB',
    type: 'docx',
    createdAt: '4 days ago',
    tags: [
      { name: 'product', color: '#f59e0b' },
      { name: 'requirements', color: '#06b6d4' }
    ],
    description: 'Detailed product requirements for Q2 features',
    content: '# Product Requirements Document\n\n## Overview\n\nThis document outlines the requirements for the Q2 2024 feature release...'
  }
];

export const mockBookmarks: MockBookmark[] = [
  {
    id: 'bm_1',
    title: 'SolidJS Documentation',
    url: 'https://www.solidjs.com/docs/latest',
    description: 'Official SolidJS documentation and API reference',
    tags: [
      { name: 'javascript', color: '#f7df1e' },
      { name: 'framework', color: '#61dafb' },
      { name: 'documentation', color: '#6366f1' },
      { name: 'favorite', color: '#ef4444' }
    ],
    createdAt: '2 days ago',
    favicon: 'https://www.solidjs.com/favicon.ico',
    category: 'Development'
  },
  {
    id: 'bm_2',
    title: 'Go Programming Language',
    url: 'https://golang.org/',
    description: 'Official Go programming language website',
    tags: [
      { name: 'golang', color: '#00add8' },
      { name: 'backend', color: '#10b981' },
      { name: 'programming', color: '#8b5cf6' },
      { name: 'important', color: '#f59e0b' }
    ],
    createdAt: '1 week ago',
    favicon: 'https://golang.org/favicon.ico',
    category: 'Development'
  },
  {
    id: 'bm_3',
    title: 'Docker Hub',
    url: 'https://hub.docker.com/',
    description: 'Container image repository and registry',
    tags: [
      { name: 'docker', color: '#2496ed' },
      { name: 'devops', color: '#ff6b6b' },
      { name: 'containers', color: '#4ecdc4' }
    ],
    createdAt: '2 weeks ago',
    favicon: 'https://hub.docker.com/favicon.ico',
    category: 'DevOps'
  },
  {
    id: 'bm_4',
    title: 'GitHub',
    url: 'https://github.com/',
    description: 'Code hosting and version control platform',
    tags: [
      { name: 'git', color: '#f05032' },
      { name: 'development', color: '#61dafb' },
      { name: 'opensource', color: '#3dd97a' },
      { name: 'favorite', color: '#ef4444' }
    ],
    createdAt: '3 weeks ago',
    favicon: 'https://github.com/favicon.ico',
    category: 'Development'
  },
  {
    id: 'bm_5',
    title: 'Stack Overflow',
    url: 'https://stackoverflow.com/',
    description: 'Programming Q&A community and knowledge base',
    tags: [
      { name: 'qa', color: '#f48024' },
      { name: 'community', color: '#0095ff' },
      { name: 'programming', color: '#8b5cf6' }
    ],
    createdAt: '1 month ago',
    favicon: 'https://stackoverflow.com/favicon.ico',
    category: 'Community'
  },
  {
    id: 'bm_6',
    title: 'MDN Web Docs',
    url: 'https://developer.mozilla.org/',
    description: 'Comprehensive web development documentation',
    tags: [
      { name: 'web', color: '#007396' },
      { name: 'documentation', color: '#6366f1' },
      { name: 'html', color: '#e34c26' },
      { name: 'css', color: '#1572b6' },
      { name: 'javascript', color: '#f7df1e' }
    ],
    createdAt: '2 weeks ago',
    favicon: 'https://developer.mozilla.org/favicon.ico',
    category: 'Documentation'
  },
  {
    id: 'bm_7',
    title: 'TailwindCSS',
    url: 'https://tailwindcss.com/',
    description: 'Utility-first CSS framework for rapid UI development',
    tags: [
      { name: 'css', color: '#1572b6' },
      { name: 'framework', color: '#61dafb' },
      { name: 'design', color: '#ec4899' },
      { name: 'important', color: '#f59e0b' }
    ],
    createdAt: '3 days ago',
    favicon: 'https://tailwindcss.com/favicon.ico',
    category: 'Design'
  },
  {
    id: 'bm_8',
    title: 'Vite',
    url: 'https://vitejs.dev/',
    description: 'Next generation frontend tooling',
    tags: [
      { name: 'build-tools', color: '#646cff' },
      { name: 'javascript', color: '#f7df1e' },
      { name: 'frontend', color: '#f97316' }
    ],
    createdAt: '1 week ago',
    favicon: 'https://vitejs.dev/favicon.ico',
    category: 'Development'
  },
  {
    id: 'bm_9',
    title: 'Figma',
    url: 'https://www.figma.com/',
    description: 'Collaborative interface design tool',
    tags: [
      { name: 'design', color: '#ec4899' },
      { name: 'ui', color: '#8b5cf6' },
      { name: 'collaboration', color: '#10b981' },
      { name: 'favorite', color: '#ef4444' }
    ],
    createdAt: '4 days ago',
    favicon: 'https://www.figma.com/favicon.ico',
    category: 'Design'
  },
  {
    id: 'bm_10',
    title: 'PostgreSQL Documentation',
    url: 'https://www.postgresql.org/docs/',
    description: 'Official PostgreSQL database documentation',
    tags: [
      { name: 'database', color: '#336791' },
      { name: 'sql', color: '#336791' },
      { name: 'documentation', color: '#6366f1' },
      { name: 'backend', color: '#10b981' }
    ],
    createdAt: '5 days ago',
    favicon: 'https://www.postgresql.org/favicon.ico',
    category: 'Database'
  },
  {
    id: 'bm_11',
    title: 'React Native Docs',
    url: 'https://reactnative.dev/docs/getting-started',
    description: 'Learn how to build native apps with React',
    tags: [
      { name: 'mobile', color: '#8b5cf6' },
      { name: 'react', color: '#61dafb' },
      { name: 'javascript', color: '#f7df1e' },
      { name: 'ios', color: '#000000' },
      { name: 'android', color: '#3dd97a' }
    ],
    createdAt: '1 week ago',
    favicon: 'https://reactnative.dev/favicon.ico',
    category: 'Mobile'
  },
  {
    id: 'bm_12',
    title: 'TypeScript Handbook',
    url: 'https://www.typescriptlang.org/docs/',
    description: 'The TypeScript Handbook',
    tags: [
      { name: 'typescript', color: '#3178c6' },
      { name: 'javascript', color: '#f7df1e' },
      { name: 'documentation', color: '#6366f1' },
      { name: 'important', color: '#f59e0b' }
    ],
    createdAt: '2 weeks ago',
    favicon: 'https://www.typescriptlang.org/favicon.ico',
    category: 'Documentation'
  },
  {
    id: 'bm_13',
    title: 'Kubernetes Documentation',
    url: 'https://kubernetes.io/docs/',
    description: 'Production-grade container orchestration',
    tags: [
      { name: 'kubernetes', color: '#326ce5' },
      { name: 'devops', color: '#ff6b6b' },
      { name: 'containers', color: '#4ecdc4' },
      { name: 'orchestration', color: '#8b5cf6' }
    ],
    createdAt: '3 days ago',
    favicon: 'https://kubernetes.io/favicon.ico',
    category: 'DevOps'
  },
  {
    id: 'bm_14',
    title: 'AWS Documentation',
    url: 'https://docs.aws.amazon.com/',
    description: 'Amazon Web Services documentation',
    tags: [
      { name: 'cloud', color: '#ff9900' },
      { name: 'aws', color: '#ff9900' },
      { name: 'infrastructure', color: '#10b981' },
      { name: 'documentation', color: '#6366f1' }
    ],
    createdAt: '1 week ago',
    favicon: 'https://docs.aws.amazon.com/favicon.ico',
    category: 'Cloud'
  },
  {
    id: 'bm_15',
    title: 'Node.js Documentation',
    url: 'https://nodejs.org/docs/',
    description: 'Official Node.js documentation',
    tags: [
      { name: 'nodejs', color: '#339933' },
      { name: 'javascript', color: '#f7df1e' },
      { name: 'backend', color: '#10b981' },
      { name: 'runtime', color: '#8b5cf6' }
    ],
    createdAt: '4 days ago',
    favicon: 'https://nodejs.org/favicon.ico',
    category: 'Development'
  }
];

export const mockTasks: MockTask[] = [
  {
    id: 'task_1',
    title: 'Complete API documentation',
    description: 'Write comprehensive documentation for all API endpoints',
    status: 'in_progress',
    priority: 'high',
    dueDate: '2024-02-15',
    tags: [
      { name: 'documentation', color: '#6366f1' },
      { name: 'api', color: '#0ea5e9' }
    ],
    createdAt: '1 week ago',
    estimatedTime: 8,
    actualTime: 3,
    projectId: 'proj_1',
    assignee: 'John Doe'
  },
  {
    id: 'task_2',
    title: 'Fix responsive design issues',
    description: 'Resolve mobile layout problems on dashboard',
    status: 'pending',
    priority: 'medium',
    dueDate: '2024-02-10',
    tags: [
      { name: 'frontend', color: '#f97316' },
      { name: 'css', color: '#06b6d4' }
    ],
    createdAt: '3 days ago',
    estimatedTime: 4,
    projectId: 'proj_2'
  },
  {
    id: 'task_3',
    title: 'Deploy to production',
    description: 'Deploy latest changes to production environment',
    status: 'completed',
    priority: 'high',
    dueDate: '2024-02-01',
    tags: [
      { name: 'deployment', color: '#10b981' },
      { name: 'devops', color: '#ff6b6b' }
    ],
    createdAt: '2 weeks ago',
    completedAt: '2024-02-01',
    estimatedTime: 2,
    actualTime: 1.5,
    projectId: 'proj_1'
  },
  {
    id: 'task_4',
    title: 'Review pull requests',
    description: 'Review and merge pending pull requests',
    status: 'pending',
    priority: 'medium',
    dueDate: '2024-02-08',
    tags: [
      { name: 'review', color: '#8b5cf6' },
      { name: 'github', color: '#3dd97a' }
    ],
    createdAt: '1 day ago',
    estimatedTime: 3,
    projectId: 'proj_1'
  },
  {
    id: 'task_5',
    title: 'Update dependencies',
    description: 'Update all npm packages to latest stable versions',
    status: 'pending',
    priority: 'low',
    dueDate: '2024-02-20',
    tags: [
      { name: 'maintenance', color: '#f59e0b' },
      { name: 'npm', color: '#cb3837' }
    ],
    createdAt: '5 days ago',
    estimatedTime: 2,
    projectId: 'proj_2'
  },
  {
    id: 'task_6',
    title: 'Write unit tests',
    description: 'Create unit tests for authentication module',
    status: 'completed',
    priority: 'medium',
    dueDate: '2024-01-30',
    tags: [
      { name: 'testing', color: '#ec4899' },
      { name: 'quality', color: '#84cc16' }
    ],
    createdAt: '3 weeks ago',
    completedAt: '2024-01-30',
    estimatedTime: 6,
    actualTime: 5,
    projectId: 'proj_1'
  },
  // Add more completed tasks to reach 28 total
  {
    id: 'task_7',
    title: 'Set up CI/CD pipeline',
    description: 'Configure automated testing and deployment',
    status: 'completed',
    priority: 'high',
    dueDate: '2024-01-25',
    tags: [
      { name: 'devops', color: '#ff6b6b' },
      { name: 'automation', color: '#10b981' }
    ],
    createdAt: '3 weeks ago',
    completedAt: '2024-01-25',
    estimatedTime: 4,
    actualTime: 3,
    projectId: 'proj_1'
  },
  {
    id: 'task_8',
    title: 'Database optimization',
    description: 'Improve query performance and add indexes',
    status: 'completed',
    priority: 'medium',
    dueDate: '2024-01-20',
    tags: [
      { name: 'database', color: '#8b5cf6' },
      { name: 'performance', color: '#f59e0b' }
    ],
    createdAt: '4 weeks ago',
    completedAt: '2024-01-20',
    estimatedTime: 6,
    actualTime: 5,
    projectId: 'proj_2'
  },
  {
    id: 'task_9',
    title: 'Implement user authentication',
    description: 'Add JWT-based authentication system',
    status: 'completed',
    priority: 'high',
    dueDate: '2024-01-18',
    tags: [
      { name: 'security', color: '#ef4444' },
      { name: 'backend', color: '#3b82f6' }
    ],
    createdAt: '1 month ago',
    completedAt: '2024-01-18',
    estimatedTime: 8,
    actualTime: 7,
    projectId: 'proj_1'
  },
  {
    id: 'task_10',
    title: 'Create user dashboard',
    description: 'Build main dashboard with statistics',
    status: 'completed',
    priority: 'high',
    dueDate: '2024-01-15',
    tags: [
      { name: 'frontend', color: '#f97316' },
      { name: 'ui', color: '#06b6d4' }
    ],
    createdAt: '1 month ago',
    completedAt: '2024-01-15',
    estimatedTime: 10,
    actualTime: 8,
    projectId: 'proj_2'
  },
  {
    id: 'task_11',
    title: 'Set up testing framework',
    description: 'Configure Jest and Cypress for testing',
    status: 'completed',
    priority: 'medium',
    dueDate: '2024-01-12',
    tags: [
      { name: 'testing', color: '#ec4899' },
      { name: 'quality', color: '#84cc16' }
    ],
    createdAt: '1 month ago',
    completedAt: '2024-01-12',
    estimatedTime: 5,
    actualTime: 4,
    projectId: 'proj_1'
  },
  {
    id: 'task_12',
    title: 'API rate limiting',
    description: 'Implement rate limiting for API endpoints',
    status: 'completed',
    priority: 'medium',
    dueDate: '2024-01-10',
    tags: [
      { name: 'api', color: '#0ea5e9' },
      { name: 'security', color: '#ef4444' }
    ],
    createdAt: '1 month ago',
    completedAt: '2024-01-10',
    estimatedTime: 3,
    actualTime: 2,
    projectId: 'proj_2'
  },
  {
    id: 'task_13',
    title: 'Mobile responsive design',
    description: 'Make all components mobile-friendly',
    status: 'completed',
    priority: 'high',
    dueDate: '2024-01-08',
    tags: [
      { name: 'mobile', color: '#8b5cf6' },
      { name: 'css', color: '#06b6d4' }
    ],
    createdAt: '1 month ago',
    completedAt: '2024-01-08',
    estimatedTime: 12,
    actualTime: 10,
    projectId: 'proj_1'
  },
  {
    id: 'task_14',
    title: 'Add file upload feature',
    description: 'Implement drag-and-drop file upload',
    status: 'completed',
    priority: 'medium',
    dueDate: '2024-01-05',
    tags: [
      { name: 'files', color: '#f59e0b' },
      { name: 'frontend', color: '#f97316' }
    ],
    createdAt: '1 month ago',
    completedAt: '2024-01-05',
    estimatedTime: 6,
    actualTime: 5,
    projectId: 'proj_2'
  },
  {
    id: 'task_15',
    title: 'Search functionality',
    description: 'Add global search across all content',
    status: 'completed',
    priority: 'medium',
    dueDate: '2024-01-03',
    tags: [
      { name: 'search', color: '#10b981' },
      { name: 'feature', color: '#8b5cf6' }
    ],
    createdAt: '1 month ago',
    completedAt: '2024-01-03',
    estimatedTime: 8,
    actualTime: 7,
    projectId: 'proj_1'
  },
  {
    id: 'task_16',
    title: 'Email notifications',
    description: 'Set up email notification system',
    status: 'completed',
    priority: 'low',
    dueDate: '2024-01-01',
    tags: [
      { name: 'email', color: '#3b82f6' },
      { name: 'notifications', color: '#ec4899' }
    ],
    createdAt: '1 month ago',
    completedAt: '2024-01-01',
    estimatedTime: 4,
    actualTime: 3,
    projectId: 'proj_2'
  },
  {
    id: 'task_17',
    title: 'Data backup system',
    description: 'Implement automated data backups',
    status: 'completed',
    priority: 'high',
    dueDate: '2023-12-28',
    tags: [
      { name: 'backup', color: '#ef4444' },
      { name: 'data', color: '#8b5cf6' }
    ],
    createdAt: '1 month ago',
    completedAt: '2023-12-28',
    estimatedTime: 5,
    actualTime: 4,
    projectId: 'proj_1'
  },
  {
    id: 'task_18',
    title: 'Performance monitoring',
    description: 'Add application performance monitoring',
    status: 'completed',
    priority: 'medium',
    dueDate: '2023-12-25',
    tags: [
      { name: 'monitoring', color: '#06b6d4' },
      { name: 'performance', color: '#f59e0b' }
    ],
    createdAt: '1 month ago',
    completedAt: '2023-12-25',
    estimatedTime: 6,
    actualTime: 5,
    projectId: 'proj_2'
  },
  {
    id: 'task_19',
    title: 'User profile management',
    description: 'Create user profile and settings pages',
    status: 'completed',
    priority: 'medium',
    dueDate: '2023-12-22',
    tags: [
      { name: 'profile', color: '#84cc16' },
      { name: 'settings', color: '#f97316' }
    ],
    createdAt: '1 month ago',
    completedAt: '2023-12-22',
    estimatedTime: 7,
    actualTime: 6,
    projectId: 'proj_1'
  },
  {
    id: 'task_20',
    title: 'API documentation',
    description: 'Write comprehensive API documentation',
    status: 'completed',
    priority: 'low',
    dueDate: '2023-12-20',
    tags: [
      { name: 'documentation', color: '#6366f1' },
      { name: 'api', color: '#0ea5e9' }
    ],
    createdAt: '1 month ago',
    completedAt: '2023-12-20',
    estimatedTime: 4,
    actualTime: 3,
    projectId: 'proj_2'
  },
  {
    id: 'task_21',
    title: 'Error handling',
    description: 'Implement comprehensive error handling',
    status: 'completed',
    priority: 'medium',
    dueDate: '2023-12-18',
    tags: [
      { name: 'error-handling', color: '#ef4444' },
      { name: 'backend', color: '#3b82f6' }
    ],
    createdAt: '1 month ago',
    completedAt: '2023-12-18',
    estimatedTime: 5,
    actualTime: 4,
    projectId: 'proj_1'
  },
  {
    id: 'task_22',
    title: 'Cache implementation',
    description: 'Add Redis caching for performance',
    status: 'completed',
    priority: 'medium',
    dueDate: '2023-12-15',
    tags: [
      { name: 'cache', color: '#8b5cf6' },
      { name: 'performance', color: '#f59e0b' }
    ],
    createdAt: '1 month ago',
    completedAt: '2023-12-15',
    estimatedTime: 6,
    actualTime: 5,
    projectId: 'proj_2'
  },
  {
    id: 'task_23',
    title: 'Social login integration',
    description: 'Add OAuth social login options',
    status: 'completed',
    priority: 'low',
    dueDate: '2023-12-12',
    tags: [
      { name: 'oauth', color: '#10b981' },
      { name: 'authentication', color: '#ef4444' }
    ],
    createdAt: '1 month ago',
    completedAt: '2023-12-12',
    estimatedTime: 8,
    actualTime: 7,
    projectId: 'proj_1'
  },
  {
    id: 'task_24',
    title: 'Dark mode theme',
    description: 'Implement dark mode across the application',
    status: 'completed',
    priority: 'low',
    dueDate: '2023-12-10',
    tags: [
      { name: 'theme', color: '#6366f1' },
      { name: 'ui', color: '#06b6d4' }
    ],
    createdAt: '1 month ago',
    completedAt: '2023-12-10',
    estimatedTime: 5,
    actualTime: 4,
    projectId: 'proj_2'
  },
  {
    id: 'task_25',
    title: 'Activity logging',
    description: 'Track user activities and changes',
    status: 'completed',
    priority: 'medium',
    dueDate: '2023-12-08',
    tags: [
      { name: 'logging', color: '#ec4899' },
      { name: 'audit', color: '#84cc16' }
    ],
    createdAt: '1 month ago',
    completedAt: '2023-12-08',
    estimatedTime: 4,
    actualTime: 3,
    projectId: 'proj_1'
  },
  {
    id: 'task_26',
    title: 'Tag management system',
    description: 'Implement tagging for all content types',
    status: 'completed',
    priority: 'medium',
    dueDate: '2023-12-05',
    tags: [
      { name: 'tags', color: '#f59e0b' },
      { name: 'organization', color: '#8b5cf6' }
    ],
    createdAt: '1 month ago',
    completedAt: '2023-12-05',
    estimatedTime: 7,
    actualTime: 6,
    projectId: 'proj_2'
  },
  {
    id: 'task_27',
    title: 'WebSocket real-time updates',
    description: 'Add real-time notifications via WebSocket',
    status: 'completed',
    priority: 'low',
    dueDate: '2023-12-03',
    tags: [
      { name: 'websocket', color: '#3b82f6' },
      { name: 'realtime', color: '#10b981' }
    ],
    createdAt: '1 month ago',
    completedAt: '2023-12-03',
    estimatedTime: 9,
    actualTime: 8,
    projectId: 'proj_1'
  },
  {
    id: 'task_28',
    title: 'Security audit',
    description: 'Complete security audit and fixes',
    status: 'completed',
    priority: 'high',
    dueDate: '2023-12-01',
    tags: [
      { name: 'security', color: '#ef4444' },
      { name: 'audit', color: '#ec4899' }
    ],
    createdAt: '1 month ago',
    completedAt: '2023-12-01',
    estimatedTime: 6,
    actualTime: 5,
    projectId: 'proj_2'
  }
];

export const mockNotes: MockNote[] = [
  {
    id: 'note_1',
    title: 'Meeting Notes - Q1 Planning',
    content: '# Q1 Planning Meeting\n\n## Attendees\n- John (PM)\n- Sarah (Dev Lead)\n- Mike (Designer)\n\n## Key Decisions\n1. Focus on mobile app development\n2. Implement AI features\n3. Improve user onboarding\n\n## Action Items\n- [ ] Create roadmap\n- [ ] Set up development environment\n- [ ] Design mockups\n\n## Timeline\n- Week 1-2: Research and planning\n- Week 3-4: Development sprint 1\n- Week 5-6: Testing and refinement',
    tags: [
      { name: 'meeting', color: '#ef4444' },
      { name: 'planning', color: '#3b82f6' },
      { name: 'important', color: '#f59e0b' }
    ],
    createdAt: '2 days ago',
    updatedAt: '1 day ago',
    isMarkdown: true,
    folder: 'Work'
  },
  {
    id: 'note_2',
    title: 'Project Ideas',
    content: 'Potential project ideas for 2024:\n\n1. AI-powered task manager\n   - Natural language processing\n   - Smart prioritization\n   - Team collaboration features\n\n2. Social media analytics tool\n   - Real-time metrics\n   - Sentiment analysis\n   - Competitor tracking\n\n3. Real-time collaboration platform\n   - Live editing\n   - Video conferencing\n   - Screen sharing\n\n4. Personal finance tracker\n   - Budget planning\n   - Investment tracking\n   - Expense categorization\n\n5. Learning management system\n   - Course creation\n   - Progress tracking\n   - Interactive quizzes',
    tags: [
      { name: 'ideas', color: '#8b5cf6' },
      { name: 'brainstorm', color: '#ec4899' }
    ],
    createdAt: '1 week ago',
    updatedAt: '3 days ago',
    isMarkdown: false,
    folder: 'Personal'
  },
  {
    id: 'note_3',
    title: 'Technical Architecture Decisions',
    content: '# Architecture Overview\n\n## Frontend\n- **SolidJS** for reactive UI\n- **TailwindCSS** for styling\n- **Vite** for build tool\n\n## Backend\n- **Go** with Gin framework\n- **PostgreSQL** database\n- **Redis** for caching\n\n## Deployment\n- **Docker** containers\n- **Kubernetes** orchestration\n- **AWS** hosting\n\n```go\nfunc main() {\n    fmt.Println("Hello, Trackeep!")\n}\n```\n\n## Key Considerations\n- Scalability\n- Security\n- Performance\n- Maintainability',
    tags: [
      { name: 'technical', color: '#f97316' },
      { name: 'architecture', color: '#06b6d4' },
      { name: 'pinned', color: '#ef4444' }
    ],
    createdAt: '2 weeks ago',
    updatedAt: '1 week ago',
    isMarkdown: true,
    folder: 'Technical'
  },
  {
    id: 'note_4',
    title: 'Shopping List',
    content: 'Grocery shopping for this week:\n\n🥬 Vegetables:\n- Spinach\n- Bell peppers\n- Carrots\n- Broccoli\n\n🍎 Fruits:\n- Apples\n- Bananas\n- Oranges\n- Berries\n\n🥩 Proteins:\n- Chicken breast\n- Ground beef\n- Salmon\n- Eggs\n\n🥛 Dairy:\n- Milk\n- Greek yogurt\n- Cheese\n- Butter\n\n🍞 Pantry:\n- Bread\n- Rice\n- Pasta\n- Olive oil',
    tags: [
      { name: 'personal', color: '#84cc16' },
      { name: 'shopping', color: '#10b981' }
    ],
    createdAt: '3 days ago',
    updatedAt: '3 days ago',
    isMarkdown: false,
    folder: 'Personal'
  },
  {
    id: 'note_5',
    title: 'Book Recommendations',
    content: '# Books to Read\n\n## Technical Books\n1. **"Clean Code"** by Robert C. Martin\n   - Essential for software developers\n   - Focus on writing maintainable code\n\n2. **"Design Patterns"** by Gang of Four\n   - Classic software design patterns\n   - Object-oriented design principles\n\n3. **"The Pragmatic Programmer"** by David Thomas & Andrew Hunt\n   - Practical programming advice\n   - Career development tips\n\n## Business Books\n1. **"Atomic Habits"** by James Clear\n   - Building good habits\n   - Breaking bad habits\n\n2. **"Deep Work"** by Cal Newport\n   - Focus and productivity\n   - Meaningful work strategies\n\n> "Reading is to the mind what exercise is to the body." - Joseph Addison',
    tags: [
      { name: 'books', color: '#3b82f6' },
      { name: 'learning', color: '#8b5cf6' },
      { name: 'recommendations', color: '#ec4899' }
    ],
    createdAt: '5 days ago',
    updatedAt: '2 days ago',
    isMarkdown: true,
    folder: 'Personal'
  },
  {
    id: 'note_6',
    title: 'Workout Routine',
    content: 'Weekly workout schedule:\n\n## Monday - Chest & Triceps\n- Bench press: 4x8-10\n- Incline dumbbell press: 3x10-12\n- Cable flyes: 3x12-15\n- Tricep pushdowns: 4x10-12\n- Overhead tricep extension: 3x10-12\n\n## Tuesday - Back & Biceps\n- Pull-ups: 4x8-10\n- Bent-over rows: 4x8-10\n- Lat pulldowns: 3x10-12\n- Barbell curls: 4x10-12\n- Hammer curls: 3x10-12\n\n## Wednesday - Rest or Light Cardio\n- 30 min treadmill\n- Stretching\n\n## Thursday - Legs & Shoulders\n- Squats: 4x8-10\n- Leg press: 3x12-15\n- Leg curls: 3x12-15\n- Shoulder press: 4x8-10\n- Lateral raises: 3x12-15\n\n## Friday - Arms & Core\n- Bicep curls: 4x10-12\n- Tricep dips: 3x10-15\n- Planks: 3x60 seconds\n- Crunches: 3x15-20\n\nRemember: Progressive overload is key!',
    tags: [
      { name: 'fitness', color: '#10b981' },
      { name: 'health', color: '#84cc16' },
      { name: 'routine', color: '#f59e0b' }
    ],
    createdAt: '1 week ago',
    updatedAt: '4 days ago',
    isMarkdown: false,
    folder: 'Health'
  },
  {
    id: 'note_7',
    title: 'Travel Plans - Europe 2024',
    content: '# Europe Trip 2024\n\n## Destinations\n### Paris, France (3 days)\n- Eiffel Tower\n- Louvre Museum\n- Notre-Dame Cathedral\n- Champs-Élysées\n\n### Rome, Italy (3 days)\n- Colosseum\n- Vatican City\n- Trevi Fountain\n- Roman Forum\n\n### Barcelona, Spain (2 days)\n- Sagrada Família\n- Park Güell\n- Gothic Quarter\n- Beach time\n\n### Amsterdam, Netherlands (2 days)\n- Anne Frank House\n- Van Gogh Museum\n- Canal cruise\n- Bike tour\n\n## Budget\n- Flights: $800\n- Accommodation: $1200\n- Food & Activities: $1000\n- Total: ~$3000\n\n## Checklist\n- [ ] Passport valid\n- [ ] Travel insurance\n- [ ] Book accommodations\n- [ ] Plan itinerary\n- [ ] Pack essentials',
    tags: [
      { name: 'travel', color: '#06b6d4' },
      { name: 'planning', color: '#3b82f6' },
      { name: 'europe', color: '#ec4899' },
      { name: 'important', color: '#f59e0b' }
    ],
    createdAt: '2 weeks ago',
    updatedAt: '1 week ago',
    isMarkdown: true,
    folder: 'Personal'
  },
  {
    id: 'note_8',
    title: 'Recipe: Grandma\'s Chocolate Chip Cookies',
    content: 'Ingredients:\n- 2 1/4 cups all-purpose flour\n- 1 tsp baking soda\n- 1 tsp salt\n- 1 cup butter, softened\n- 3/4 cup granulated sugar\n- 3/4 cup packed brown sugar\n- 2 large eggs\n- 2 tsp vanilla extract\n- 2 cups chocolate chips\n\nInstructions:\n1. Preheat oven to 375°F (190°C)\n2. Mix flour, baking soda, and salt in a bowl\n3. Beat butter and sugars until creamy\n4. Add eggs and vanilla, beat well\n5. Gradually blend in flour mixture\n6. Stir in chocolate chips\n7. Drop rounded tablespoons onto ungreased baking sheets\n8. Bake for 9-11 minutes or until golden brown\n9. Cool on baking sheets for 2 minutes\n10. Remove to wire rack to cool completely\n\nMakes about 5 dozen cookies. Enjoy!',
    tags: [
      { name: 'recipe', color: '#f97316' },
      { name: 'cooking', color: '#ef4444' },
      { name: 'family', color: '#ec4899' }
    ],
    createdAt: '6 days ago',
    updatedAt: '6 days ago',
    isMarkdown: false,
    folder: 'Recipes'
  }
];

export const mockTimeEntries: MockTimeEntry[] = [
  {
    id: 'time_1',
    description: 'API documentation writing',
    startTime: '09:00',
    endTime: '11:30',
    duration: 9000, // 2.5 hours in seconds
    billable: true,
    hourlyRate: 75,
    projectId: 'proj_1',
    taskId: 'task_1',
    tags: ['documentation', 'api'],
    date: new Date().toISOString().split('T')[0] // Today's date
  },
  {
    id: 'time_2',
    description: 'Bug fixes - responsive layout',
    startTime: '13:00',
    endTime: '15:45',
    duration: 9900, // 2.75 hours in seconds
    billable: true,
    hourlyRate: 75,
    projectId: 'proj_2',
    taskId: 'task_2',
    tags: ['frontend', 'css', 'bugfix'],
    date: new Date().toISOString().split('T')[0] // Today's date
  },
  {
    id: 'time_3',
    description: 'Team meeting - project planning',
    startTime: '10:00',
    endTime: '11:00',
    duration: 3600, // 1 hour in seconds
    billable: false,
    tags: ['meeting', 'planning', 'team'],
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0] // Yesterday
  },
  {
    id: 'time_4',
    description: 'Code review and testing',
    startTime: '14:00',
    endTime: '16:30',
    duration: 9000, // 2.5 hours in seconds
    billable: true,
    hourlyRate: 75,
    projectId: 'proj_1',
    tags: ['review', 'testing', 'quality'],
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0] // Yesterday
  },
  {
    id: 'time_5',
    description: 'Feature development - user authentication',
    startTime: '09:30',
    endTime: '12:00',
    duration: 8100, // 2.25 hours in seconds
    billable: true,
    hourlyRate: 85,
    projectId: 'proj_1',
    tags: ['development', 'security', 'backend'],
    date: new Date(Date.now() - 172800000).toISOString().split('T')[0] // 2 days ago
  },
  {
    id: 'time_6',
    description: 'Database optimization and indexing',
    startTime: '13:00',
    endTime: '15:00',
    duration: 7200, // 2 hours in seconds
    billable: true,
    hourlyRate: 90,
    projectId: 'proj_2',
    tags: ['database', 'performance', 'optimization'],
    date: new Date(Date.now() - 172800000).toISOString().split('T')[0] // 2 days ago
  },
  {
    id: 'time_7',
    description: 'Client call - project requirements',
    startTime: '11:00',
    endTime: '12:00',
    duration: 3600, // 1 hour in seconds
    billable: true,
    hourlyRate: 100,
    tags: ['client', 'meeting', 'requirements'],
    date: new Date(Date.now() - 259200000).toISOString().split('T')[0] // 3 days ago
  },
  {
    id: 'time_8',
    description: 'UI/UX design improvements',
    startTime: '14:00',
    endTime: '17:30',
    duration: 12600, // 3.5 hours in seconds
    billable: true,
    hourlyRate: 80,
    projectId: 'proj_2',
    tags: ['design', 'ui', 'ux', 'frontend'],
    date: new Date(Date.now() - 259200000).toISOString().split('T')[0] // 3 days ago
  }
];

export const mockVideos: MockVideo[] = [
  {
    id: 'dQw4w9WgXcQ',
    title: 'Never Gonna Give You Up (Official Music Video)',
    description: 'Rick Astley\'s official music video for "Never Gonna Give You Up"',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    duration: '3:33',
    channel: 'Rick Astley',
    channelId: 'UCuAXFkgsw1L7xaCfnd5JJOw',
    publishedAt: '15 years ago',
    tags: [
      { name: 'music', color: '#ef4444' },
      { name: 'classic', color: '#f59e0b' }
    ],
    category: 'Music'
  },
  {
    id: 'fqlT0iSLUjQ',
    title: 'NetworkChuck - Network Fundamentals',
    description: 'Learn the basics of computer networking from NetworkChuck',
    url: 'https://www.youtube.com/watch?v=fqlT0iSLUjQ',
    thumbnail: 'https://img.youtube.com/vi/fqlT0iSLUjQ/maxresdefault.jpg',
    duration: '15:42',
    channel: 'NetworkChuck',
    channelId: 'UCX-x3TQp3-nLZyvRo8dHqOg',
    publishedAt: '2 weeks ago',
    tags: [
      { name: 'networking', color: '#3b82f6' },
      { name: 'tutorial', color: '#10b981' },
      { name: 'IT', color: '#8b5cf6' }
    ],
    category: 'Technology'
  },
  {
    id: 'qwf1WiVq50c',
    title: 'Fireship - 100 Seconds of Code',
    description: 'Learn programming concepts in 100 seconds',
    url: 'https://www.youtube.com/watch?v=qwf1WiVq50c',
    thumbnail: 'https://img.youtube.com/vi/qwf1WiVq50c/maxresdefault.jpg',
    duration: '1:40',
    channel: 'Fireship',
    channelId: 'UCsBjURrPoezykLs-8AyMmfQ',
    publishedAt: '3 days ago',
    tags: [
      { name: 'programming', color: '#f97316' },
      { name: 'tutorial', color: '#10b981' },
      { name: 'javascript', color: '#f7df1e' }
    ],
    category: 'Programming'
  },
  {
    id: 'S66Wz0qp43s',
    title: 'The Primeagen - Why you should learn Neovim',
    description: 'The Primeagen explains why Neovim is the best editor',
    url: 'https://www.youtube.com/watch?v=S66Wz0qp43s',
    thumbnail: 'https://img.youtube.com/vi/S66Wz0qp43s/maxresdefault.jpg',
    duration: '12:18',
    channel: 'The Primeagen',
    channelId: 'UC_7qpfK-uiF6fd9HJ3pO1RQ',
    publishedAt: '1 week ago',
    tags: [
      { name: 'neovim', color: '#10b981' },
      { name: 'editor', color: '#06b6d4' },
      { name: 'productivity', color: '#8b5cf6' }
    ],
    category: 'Programming'
  },
  {
    id: 'gzJCMK8V5qk',
    title: 'Theo - t3.gg - The Problem with Modern Web Development',
    description: 'Theo discusses issues in modern web development',
    url: 'https://www.youtube.com/watch?v=gzJCMK8V5qk',
    thumbnail: 'https://img.youtube.com/vi/gzJCMK8V5qk/maxresdefault.jpg',
    duration: '18:22',
    channel: 'Theo - t3.gg',
    channelId: 'UCtMZVZ4I3Ez7nXwkSdLD_Ag',
    publishedAt: '4 days ago',
    tags: [
      { name: 'webdev', color: '#61dafb' },
      { name: 'opinion', color: '#ec4899' },
      { name: 'tech', color: '#8b5cf6' }
    ],
    category: 'Technology'
  },
  {
    id: 'EerdGm-ehJQ',
    title: 'Web Dev Simplified - SolidJS Tutorial',
    description: 'Complete guide to learning SolidJS',
    url: 'https://www.youtube.com/watch?v=EerdGm-ehJQ',
    thumbnail: 'https://img.youtube.com/vi/EerdGm-ehJQ/maxresdefault.jpg',
    duration: '45:30',
    channel: 'Web Dev Simplified',
    channelId: 'UC8butISFwT-Wy7pm24E6Icg',
    publishedAt: '1 month ago',
    tags: [
      { name: 'solidjs', color: '#61dafb' },
      { name: 'tutorial', color: '#10b981' },
      { name: 'javascript', color: '#f7df1e' }
    ],
    category: 'Programming'
  },
  {
    id: 'sGwj3BMDelw',
    title: 'Traversy Media - MERN Stack Course 2024',
    description: 'Complete MERN stack development course',
    url: 'https://www.youtube.com/watch?v=sGwj3BMDelw',
    thumbnail: 'https://img.youtube.com/vi/sGwj3BMDelw/maxresdefault.jpg',
    duration: '2:15:45',
    channel: 'Traversy Media',
    channelId: 'UC29ju8bIPH5asbjO2y61XqQ',
    publishedAt: '2 weeks ago',
    tags: [
      { name: 'mern', color: '#10b981' },
      { name: 'fullstack', color: '#3b82f6' },
      { name: 'course', color: '#f59e0b' }
    ],
    category: 'Programming'
  },
  {
    id: 'W6NZfCO5SIk',
    title: 'Programming with Mosh - Go Programming Tutorial',
    description: 'Complete Go programming tutorial for beginners',
    url: 'https://www.youtube.com/watch?v=W6NZfCO5SIk',
    thumbnail: 'https://img.youtube.com/vi/W6NZfCO5SIk/maxresdefault.jpg',
    duration: '3:30:20',
    channel: 'Programming with Mosh',
    channelId: 'UCWv7vHwRQdGJtU2i9hJ8X7A',
    publishedAt: '3 weeks ago',
    tags: [
      { name: 'golang', color: '#00add8' },
      { name: 'tutorial', color: '#10b981' },
      { name: 'programming', color: '#8b5cf6' }
    ],
    category: 'Programming'
  },
  {
    id: 'BdL2CzyUHio',
    title: 'TechWorld with Nana - Docker Tutorial for Beginners',
    description: 'Complete Docker tutorial for absolute beginners',
    url: 'https://www.youtube.com/watch?v=BdL2CzyUHio',
    thumbnail: 'https://img.youtube.com/vi/BdL2CzyUHio/maxresdefault.jpg',
    duration: '1:45:30',
    channel: 'TechWorld with Nana',
    channelId: 'UCtK95O1s-s2YBZlgea8g2Qg',
    publishedAt: '1 month ago',
    tags: [
      { name: 'docker', color: '#2496ed' },
      { name: 'devops', color: '#ff6b6b' },
      { name: 'tutorial', color: '#10b981' }
    ],
    category: 'DevOps'
  },
  {
    id: 'yQNjK2A5RxI',
    title: 'Fireship 100 Seconds - React in 100 Seconds',
    description: 'Learn React framework in 100 seconds',
    url: 'https://www.youtube.com/watch?v=yQNjK2A5RxI',
    thumbnail: 'https://img.youtube.com/vi/yQNjK2A5RxI/maxresdefault.jpg',
    duration: '1:40',
    channel: 'Fireship 100 Seconds',
    channelId: 'UC9PQ5_tPj4pqtj-o5AqU52Q',
    publishedAt: '5 days ago',
    tags: [
      { name: 'react', color: '#61dafb' },
      { name: 'javascript', color: '#f7df1e' },
      { name: 'framework', color: '#06b6d4' }
    ],
    category: 'Programming'
  },
  {
    id: 'jNQXAC9IVRw',
    title: 'Katherine Oelsner - SolidJS Fundamentals',
    description: 'Complete introduction to SolidJS framework',
    url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    thumbnail: 'https://img.youtube.com/vi/jNQXAC9IVRw/maxresdefault.jpg',
    duration: '25:30',
    channel: 'Katherine Oelsner',
    channelId: 'UCQy_t21uERz3LrNm3j2yG6A',
    publishedAt: '1 week ago',
    tags: [
      { name: 'solidjs', color: '#61dafb' },
      { name: 'javascript', color: '#f7df1e' },
      { name: 'framework', color: '#8b5cf6' }
    ],
    category: 'Programming'
  },
  {
    id: 'hB0qy8iWq4M',
    title: 'Ryan Dahl - Node.js Introduction',
    description: 'Creator of NodeJS explains the fundamentals',
    url: 'https://www.youtube.com/watch?v=hB0qy8iWq4M',
    thumbnail: 'https://img.youtube.com/vi/hB0qy8iWq4M/maxresdefault.jpg',
    duration: '45:15',
    channel: 'Node.js',
    channelId: 'UCnUYqPL1RdJhM6uqKp2rfgQ',
    publishedAt: '2 weeks ago',
    tags: [
      { name: 'nodejs', color: '#339933' },
      { name: 'javascript', color: '#f7df1e' },
      { name: 'backend', color: '#10b981' }
    ],
    category: 'Programming'
  },
  {
    id: 'kWTXqZg3Z4M',
    title: 'David Fowler - Architecture at Microsoft',
    description: 'Microsoft CTO discusses software architecture patterns',
    url: 'https://www.youtube.com/watch?v=kWTXqZg3Z4M',
    thumbnail: 'https://img.youtube.com/vi/kWTXqZg3Z4M/maxresdefault.jpg',
    duration: '1:15:30',
    channel: 'Microsoft',
    channelId: 'UCFRy6eLbVtA8y5w2LpZw2Q',
    publishedAt: '3 days ago',
    tags: [
      { name: 'architecture', color: '#06b6d4' },
      { name: 'software', color: '#8b5cf6' },
      { name: 'microsoft', color: '#0078d4' }
    ],
    category: 'Technology'
  },
  {
    id: 'lJtRqZg3Z4M',
    title: 'Linus Torvalds - Git Development History',
    description: 'Creator of Git explains the development process',
    url: 'https://www.youtube.com/watch?v=lJtRqZg3Z4M',
    thumbnail: 'https://img.youtube.com/vi/lJtRqZg3Z4M/maxresdefault.jpg',
    duration: '55:20',
    channel: 'Linux Foundation',
    channelId: 'UC3rC4U8gO9gB5gFhTQ2pQ',
    publishedAt: '1 month ago',
    tags: [
      { name: 'git', color: '#f05032' },
      { name: 'version-control', color: '#10b981' },
      { name: 'development', color: '#8b5cf6' }
    ],
    category: 'Technology'
  }
];

export const mockLearningPaths: MockLearningPath[] = [
  {
    id: 'lp_1',
    title: 'Full Stack Web Development',
    description: 'Become a full stack developer with modern technologies like React, Node.js, and cloud deployment',
    category: 'Web Development',
    difficulty: 'intermediate',
    estimatedTime: '12 weeks',
    progress: 35,
    modules: [
      {
        id: 'mod_1',
        title: 'Frontend Fundamentals',
        description: 'HTML, CSS, and JavaScript basics',
        completed: true,
        resources: [
          { type: 'video', title: 'HTML & CSS Crash Course', url: 'https://example.com/html-css' },
          { type: 'article', title: 'JavaScript Fundamentals', url: 'https://example.com/js-basics' }
        ]
      },
      {
        id: 'mod_2',
        title: 'Modern Frontend Frameworks',
        description: 'React, Vue, or SolidJS',
        completed: true,
        resources: [
          { type: 'video', title: 'SolidJS Complete Guide', url: 'https://example.com/solidjs' },
          { type: 'project', title: 'Build a Todo App', url: 'https://example.com/todo-project' }
        ]
      },
      {
        id: 'mod_3',
        title: 'Backend Development',
        description: 'Node.js, Python, or Go',
        completed: false,
        resources: [
          { type: 'video', title: 'Go Backend Tutorial', url: 'https://example.com/go-backend' },
          { type: 'article', title: 'REST API Design', url: 'https://example.com/rest-api' }
        ]
      }
    ],
    tags: [
      { name: 'webdev', color: '#61dafb' },
      { name: 'fullstack', color: '#10b981' }
    ],
    createdAt: '1 month ago',
    enrolledAt: '3 weeks ago'
  },
  {
    id: 'lp_2',
    title: 'DevOps and Cloud Computing',
    description: 'Master deployment, scaling, and infrastructure management with Docker, Kubernetes, and cloud platforms',
    category: 'DevOps',
    difficulty: 'advanced',
    estimatedTime: '8 weeks',
    progress: 60,
    modules: [
      {
        id: 'mod_4',
        title: 'Containerization with Docker',
        description: 'Docker fundamentals and best practices',
        completed: true,
        resources: [
          { type: 'video', title: 'Docker Complete Course', url: 'https://example.com/docker' },
          { type: 'lab', title: 'Docker Hands-on Lab', url: 'https://example.com/docker-lab' }
        ]
      },
      {
        id: 'mod_5',
        title: 'Kubernetes Orchestration',
        description: 'Container orchestration with K8s',
        completed: false,
        resources: [
          { type: 'video', title: 'Kubernetes Tutorial', url: 'https://example.com/k8s' },
          { type: 'article', title: 'K8s Best Practices', url: 'https://example.com/k8s-best' }
        ]
      }
    ],
    tags: [
      { name: 'devops', color: '#ff6b6b' },
      { name: 'cloud', color: '#4ecdc4' }
    ],
    createdAt: '3 weeks ago',
    enrolledAt: '2 weeks ago'
  },
  {
    id: 'lp_3',
    title: 'Machine Learning Fundamentals',
    description: 'Learn the basics of machine learning, neural networks, and deep learning with Python',
    category: 'Machine Learning',
    difficulty: 'intermediate',
    estimatedTime: '16 weeks',
    progress: 25,
    modules: [
      {
        id: 'mod_6',
        title: 'Python for Data Science',
        description: 'NumPy, Pandas, and data manipulation',
        completed: true,
        resources: [
          { type: 'video', title: 'Python Data Science Tutorial', url: 'https://example.com/python-ds' },
          { type: 'project', title: 'Data Analysis Project', url: 'https://example.com/data-project' }
        ]
      },
      {
        id: 'mod_7',
        title: 'Introduction to Neural Networks',
        description: 'Understanding the basics of deep learning',
        completed: false,
        resources: [
          { type: 'video', title: 'Neural Networks Explained', url: 'https://example.com/neural-nets' },
          { type: 'lab', title: 'Build Your First Neural Network', url: 'https://example.com/first-nn' }
        ]
      }
    ],
    tags: [
      { name: 'ml', color: '#f59e0b' },
      { name: 'python', color: '#3776ab' },
      { name: 'ai', color: '#8b5cf6' }
    ],
    createdAt: '2 weeks ago',
    enrolledAt: '1 week ago'
  },
  {
    id: 'lp_4',
    title: 'UI/UX Design Principles',
    description: 'Master user interface and user experience design with modern tools and methodologies',
    category: 'Design',
    difficulty: 'beginner',
    estimatedTime: '6 weeks',
    progress: 80,
    modules: [
      {
        id: 'mod_8',
        title: 'Design Fundamentals',
        description: 'Color theory, typography, and layout principles',
        completed: true,
        resources: [
          { type: 'video', title: 'Design Basics Course', url: 'https://example.com/design-basics' },
          { type: 'article', title: 'Typography Guide', url: 'https://example.com/typography' }
        ]
      },
      {
        id: 'mod_9',
        title: 'Prototyping with Figma',
        description: 'Create interactive prototypes and designs',
        completed: true,
        resources: [
          { type: 'video', title: 'Figma Complete Tutorial', url: 'https://example.com/figma' },
          { type: 'project', title: 'Design a Mobile App', url: 'https://example.com/app-design' }
        ]
      }
    ],
    tags: [
      { name: 'design', color: '#ec4899' },
      { name: 'figma', color: '#f24e1e' },
      { name: 'ui', color: '#06b6d4' }
    ],
    createdAt: '1 month ago',
    enrolledAt: '3 weeks ago'
  },
  {
    id: 'lp_5',
    title: 'Mobile App Development',
    description: 'Build native and cross-platform mobile applications for iOS and Android',
    category: 'Mobile Development',
    difficulty: 'intermediate',
    estimatedTime: '10 weeks',
    progress: 45,
    modules: [
      {
        id: 'mod_10',
        title: 'React Native Basics',
        description: 'Getting started with cross-platform development',
        completed: true,
        resources: [
          { type: 'video', title: 'React Native Tutorial', url: 'https://example.com/rn-tutorial' },
          { type: 'project', title: 'Build a Weather App', url: 'https://example.com/weather-app' }
        ]
      },
      {
        id: 'mod_11',
        title: 'Advanced Mobile Patterns',
        description: 'Navigation, state management, and performance',
        completed: false,
        resources: [
          { type: 'video', title: 'Advanced React Native', url: 'https://example.com/advanced-rn' },
          { type: 'article', title: 'Mobile Performance Tips', url: 'https://example.com/mobile-perf' }
        ]
      }
    ],
    tags: [
      { name: 'mobile', color: '#a855f7' },
      { name: 'react-native', color: '#61dafb' },
      { name: 'ios', color: '#000000' }
    ],
    createdAt: '2 weeks ago',
    enrolledAt: '1 week ago'
  },
  {
    id: 'lp_6',
    title: 'Cybersecurity Essentials',
    description: 'Learn fundamental security concepts, ethical hacking, and how to protect systems from threats',
    category: 'Cybersecurity',
    difficulty: 'advanced',
    estimatedTime: '14 weeks',
    progress: 15,
    modules: [
      {
        id: 'mod_12',
        title: 'Security Fundamentals',
        description: 'Understanding common vulnerabilities and threats',
        completed: true,
        resources: [
          { type: 'video', title: 'Cybersecurity Basics', url: 'https://example.com/cyber-basics' },
          { type: 'lab', title: 'Security Lab Setup', url: 'https://example.com/security-lab' }
        ]
      },
      {
        id: 'mod_13',
        title: 'Ethical Hacking',
        description: 'Penetration testing and vulnerability assessment',
        completed: false,
        resources: [
          { type: 'video', title: 'Ethical Hacking Course', url: 'https://example.com/ethical-hacking' },
          { type: 'project', title: 'Security Audit Project', url: 'https://example.com/security-audit' }
        ]
      }
    ],
    tags: [
      { name: 'security', color: '#ef4444' },
      { name: 'hacking', color: '#f97316' },
      { name: 'networking', color: '#3b82f6' }
    ],
    createdAt: '1 week ago',
    enrolledAt: undefined
  },
  {
    id: 'lp_7',
    title: 'Digital Marketing Mastery',
    description: 'Learn modern digital marketing strategies including SEO, social media, and content marketing',
    category: 'Marketing',
    difficulty: 'beginner',
    estimatedTime: '8 weeks',
    progress: 55,
    modules: [
      {
        id: 'mod_14',
        title: 'SEO Fundamentals',
        description: 'Search engine optimization basics and best practices',
        completed: true,
        resources: [
          { type: 'video', title: 'SEO Complete Guide', url: 'https://example.com/seo-guide' },
          { type: 'article', title: 'Keyword Research Tips', url: 'https://example.com/keywords' }
        ]
      },
      {
        id: 'mod_15',
        title: 'Social Media Marketing',
        description: 'Building and engaging audiences on social platforms',
        completed: false,
        resources: [
          { type: 'video', title: 'Social Media Strategy', url: 'https://example.com/social-strategy' },
          { type: 'project', title: 'Create a Campaign', url: 'https://example.com/campaign' }
        ]
      }
    ],
    tags: [
      { name: 'marketing', color: '#10b981' },
      { name: 'seo', color: '#f59e0b' },
      { name: 'social-media', color: '#3b82f6' }
    ],
    createdAt: '3 weeks ago',
    enrolledAt: '2 weeks ago'
  },
  {
    id: 'lp_8',
    title: 'Business Strategy and Leadership',
    description: 'Develop essential business skills, leadership qualities, and strategic thinking',
    category: 'Business',
    difficulty: 'intermediate',
    estimatedTime: '12 weeks',
    progress: 30,
    modules: [
      {
        id: 'mod_16',
        title: 'Strategic Planning',
        description: 'Business strategy development and execution',
        completed: true,
        resources: [
          { type: 'video', title: 'Strategy Fundamentals', url: 'https://example.com/strategy' },
          { type: 'case-study', title: 'Successful Business Cases', url: 'https://example.com/cases' }
        ]
      },
      {
        id: 'mod_17',
        title: 'Leadership Skills',
        description: 'Team management and effective leadership',
        completed: false,
        resources: [
          { type: 'video', title: 'Leadership Development', url: 'https://example.com/leadership' },
          { type: 'article', title: 'Management Best Practices', url: 'https://example.com/management' }
        ]
      }
    ],
    tags: [
      { name: 'business', color: '#6366f1' },
      { name: 'leadership', color: '#8b5cf6' },
      { name: 'strategy', color: '#ec4899' }
    ],
    createdAt: '4 weeks ago',
    enrolledAt: '3 weeks ago'
  }
];

export interface MockFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  description: string;
  tags: Array<{ name: string; color: string }>;
  associations?: Array<{
    id: string;
    type: 'task' | 'bookmark' | 'note' | 'project';
    title: string;
  }>;
  url?: string;
  isLink?: boolean;
  preview?: string;
  downloadUrl?: string;
  viewUrl?: string;
  shareUrl?: string;
}

export const mockFiles: MockFile[] = [
  {
    id: 'file_1',
    name: 'project-plan.pdf',
    size: 2048576,
    type: 'application/pdf',
    uploadedAt: '2024-01-15T10:30:00Z',
    description: 'Q1 2024 project roadmap and milestones',
    tags: [
      { name: 'planning', color: '#3b82f6' },
      { name: 'q1-2024', color: '#10b981' }
    ],
    downloadUrl: '/files/download/1',
    viewUrl: '/files/view/1',
    shareUrl: '/files/share/1'
  },
  {
    id: 'file_2',
    name: 'meeting-notes.docx',
    size: 524288,
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    uploadedAt: '2024-01-14T15:45:00Z',
    description: 'Team sync meeting notes',
    tags: [
      { name: 'meetings', color: '#ef4444' },
      { name: 'team', color: '#3b82f6' }
    ],
    downloadUrl: '/files/download/2',
    viewUrl: '/files/view/2',
    shareUrl: '/files/share/2'
  },
  {
    id: 'file_3',
    name: 'screenshot.png',
    size: 1024000,
    type: 'image/png',
    uploadedAt: '2024-01-13T09:20:00Z',
    description: 'UI design mockup',
    tags: [
      { name: 'design', color: '#8b5cf6' },
      { name: 'ui', color: '#06b6d4' }
    ],
    associations: [
      { id: '1', type: 'project', title: 'Website Redesign' },
      { id: '2', type: 'task', title: 'Create mockups' }
    ],
    preview: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    downloadUrl: '/files/download/3',
    viewUrl: '/files/view/3',
    shareUrl: '/files/share/3'
  },
  {
    id: 'file_4',
    name: 'app.js',
    size: 256000,
    type: 'text/javascript',
    uploadedAt: '2024-01-12T14:15:00Z',
    description: 'Main application logic',
    tags: [
      { name: 'javascript', color: '#f59e0b' },
      { name: 'frontend', color: '#10b981' }
    ],
    associations: [
      { id: '3', type: 'project', title: 'Frontend App' }
    ],
    preview: 'console.log("Hello World");\n\nfunction main() {\n  // Main application logic\n  return true;\n}',
    downloadUrl: '/files/download/4',
    viewUrl: '/files/view/4',
    shareUrl: '/files/share/4'
  },
  {
    id: 'file_5',
    name: 'database.sql',
    size: 512000,
    type: 'application/sql',
    uploadedAt: '2024-01-11T11:30:00Z',
    description: 'Database schema',
    tags: [
      { name: 'database', color: '#06b6d4' },
      { name: 'sql', color: '#3b82f6' }
    ],
    associations: [
      { id: '4', type: 'project', title: 'Backend API' }
    ],
    preview: 'CREATE TABLE users (\n  id INT PRIMARY KEY,\n  name VARCHAR(255) NOT NULL\n);',
    downloadUrl: '/files/download/5',
    viewUrl: '/files/view/5',
    shareUrl: '/files/share/5'
  },
  {
    id: 'file_6',
    name: 'presentation.pptx',
    size: 3072000,
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    uploadedAt: '2024-01-10T16:45:00Z',
    description: 'Q4 review presentation',
    tags: [
      { name: 'presentation', color: '#ef4444' },
      { name: 'q4', color: '#f59e0b' }
    ],
    downloadUrl: '/files/download/6',
    viewUrl: '/files/view/6',
    shareUrl: '/files/share/6'
  }
];

// Helper function to create dates with proper chaining
const createDate = (baseDate: Date, daysOffset: number = 0, hours: number = 0, minutes: number = 0, seconds: number = 0) => {
  const date = new Date(baseDate);
  if (daysOffset !== 0) {
    date.setDate(date.getDate() + daysOffset);
  }
  date.setHours(hours, minutes, seconds, 0);
  return date.toISOString();
};

export const mockCalendarEvents: MockCalendarEvent[] = [
  // Today's events
  {
    id: 'event_1',
    title: 'Daily Standup Meeting',
    description: 'Team sync to discuss daily progress and blockers',
    start: createDate(new Date(), 0, 9, 0, 0),
    end: createDate(new Date(), 0, 9, 30, 0),
    allDay: false,
    type: 'meeting',
    location: 'Conference Room A',
    attendees: [
      { name: 'John Doe', email: 'john@example.com' },
      { name: 'Jane Smith', email: 'jane@example.com' },
      { name: 'Mike Johnson', email: 'mike@example.com' }
    ],
    tags: [
      { name: 'meeting', color: '#ef4444' },
      { name: 'team', color: '#3b82f6' },
      { name: 'daily', color: '#10b981' }
    ]
  },
  {
    id: 'event_2',
    title: 'Code Review - Feature Branch',
    description: 'Review pull requests for the new authentication feature',
    start: createDate(new Date(), 0, 14, 0, 0),
    end: createDate(new Date(), 0, 15, 30, 0),
    allDay: false,
    type: 'task',
    location: 'Virtual - Zoom',
    attendees: [
      { name: 'Sarah Chen', email: 'sarah@example.com' },
      { name: 'Tom Wilson', email: 'tom@example.com' }
    ],
    tags: [
      { name: 'review', color: '#8b5cf6' },
      { name: 'coding', color: '#10b981' },
      { name: 'authentication', color: '#f59e0b' }
    ]
  },
  {
    id: 'event_3',
    title: 'Lunch with Client',
    description: 'Discuss project requirements and next steps',
    start: createDate(new Date(), 0, 12, 30, 0),
    end: createDate(new Date(), 0, 13, 30, 0),
    allDay: false,
    type: 'meeting',
    location: 'Italian Restaurant Downtown',
    attendees: [
      { name: 'Alex Rivera', email: 'alex@client.com' }
    ],
    tags: [
      { name: 'client', color: '#ec4899' },
      { name: 'lunch', color: '#84cc16' },
      { name: 'business', color: '#06b6d4' }
    ]
  },
  
  // Tomorrow's events
  {
    id: 'event_4',
    title: 'Sprint Planning',
    description: 'Plan next sprint tasks and allocate resources',
    start: createDate(new Date(), 1, 10, 0, 0),
    end: createDate(new Date(), 1, 12, 0, 0),
    allDay: false,
    type: 'meeting',
    location: 'Main Conference Room',
    attendees: [
      { name: 'Product Team', email: 'product@example.com' },
      { name: 'Dev Team', email: 'dev@example.com' }
    ],
    tags: [
      { name: 'planning', color: '#3b82f6' },
      { name: 'sprint', color: '#f97316' },
      { name: 'agile', color: '#8b5cf6' }
    ]
  },
  {
    id: 'event_5',
    title: 'Database Migration',
    description: 'Perform scheduled database migration to new schema',
    start: createDate(new Date(), 1, 22, 0, 0),
    end: createDate(new Date(), 1, 23, 59, 0),
    allDay: false,
    type: 'deadline',
    location: 'Server Room',
    tags: [
      { name: 'database', color: '#8b5cf6' },
      { name: 'migration', color: '#ef4444' },
      { name: 'maintenance', color: '#f59e0b' }
    ]
  },

  // This week's events
  {
    id: 'event_6',
    title: 'Weekly Team Retrospective',
    description: 'Review what went well and what needs improvement',
    start: createDate(new Date(), 3, 16, 0, 0),
    end: createDate(new Date(), 3, 17, 0, 0),
    allDay: false,
    type: 'meeting',
    location: 'Team Room',
    attendees: [
      { name: 'All Team Members', email: 'team@example.com' }
    ],
    tags: [
      { name: 'retrospective', color: '#06b6d4' },
      { name: 'weekly', color: '#10b981' },
      { name: 'improvement', color: '#84cc16' }
    ]
  },
  {
    id: 'event_7',
    title: 'Project Demo - New Features',
    description: 'Demonstrate new features to stakeholders',
    start: createDate(new Date(), 4, 11, 0, 0),
    end: createDate(new Date(), 4, 12, 0, 0),
    allDay: false,
    type: 'meeting',
    location: 'Presentation Hall',
    attendees: [
      { name: 'Stakeholders', email: 'stakeholders@example.com' },
      { name: 'Management', email: 'management@example.com' }
    ],
    tags: [
      { name: 'demo', color: '#ec4899' },
      { name: 'presentation', color: '#f97316' },
      { name: 'stakeholders', color: '#3b82f6' }
    ]
  },

  // Deadlines (urgent)
  {
    id: 'event_8',
    title: 'API Documentation Deadline',
    description: 'Final deadline for completing API documentation',
    start: createDate(new Date(), 2, 23, 59, 0),
    end: createDate(new Date(), 2, 23, 59, 0),
    allDay: true,
    type: 'deadline',
    tags: [
      { name: 'deadline', color: '#ef4444' },
      { name: 'documentation', color: '#6366f1' },
      { name: 'urgent', color: '#dc2626' }
    ]
  },
  {
    id: 'event_9',
    title: 'Security Audit Report Due',
    description: 'Submit quarterly security audit report',
    start: createDate(new Date(), 5, 17, 0, 0),
    end: createDate(new Date(), 5, 17, 0, 0),
    allDay: false,
    type: 'deadline',
    tags: [
      { name: 'security', color: '#ef4444' },
      { name: 'audit', color: '#ec4899' },
      { name: 'compliance', color: '#8b5cf6' }
    ]
  },

  // Personal events/habits
  {
    id: 'event_10',
    title: 'Gym Workout',
    description: 'Daily exercise routine',
    start: createDate(new Date(), 0, 7, 0, 0),
    end: createDate(new Date(), 0, 8, 0, 0),
    allDay: false,
    type: 'personal',
    location: 'Fitness Center',
    tags: [
      { name: 'personal', color: '#84cc16' },
      { name: 'health', color: '#10b981' },
      { name: 'exercise', color: '#f59e0b' }
    ]
  },
  {
    id: 'event_11',
    title: 'Reading Time',
    description: 'Read technical articles and books',
    start: createDate(new Date(), 0, 20, 0, 0),
    end: createDate(new Date(), 0, 21, 0, 0),
    allDay: false,
    type: 'personal',
    location: 'Home Office',
    tags: [
      { name: 'personal', color: '#84cc16' },
      { name: 'learning', color: '#3b82f6' },
      { name: 'reading', color: '#8b5cf6' }
    ]
  },

  // Future events
  {
    id: 'event_12',
    title: 'Team Building Event',
    description: 'Quarterly team building activity',
    start: createDate(new Date(), 10, 9, 0, 0),
    end: createDate(new Date(), 10, 17, 0, 0),
    allDay: true,
    type: 'meeting',
    location: 'Off-site Location',
    attendees: [
      { name: 'All Team', email: 'all@example.com' }
    ],
    tags: [
      { name: 'team', color: '#3b82f6' },
      { name: 'building', color: '#ec4899' },
      { name: 'quarterly', color: '#f97316' }
    ]
  }
];

export const mockActivities: MockActivity[] = [
  {
    id: 'act_1',
    type: 'document',
    action: 'uploaded',
    title: 'WooCommerce CSV Import Tutorial',
    timestamp: '2 hours ago',
    icon: 'document',
    details: { size: '205.12 KB', type: 'docx' }
  },
  {
    id: 'act_2',
    type: 'bookmark',
    action: 'added',
    title: 'SolidJS Documentation',
    timestamp: '4 hours ago',
    icon: 'bookmark',
    details: { url: 'https://www.solidjs.com/docs/latest' }
  },
  {
    id: 'act_3',
    type: 'task',
    action: 'completed',
    title: 'Deploy to production',
    timestamp: '6 hours ago',
    icon: 'task',
    details: { projectId: 'proj_1' }
  },
  {
    id: 'act_4',
    type: 'note',
    action: 'created',
    title: 'Meeting Notes - Q1 Planning',
    timestamp: '1 day ago',
    icon: 'note',
    details: { folder: 'Work' }
  },
  {
    id: 'act_5',
    type: 'time_entry',
    action: 'logged',
    title: 'API documentation writing',
    timestamp: '1 day ago',
    icon: 'clock',
    details: { duration: '2.5 hours', billable: true }
  },
  {
    id: 'act_6',
    type: 'video',
    action: 'saved',
    title: 'SolidJS Tutorial - Complete Course',
    timestamp: '2 days ago',
    icon: 'video',
    details: { duration: '2:45:30', channel: 'Web Dev Simplified' }
  },
  {
    id: 'act_7',
    type: 'learning_path',
    action: 'enrolled',
    title: 'Full Stack Web Development',
    timestamp: '3 days ago',
    icon: 'graduation-cap',
    details: { difficulty: 'intermediate', duration: '12 weeks' }
  },
  {
    id: 'act_8',
    type: 'document',
    action: 'edited',
    title: 'API Documentation v2.1',
    timestamp: '3 days ago',
    icon: 'document',
    details: { changes: 15, version: 'v2.1' }
  },
  {
    id: 'act_9',
    type: 'task',
    action: 'started',
    title: 'Fix responsive design issues',
    timestamp: '4 days ago',
    icon: 'task',
    details: { priority: 'medium', assignee: 'John Doe' }
  },
  {
    id: 'act_10',
    type: 'bookmark',
    action: 'categorized',
    title: 'Go Programming Language',
    timestamp: '5 days ago',
    icon: 'bookmark',
    details: { category: 'Development', tags: 3 }
  },
  {
    id: 'act_11',
    type: 'note',
    action: 'shared',
    title: 'Technical Architecture Decisions',
    timestamp: '1 week ago',
    icon: 'note',
    details: { sharedWith: 5, folder: 'Technical' }
  },
  {
    id: 'act_12',
    type: 'video',
    action: 'watched',
    title: 'Docker Containerization Best Practices',
    timestamp: '1 week ago',
    icon: 'video',
    details: { progress: '75%', duration: '1:35:42' }
  },
  {
    id: 'act_13',
    type: 'document',
    action: 'downloaded',
    title: 'Q4 2024 Financial Report',
    timestamp: '2 weeks ago',
    icon: 'document',
    details: { size: '3.4 MB', type: 'xlsx' }
  },
  {
    id: 'act_14',
    type: 'task',
    action: 'reviewed',
    title: 'Review pull requests',
    timestamp: '2 weeks ago',
    icon: 'task',
    details: { prCount: 3, approved: 2 }
  },
  {
    id: 'act_15',
    type: 'learning_path',
    action: 'completed',
    title: 'Containerization with Docker',
    timestamp: '2 weeks ago',
    icon: 'graduation-cap',
    details: { score: '92%', certificate: true }
  }
];

// Helper functions to get mock data
export const getMockDocuments = () => mockDocuments;
export const getMockBookmarks = () => mockBookmarks;
export const getMockTasks = () => mockTasks;
export const getMockNotes = () => mockNotes;
export const getMockTimeEntries = () => mockTimeEntries;
export const getMockVideos = () => mockVideos;
export const getMockLearningPaths = () => mockLearningPaths;
export const getMockCalendarEvents = () => mockCalendarEvents;
export const getMockFiles = () => mockFiles;
export const getMockActivities = () => mockActivities;

// Statistics helpers
export const getMockStats = () => ({
  totalDocuments: mockDocuments.length,
  totalBookmarks: mockBookmarks.length,
  totalTasks: mockTasks.length,
  totalNotes: mockNotes.length,
  totalSize: '12.94 MB',
  recentActivity: mockActivities.length,
  completedTasks: mockTasks.filter(t => t.status === 'completed').length,
  activeTasks: mockTasks.filter(t => t.status === 'in_progress').length,
  monthlyGrowth: {
    bookmarks: 15,
    documents: 8,
    tasks: -5,
    notes: 12
  },
  weeklyActivity: [12, 19, 8, 15, 22, 18, 25],
  // Additional stats for enhanced dashboard
  totalVideos: mockVideos.length,
  totalLearningPaths: mockLearningPaths.length,
  totalTimeTracked: mockTimeEntries.reduce((acc, entry) => acc + entry.duration, 0) / 3600, // Convert seconds to hours
  averageProductivity: 78,
  storageUsed: 12.94,
  storageTotal: 50,
  recentProjects: [
    { name: 'Trackeep Platform', progress: 85, status: 'active' },
    { name: 'Mobile App Development', progress: 62, status: 'active' },
    { name: 'AI Integration', progress: 43, status: 'planning' },
    { name: 'Documentation Update', progress: 91, status: 'review' }
  ],
  topTags: [
    { name: 'documentation', count: 8, color: '#6366f1' },
    { name: 'development', count: 6, color: '#10b981' },
    { name: 'Maturita', count: 5, color: '#dc2626' },
    { name: 'AI', count: 4, color: '#8b5cf6' },
    { name: 'mobile', count: 3, color: '#f59e0b' }
  ],
  upcomingDeadlines: [
    { title: 'API Documentation', date: '2024-02-15', priority: 'high' },
    { title: 'Fix responsive issues', date: '2024-02-10', priority: 'medium' },
    { title: 'Review pull requests', date: '2024-02-08', priority: 'medium' }
  ],
  recentAchievements: [
    { title: 'Completed 10 tasks this week', date: '2 days ago', type: 'milestone' },
    { title: 'Deployed to production', date: '6 hours ago', type: 'deployment' },
    { title: 'Added 5 new bookmarks', date: '1 day ago', type: 'content' }
  ]
});

// Popular tags across all content types
export const getPopularTags = () => {
  const allTags = [
    ...mockDocuments.flatMap(d => d.tags),
    ...mockBookmarks.flatMap(b => b.tags),
    ...mockTasks.flatMap(t => t.tags),
    ...mockNotes.flatMap(n => n.tags)
  ];
  
  const tagCounts = allTags.reduce((acc, tag) => {
    acc[tag.name] = (acc[tag.name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(tagCounts)
    .map(([name, count]) => ({
      name,
      count,
      color: allTags.find(t => t.name === name)?.color || '#6b7280'
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
};
