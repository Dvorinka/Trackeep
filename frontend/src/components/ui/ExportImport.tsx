import { createSignal, Show } from 'solid-js'
import { Button } from './Button'
import { IconDownload, IconUpload, IconFileText, IconAlertTriangle, IconCheck } from '@tabler/icons-solidjs'
import { exportData as exportDataUtil, importData as importDataUtil, validateImportData, getImportSummary, type ExportData } from '@/lib/export-import'

export interface ExportImportProps {
  data?: {
    bookmarks?: any[]
    tasks?: any[]
    notes?: any[]
    files?: any[]
  }
  onImport?: (data: ExportData) => Promise<void>
  disabled?: boolean
}

export const ExportImport = (props: ExportImportProps) => {
  const [isImporting, setIsImporting] = createSignal(false)
  const [importStatus, setImportStatus] = createSignal<'idle' | 'validating' | 'success' | 'error'>('idle')
  const [importMessage, setImportMessage] = createSignal('')
  const [importData, setImportData] = createSignal<ExportData | null>(null)

  const handleExport = async (type?: 'bookmarks' | 'tasks' | 'notes' | 'files' | 'all') => {
    try {
      let exportDataPayload = {}
      let filename = ''
      
      if (type === 'all' || !type) {
        exportDataPayload = props.data || {}
        filename = `trackeep-full-export-${new Date().toISOString().split('T')[0]}.json`
      } else {
        exportDataPayload = { [type]: props.data?.[type] || [] }
        filename = `trackeep-${type}-export-${new Date().toISOString().split('T')[0]}.json`
      }
      
      await exportDataUtil(exportDataPayload, filename)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    }
  }

  const handleFileSelect = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return

    setIsImporting(true)
    setImportStatus('validating')
    setImportMessage('Reading and validating file...')

    try {
      const data = await importDataUtil(file)
      const validation = validateImportData(data)
      
      if (!validation.isValid) {
        setImportStatus('error')
        setImportMessage(`Validation failed: ${validation.errors.join(', ')}`)
        return
      }

      setImportData(data)
      setImportStatus('success')
      setImportMessage(getImportSummary(data))
    } catch (error) {
      setImportStatus('error')
      setImportMessage((error as Error).message)
    } finally {
      setIsImporting(false)
    }
  }

  const handleImport = async () => {
    const data = importData()
    if (!data || !props.onImport) return

    try {
      await props.onImport(data)
      setImportStatus('idle')
      setImportMessage('Import completed successfully!')
      setImportData(null)
      
      // Reset file input
      const fileInput = document.getElementById('import-file-input') as HTMLInputElement
      if (fileInput) fileInput.value = ''
    } catch (error) {
      setImportStatus('error')
      setImportMessage(`Import failed: ${(error as Error).message}`)
    }
  }

  const resetImport = () => {
    setImportStatus('idle')
    setImportMessage('')
    setImportData(null)
    
    // Reset file input
    const fileInput = document.getElementById('import-file-input') as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

  return (
    <div class="space-y-6">
      {/* Export Section */}
      <div>
        <h3 class="text-lg font-medium text-white mb-4 flex items-center">
          <IconDownload class="mr-2 h-5 w-5" />
          Export Data
        </h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('all')}
            disabled={props.disabled}
            class="text-gray-300 border-gray-600 hover:text-white hover:border-gray-500"
          >
            <IconFileText class="mr-2 h-4 w-4" />
            Export All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('bookmarks')}
            disabled={props.disabled}
            class="text-gray-300 border-gray-600 hover:text-white hover:border-gray-500"
          >
            Bookmarks
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('tasks')}
            disabled={props.disabled}
            class="text-gray-300 border-gray-600 hover:text-white hover:border-gray-500"
          >
            Tasks
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('notes')}
            disabled={props.disabled}
            class="text-gray-300 border-gray-600 hover:text-white hover:border-gray-500"
          >
            Notes
          </Button>
        </div>
      </div>

      {/* Import Section */}
      <div>
        <h3 class="text-lg font-medium text-white mb-4 flex items-center">
          <IconUpload class="mr-2 h-5 w-5" />
          Import Data
        </h3>
        
        {/* File Input */}
        <div class="mb-4">
          <input
            id="import-file-input"
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            disabled={props.disabled || isImporting()}
            class="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Import Status */}
        <Show when={importStatus() !== 'idle'}>
          <div class={`p-4 rounded-lg mb-4 ${
            importStatus() === 'success' 
              ? 'bg-green-900/20 border border-green-700/50 text-green-300' 
              : importStatus() === 'error'
              ? 'bg-red-900/20 border border-red-700/50 text-red-300'
              : 'bg-blue-900/20 border border-blue-700/50 text-blue-300'
          }`}>
            <div class="flex items-start">
              <Show 
                when={importStatus() === 'success'}
                fallback={<IconAlertTriangle class="mr-2 h-5 w-5 flex-shrink-0 mt-0.5" />}
              >
                <IconCheck class="mr-2 h-5 w-5 flex-shrink-0 mt-0.5" />
              </Show>
              <div class="flex-1">
                <p class="font-medium">
                  {importStatus() === 'validating' ? 'Validating...' : 
                   importStatus() === 'success' ? 'File Valid' : 
                   'Import Error'}
                </p>
                <p class="text-sm mt-1">{importMessage()}</p>
              </div>
            </div>
          </div>
        </Show>

        {/* Import Actions */}
        <Show when={importStatus() === 'success' && props.onImport}>
          <div class="flex space-x-3">
            <Button
              onClick={handleImport}
              disabled={isImporting()}
              class="bg-blue-600 hover:bg-blue-700"
            >
              {isImporting() ? 'Importing...' : 'Import Data'}
            </Button>
            <Button
              variant="outline"
              onClick={resetImport}
              disabled={isImporting()}
              class="text-gray-300 border-gray-600 hover:text-white hover:border-gray-500"
            >
              Cancel
            </Button>
          </div>
        </Show>

        {/* Import Preview */}
        <Show when={importData() && importStatus() === 'success'}>
          <div class="mt-4 p-4 bg-gray-800 border border-gray-700 rounded-lg">
            <h4 class="text-sm font-medium text-white mb-2">Import Preview</h4>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span class="text-gray-400">Bookmarks:</span>
                <span class="ml-2 text-white">{importData()!.bookmarks.length}</span>
              </div>
              <div>
                <span class="text-gray-400">Tasks:</span>
                <span class="ml-2 text-white">{importData()!.tasks.length}</span>
              </div>
              <div>
                <span class="text-gray-400">Notes:</span>
                <span class="ml-2 text-white">{importData()!.notes.length}</span>
              </div>
              <div>
                <span class="text-gray-400">Files:</span>
                <span class="ml-2 text-white">{importData()!.files.length}</span>
              </div>
            </div>
            <div class="mt-2 text-xs text-gray-400">
              Export date: {new Date(importData()!.exportDate).toLocaleDateString()}
            </div>
          </div>
        </Show>
      </div>
    </div>
  )
}
