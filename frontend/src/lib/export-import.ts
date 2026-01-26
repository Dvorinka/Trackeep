import type { Bookmark, Task, Note, FileItem } from './api-client'

export interface ExportData {
  version: string
  exportDate: string
  bookmarks: Bookmark[]
  tasks: Task[]
  notes: Note[]
  files: FileItem[]
}

export const exportData = async (data: {
  bookmarks?: Bookmark[]
  tasks?: Task[]
  notes?: Note[]
  files?: FileItem[]
}, filename?: string) => {
  const exportData: ExportData = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    bookmarks: data.bookmarks || [],
    tasks: data.tasks || [],
    notes: data.notes || [],
    files: data.files || []
  }

  const jsonString = JSON.stringify(exportData, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename || `trackeep-export-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const importData = async (file: File): Promise<ExportData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content) as ExportData
        
        // Validate the structure
        if (!data.version || !data.exportDate) {
          throw new Error('Invalid export file format')
        }
        
        resolve(data)
      } catch (error) {
        reject(new Error('Failed to parse export file: ' + (error as Error).message))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsText(file)
  })
}

export const validateImportData = (data: ExportData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  // Check version compatibility
  if (!data.version) {
    errors.push('Missing version information')
  }
  
  // Check required fields
  if (!data.exportDate) {
    errors.push('Missing export date')
  }
  
  // Validate data types
  if (data.bookmarks && !Array.isArray(data.bookmarks)) {
    errors.push('Bookmarks data is not an array')
  }
  
  if (data.tasks && !Array.isArray(data.tasks)) {
    errors.push('Tasks data is not an array')
  }
  
  if (data.notes && !Array.isArray(data.notes)) {
    errors.push('Notes data is not an array')
  }
  
  if (data.files && !Array.isArray(data.files)) {
    errors.push('Files data is not an array')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

export const getImportSummary = (data: ExportData): string => {
  const summary = []
  
  if (data.bookmarks.length > 0) {
    summary.push(`${data.bookmarks.length} bookmarks`)
  }
  
  if (data.tasks.length > 0) {
    summary.push(`${data.tasks.length} tasks`)
  }
  
  if (data.notes.length > 0) {
    summary.push(`${data.notes.length} notes`)
  }
  
  if (data.files.length > 0) {
    summary.push(`${data.files.length} files`)
  }
  
  if (summary.length === 0) {
    return 'No data to import'
  }
  
  return `Import contains: ${summary.join(', ')}`
}
