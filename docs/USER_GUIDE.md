# Trackeep User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Account Management](#account-management)
3. [Bookmarks](#bookmarks)
4. [Tasks](#tasks)
5. [Files](#files)
6. [Notes](#notes)
7. [Search and Organization](#search-and-organization)
8. [Data Management](#data-management)
9. [Settings](#settings)
10. [Keyboard Shortcuts](#keyboard-shortcuts)

## Getting Started

### Installation
Trackeep can be installed using Docker Compose for the easiest setup:

```bash
git clone https://github.com/your-username/trackeep.git
cd trackeep
cp .env.prod.example .env.prod
# Edit .env.prod with your configuration
docker-compose -f docker-compose.prod.yml up -d
```

### First Login
1. Open your browser and navigate to `http://localhost`
2. Click "Register" to create your account
3. Fill in your email, name, and password
4. Click "Create Account"
5. You'll be automatically logged in and redirected to the dashboard

### Dashboard Overview
The dashboard provides:
- **Quick Stats**: Overview of your bookmarks, tasks, files, and notes
- **Recent Activity**: Your latest additions and updates
- **Quick Actions**: Fast access to create new items
- **Navigation**: Sidebar menu to access all features

## Account Management

### Profile Settings
Access your profile by clicking your name in the top-right corner:

**Profile Information:**
- Update your name and email
- Change your password
- Set your timezone
- Configure notification preferences

**Security Settings:**
- Enable two-factor authentication (coming soon)
- View active sessions
- Manage API keys

### Authentication
Trackeep uses JWT tokens for authentication:
- Tokens expire after 24 hours by default
- You'll be automatically logged out after inactivity
- Use "Remember Me" to extend sessions

## Bookmarks

### Creating Bookmarks
1. Navigate to **Bookmarks** in the sidebar
2. Click the **Add Bookmark** button
3. Fill in the details:
   - **URL**: The web address to save
   - **Title**: Automatically fetched or manually entered
   - **Description**: Optional notes about the bookmark
   - **Tags**: Comma-separated tags for organization
4. Click **Save**

### Quick Bookmarking
Use the browser extension (coming soon) to:
- Save current page with one click
- Add tags and notes without leaving the page
- Access your bookmarks from the extension popup

### Managing Bookmarks
**View Options:**
- **Grid View**: Visual card layout
- **List View**: Compact table layout
- **Sort by**: Date, title, or custom order

**Actions:**
- **Edit**: Click the edit icon on any bookmark
- **Delete**: Click the trash icon to remove
- **Share**: Generate a shareable link (coming soon)
- **Visit**: Click the title or URL to open in new tab

### Bookmark Organization
**Tags:**
- Create tags by typing in the tags field
- Use existing tags for consistency
- Filter by multiple tags using the tag filter

**Collections:**
- Group related bookmarks into collections
- Create custom collections for projects or topics
- Nest collections for hierarchical organization

## Tasks

### Creating Tasks
1. Navigate to **Tasks** in the sidebar
2. Click **Add Task**
3. Enter task details:
   - **Title**: Brief description of the task
   - **Description**: Detailed information (optional)
   - **Priority**: Low, Medium, or High
   - **Due Date**: Optional deadline
   - **Tags**: For categorization
4. Click **Create Task**

### Task Management
**Status Options:**
- **Pending**: Not started yet
- **In Progress**: Currently working on
- **Completed**: Finished tasks

**Priority Levels:**
- **Low**: Nice to have, no urgency
- **Medium**: Important but not urgent
- **High**: Urgent and important

**Task Views:**
- **All Tasks**: See everything
- **By Status**: Filter by pending, in progress, or completed
- **By Priority**: Focus on high-priority items
- **By Due Date**: Sort by upcoming deadlines

### Advanced Task Features
**Subtasks:**
- Break down large tasks into smaller steps
- Track progress of subtasks
- Mark individual subtasks as complete

**Recurring Tasks:**
- Set up daily, weekly, or monthly tasks
- Automatic task creation based on schedule
- Customize recurrence patterns

## Files

### Uploading Files
1. Navigate to **Files** in the sidebar
2. Click **Upload Files** or drag-and-drop files
3. Add optional:
   - **Description**: Notes about the file
   - **Tags**: For organization and search
4. Click **Upload**

**Supported File Types:**
- **Documents**: PDF, DOC, DOCX, TXT, MD
- **Images**: JPG, PNG, GIF, SVG, WebP
- **Archives**: ZIP, RAR, 7Z
- **Other**: Most common file formats

**File Size Limits:**
- Maximum file size: 100MB
- Total storage: Configurable by administrator

### File Management
**Preview:**
- Images: Thumbnail preview
- Documents: Text preview when possible
- Videos: Basic video player (coming soon)

**Organization:**
- **Folders**: Create folder structure
- **Tags**: Categorize across folders
- **Search**: Find by filename or content

**Actions:**
- **Download**: Get the original file
- **Share**: Generate shareable links
- **Move**: Organize into folders
- **Delete**: Remove files permanently

### File Security
- All files are stored securely
- Access controlled by authentication
- Optional encryption for sensitive files
- Audit trail for file access

## Notes

### Creating Notes
1. Navigate to **Notes** in the sidebar
2. Click **Add Note**
3. Enter note content:
   - **Title**: Brief summary
   - **Content**: Rich text editor supports:
     - Bold, italic, underline
     - Headers and lists
     - Links and images
     - Code blocks
   - **Tags**: For organization
4. Click **Save**

### Note Features
**Rich Text Editor:**
- **Formatting**: Complete text styling options
- **Markdown Support**: Write in markdown syntax
- **Code Highlighting**: Syntax highlighting for code
- **Tables**: Create structured data
- **Links**: Internal and external links

**Note Organization:**
- **Notebooks**: Group related notes
- **Tags**: Flexible categorization
- **Pinning**: Keep important notes accessible
- **Archiving**: Hide old but important notes

### Advanced Note Features
**Collaboration** (coming soon):
- Share notes with other users
- Real-time collaborative editing
- Comments and discussions

**Templates:**
- Create note templates for common formats
- Quick insertion of structured content
- Custom template library

## Search and Organization

### Global Search
Use the search bar in the header to find:
- **Bookmarks**: By title, URL, description, or tags
- **Tasks**: By title, description, or tags
- **Files**: By filename, description, or content
- **Notes**: By title, content, or tags

**Search Operators:**
- `tag:important` - Find items with specific tag
- `status:completed` - Filter by status
- `priority:high` - Filter by priority
- `created:today` - Filter by creation date
- `updated:thisweek` - Filter by modification date

### Advanced Filters
**Date Ranges:**
- Created between specific dates
- Modified within timeframes
- Due dates for tasks

**Tag Combinations:**
- Multiple tag filtering
- Exclude specific tags
- Tag hierarchy support

**Content Types:**
- Search within specific content types
- Combine content type filters
- Save filter presets

## Data Management

### Export Data
Export all your data in various formats:

**Export Options:**
- **JSON**: Complete data with all metadata
- **CSV**: Tabular data for spreadsheets
- **HTML**: Readable archive format
- **Markdown**: Text-based format

**What's Exported:**
- All bookmarks with tags and metadata
- Tasks with status and history
- Files (metadata only, files downloaded separately)
- Notes with content and organization
- User profile and settings

### Import Data
Import data from other services:

**Supported Formats:**
- **Pocket**: Bookmark exports
- **Notion**: CSV exports
- **Todoist**: Task exports
- **Generic**: JSON/CSV formats

**Import Process:**
1. Go to **Settings** → **Data Management**
2. Choose **Import Data**
3. Select file and format
4. Map fields if necessary
5. Preview import
6. Confirm and import

### Backup and Recovery
**Automatic Backups:**
- Daily database backups
- File storage backups
- Configuration backups
- Retention policy: 30 days

**Manual Backups:**
- On-demand backup creation
- Download backup files
- Verify backup integrity

**Recovery:**
- Restore from backup files
- Selective data recovery
- Point-in-time restoration

## Settings

### General Settings
**Appearance:**
- **Theme**: Dark mode (default) or light mode
- **Accent Color**: Customize the interface color
- **Font Size**: Adjust text size
- **Language**: Interface language selection

**Behavior:**
- **Default View**: Set default page layout
- **Auto-save**: Configure automatic saving
- **Notifications**: Email and in-app notifications
- **Timezone**: Set your local timezone

### Privacy Settings
**Data Sharing:**
- **Profile Visibility**: Control who can see your profile
- **Content Sharing**: Default sharing settings
- **Analytics**: Opt-in/out of usage analytics

**Security:**
- **Session Management**: View and manage active sessions
- **API Keys**: Generate and manage API access
- **Two-Factor Auth**: Enable 2FA (coming soon)

### Integration Settings
**Browser Extension:**
- Install and configure browser extension
- Sync settings across devices
- Quick bookmarking options

**API Access:**
- Generate API keys
- Set permissions and rate limits
- View API usage statistics

**External Services:**
- Connect to cloud storage (coming soon)
- Integrate with calendar apps
- Social media connections

## Keyboard Shortcuts

### Global Shortcuts
- `Ctrl + K` / `Cmd + K`: Open search
- `Ctrl + /`: Show keyboard shortcuts
- `Ctrl + N`: Create new item (context-dependent)
- `Esc`: Close modal or cancel action

### Navigation
- `G + B`: Go to Bookmarks
- `G + T`: Go to Tasks
- `G + F`: Go to Files
- `G + N`: Go to Notes
- `G + S`: Go to Settings

### Item Management
- `Enter`: Open selected item
- `Space`: Select/deselect item
- `Delete`: Delete selected item
- `E`: Edit selected item
- `Ctrl + Enter`: Save and close

### Search
- `↑` / `↓`: Navigate search results
- `Enter`: Open selected result
- `Esc`: Close search

## Tips and Best Practices

### Organization Strategies
1. **Use Consistent Tags**: Establish a tagging system and stick to it
2. **Create Collections**: Group related items for better organization
3. **Regular Cleanup**: Archive or delete old items periodically
4. **Use Descriptive Titles**: Make items easy to find later

### Productivity Tips
1. **Quick Capture**: Use the browser extension for fast bookmarking
2. **Task Batching**: Group similar tasks together
3. **Regular Reviews**: Weekly review of tasks and bookmarks
4. **Keyboard Shortcuts**: Learn shortcuts for faster navigation

### Security Best Practices
1. **Strong Passwords**: Use unique, complex passwords
2. **Regular Backups**: Export your data regularly
3. **Session Management**: Log out from shared devices
4. **Keep Updated**: Update to latest versions for security

## Troubleshooting

### Common Issues
**Login Problems:**
- Check email and password
- Clear browser cache and cookies
- Reset password if needed

**Sync Issues:**
- Check internet connection
- Refresh the page
- Contact administrator if persistent

**File Upload Problems:**
- Check file size limits
- Verify supported file types
- Ensure sufficient storage space

### Getting Help
- **Documentation**: Check this guide first
- **FAQ**: Visit the FAQ section
- **Community**: Join our community forum
- **Support**: Contact support team
- **GitHub**: Report issues on GitHub

## Updates and New Features

Trackeep is actively developed with regular updates:
- **Monthly Releases**: New features and improvements
- **Security Updates**: Prompt security patches
- **Community Feedback**: Features based on user requests
- **Roadmap**: Public roadmap for upcoming features

Stay updated by:
- Following our blog
- Joining the newsletter
- Monitoring GitHub releases
- Participating in community discussions

---

Thank you for using Trackeep! If you have any questions or feedback, please don't hesitate to reach out to our community or support team.
