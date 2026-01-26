import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { 
  IconSettings, 
  IconUser, 
  IconBell,
  IconLock,
  IconDatabase,
  IconPalette,
  IconDownload,
  IconUpload
} from '@tabler/icons-solidjs'

export function Settings() {
  return (
    <div class="space-y-6">
      {/* Page Header */}
      <div>
        <h1 class="text-3xl font-bold text-white">Settings</h1>
        <p class="text-gray-400 mt-2">Manage your account and application preferences</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Navigation */}
        <div class="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center space-x-2">
                <IconSettings class="h-5 w-5" />
                <span>Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent class="space-y-2">
              <Button variant="ghost" class="w-full justify-start text-white">
                <IconUser class="mr-2 h-4 w-4" />
                Profile
              </Button>
              <Button variant="ghost" class="w-full justify-start text-gray-400">
                <IconBell class="mr-2 h-4 w-4" />
                Notifications
              </Button>
              <Button variant="ghost" class="w-full justify-start text-gray-400">
                <IconLock class="mr-2 h-4 w-4" />
                Security
              </Button>
              <Button variant="ghost" class="w-full justify-start text-gray-400">
                <IconDatabase class="mr-2 h-4 w-4" />
                Data & Storage
              </Button>
              <Button variant="ghost" class="w-full justify-start text-gray-400">
                <IconPalette class="mr-2 h-4 w-4" />
                Appearance
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Settings Content */}
        <div class="lg:col-span-2 space-y-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center space-x-2">
                <IconUser class="h-5 w-5" />
                <span>Profile Settings</span>
              </CardTitle>
              <CardDescription>
                Update your personal information and account details
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="text-sm font-medium text-gray-300">First Name</label>
                  <Input placeholder="John" class="mt-1 bg-gray-800 border-gray-700" />
                </div>
                <div>
                  <label class="text-sm font-medium text-gray-300">Last Name</label>
                  <Input placeholder="Doe" class="mt-1 bg-gray-800 border-gray-700" />
                </div>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-300">Email</label>
                <Input type="email" placeholder="john.doe@example.com" class="mt-1 bg-gray-800 border-gray-700" />
              </div>
              <div>
                <label class="text-sm font-medium text-gray-300">Bio</label>
                <textarea 
                  class="w-full mt-1 p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none"
                  rows={3}
                  placeholder="Tell us about yourself..."
                />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center space-x-2">
                <IconDatabase class="h-5 w-5" />
                <span>Data Management</span>
              </CardTitle>
              <CardDescription>
                Import, export, and manage your data
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="flex items-center justify-between p-4 border border-gray-700 rounded-lg">
                <div>
                  <h4 class="font-medium text-white">Export Data</h4>
                  <p class="text-sm text-gray-400">Download all your bookmarks, tasks, and files</p>
                </div>
                <Button variant="outline">
                  <IconDownload class="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
              <div class="flex items-center justify-between p-4 border border-gray-700 rounded-lg">
                <div>
                  <h4 class="font-medium text-white">Import Data</h4>
                  <p class="text-sm text-gray-400">Import data from other services</p>
                </div>
                <Button variant="outline">
                  <IconUpload class="mr-2 h-4 w-4" />
                  Import
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center space-x-2">
                <IconPalette class="h-5 w-5" />
                <span>Appearance</span>
              </CardTitle>
              <CardDescription>
                Customize the look and feel of Trackeep
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <div>
                <label class="text-sm font-medium text-gray-300">Theme</label>
                <div class="mt-2 space-y-2">
                  <label class="flex items-center space-x-3">
                    <input type="radio" name="theme" checked class="text-primary-500" />
                    <span class="text-white">Dark (Default)</span>
                  </label>
                  <label class="flex items-center space-x-3">
                    <input type="radio" name="theme" class="text-primary-500" />
                    <span class="text-white">Light</span>
                  </label>
                  <label class="flex items-center space-x-3">
                    <input type="radio" name="theme" class="text-primary-500" />
                    <span class="text-white">System</span>
                  </label>
                </div>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-300">Accent Color</label>
                <div class="mt-2 flex space-x-2">
                  <button class="w-8 h-8 rounded-full bg-primary-500 border-2 border-white"></button>
                  <button class="w-8 h-8 rounded-full bg-green-500"></button>
                  <button class="w-8 h-8 rounded-full bg-purple-500"></button>
                  <button class="w-8 h-8 rounded-full bg-red-500"></button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
