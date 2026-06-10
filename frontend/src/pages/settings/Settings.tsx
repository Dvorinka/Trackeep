import { createSignal, onMount, Show, For } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { useAuth } from '@/lib/auth';
import { IconUser, IconLock, IconKey, IconMail, IconSend, IconShield, IconDownload, IconClock } from '@tabler/icons-solidjs';
import { TwoFactorAuth } from '@/components/TwoFactorAuth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useHaptics } from '@/lib/haptics';
import { getApiV1BaseUrl, getApiOrigin } from '@/lib/api-url';

interface BrowserExtensionApiKey {
  id: number;
  name: string;
  permissions: string[];
  is_active: boolean;
  last_used?: string;
}

interface BrowserExtensionClient {
  id: number;
  extension_id: string;
  name: string;
  is_active: boolean;
  last_seen?: string;
}

export const Settings = () => {
  const { authState, updateProfile, changePassword } = useAuth();
  const navigate = useNavigate();
  const haptics = useHaptics();
  const apiBaseUrl = getApiV1BaseUrl();
  const [isLoading, setIsLoading] = createSignal(false);
  const [message, setMessage] = createSignal('');
  const [profileData, setProfileData] = createSignal({
    fullName: '',
    theme: 'dark'
  });
  const [customColors, setCustomColors] = createSignal({
    primary: '#5ab9ff',
    background: '#000000',
    foreground: '#ffffff',
    muted: '#262727',
    border: '#262626'
  });

  // Apply color changes immediately to CSS custom properties
  const applyColorChange = (colorType: string, color: string) => {
    setCustomColors(prev => {
      const newColors = { ...prev, [colorType]: color };
      
      // Save to localStorage for persistence
      localStorage.setItem('customColors', JSON.stringify(newColors));
      localStorage.setItem('colorScheme', 'custom');
      
      return newColors;
    });
    
    // Apply immediately to CSS custom properties with proper HSL conversion
    const root = document.documentElement;
    
    // Convert hex to HSL for CSS variables
    const hexToHsl = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return '0 0% 100%';
      
      let r = parseInt(result[1], 16) / 255;
      let g = parseInt(result[2], 16) / 255;
      let b = parseInt(result[3], 16) / 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      
      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };
    
    const hslColor = hexToHsl(color);
    
    if (colorType === 'primary') {
      root.style.setProperty('--primary', hslColor);
      root.style.setProperty('--ring', hslColor);
      root.style.setProperty('--colors-primary', hslColor);
    } else if (colorType === 'background') {
      root.style.setProperty('--background', hslColor);
      root.style.setProperty('--colors-background', hslColor);
    } else if (colorType === 'foreground') {
      root.style.setProperty('--foreground', hslColor);
      root.style.setProperty('--colors-foreground', hslColor);
    } else if (colorType === 'muted') {
      root.style.setProperty('--muted', hslColor);
      root.style.setProperty('--colors-muted', hslColor);
    } else if (colorType === 'border') {
      root.style.setProperty('--border', color);
      root.style.setProperty('--colors-border', color);
    }
  };
  const [passwordData, setPasswordData] = createSignal({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [emailSettings, setEmailSettings] = createSignal({
    smtp_enabled: false,
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    smtp_from_email: '',
    smtp_from_name: 'Trackeep',
    smtp_encryption: 'tls' as 'none' | 'ssl' | 'tls',
    oauth_enabled: false,
    oauth_provider: 'google' as 'google' | 'microsoft' | 'github',
    oauth_client_id: '',
    oauth_client_secret: '',
    oauth_redirect_uri: ''
  });
  const [emailSettingsExpanded, setEmailSettingsExpanded] = createSignal(true);
  const [activeTab, setActiveTab] = createSignal('account');
  const [browserExtensionApiKeys, setBrowserExtensionApiKeys] = createSignal<BrowserExtensionApiKey[]>([]);
  const [browserExtensions, setBrowserExtensions] = createSignal<BrowserExtensionClient[]>([]);

  const tabs = [
    { id: 'account', name: 'Account', icon: IconUser },
    { id: 'security', name: 'Security', icon: IconShield },
    { id: 'communication', name: 'Communication', icon: IconMail },
    { id: 'tools', name: 'Tools', icon: IconDownload },
    { id: 'solidtime', name: 'Solidtime', icon: IconClock }
  ];

  const [solidtimeSettings, setSolidtimeSettings] = createSignal({
    apiKey: localStorage.getItem('solidtime_api_key') || '',
    orgId: localStorage.getItem('solidtime_org_id') || ''
  });

  onMount(() => {
    if (authState.user) {
      setProfileData({
        fullName: authState.user.full_name,
        theme: authState.user.theme || 'dark'
      });
    }
    
    // Load saved custom colors
    const savedColors = localStorage.getItem('customColors');
    const savedScheme = localStorage.getItem('colorScheme');
    if (savedColors && savedScheme === 'custom') {
      try {
        const colors = JSON.parse(savedColors);
        setCustomColors(colors);
        // Apply the saved colors immediately
        Object.entries(colors).forEach(([colorType, color]) => {
          if (typeof color === 'string') {
            applyColorChange(colorType, color);
          }
        });
      } catch (e) {
        console.error('Failed to load custom colors:', e);
      }
    }
    
    loadBrowserExtensionAccess();
  });




  const loadBrowserExtensionAccess = async () => {
    try {
      const token = localStorage.getItem('trackeep_token') || localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
      };

      const [apiKeysResponse, extensionsResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/browser-extension/api-keys`, { headers }),
        fetch(`${apiBaseUrl}/browser-extension/extensions`, { headers }),
      ]);

      if (apiKeysResponse.ok) {
        const keys = await apiKeysResponse.json();
        setBrowserExtensionApiKeys(Array.isArray(keys) ? keys : []);
      }

      if (extensionsResponse.ok) {
        const extensions = await extensionsResponse.json();
        setBrowserExtensions(Array.isArray(extensions) ? extensions : []);
      }
    } catch (error) {
      console.error('Failed to load browser extension access:', error);
      setBrowserExtensionApiKeys([]);
      setBrowserExtensions([]);
    }
  };

  const handleUpdateProfile = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      await updateProfile({
        fullName: profileData().fullName,
        theme: profileData().theme
      });
      
      setMessage('Profile updated successfully!');
      haptics.success();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to update profile');
      haptics.error();
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData().newPassword !== passwordData().confirmPassword) {
      setMessage('New passwords do not match');
      haptics.warning();
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      await changePassword({
        currentPassword: passwordData().currentPassword,
        newPassword: passwordData().newPassword
      });
      setMessage('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      haptics.success();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to change password');
      haptics.error();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div class="p-6 mt-4 pb-32 max-w-6xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-foreground mb-2">Settings</h1>
        <p class="text-lg text-muted-foreground">Manage your account, preferences, and integrations</p>
      </div>

      {message() && (
        <div class={`p-4 rounded-lg text-sm mb-6 ${
          message().includes('success') 
            ? 'bg-primary/15 border border-primary/20 text-primary' 
            : 'bg-destructive/15 border border-destructive/20 text-destructive'
        }`}>
          {message()}
        </div>
      )}

      {/* Tab Navigation */}
      <div class="border-b border-border mb-6">
        <nav class="flex space-x-1 overflow-x-auto scrollbar-hide">
          <For each={tabs}>
            {(tab) => (
              <button
                onClick={() => {
                  setActiveTab(tab.id);
                  haptics.selection();
                }}
                class={`flex items-center gap-2 px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab() === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon class="size-4" />
                {tab.name}
              </button>
            )}
          </For>
        </nav>
      </div>

      {/* Tab Content */}
      <div class="space-y-6">
        {/* Account Tab */}
        <Show when={activeTab() === 'account'}>
          <div class="space-y-6">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card class="p-6">
                <h2 class="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <div class="bg-muted flex items-center justify-center p-2 rounded-lg">
                    <IconUser class="size-4 text-primary" />
                  </div>
                  Profile Settings
                </h2>
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-muted-foreground mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={authState.user?.email || ''}
                      disabled
                      class="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
                    />
                    <p class="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-muted-foreground mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={authState.user?.username || ''}
                      disabled
                      class="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
                    />
                    <p class="text-xs text-muted-foreground mt-1">Username cannot be changed</p>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-muted-foreground mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profileData().fullName}
                      onInput={(e) => {
                        const target = e.currentTarget as HTMLInputElement;
                        if (target) setProfileData(prev => ({ ...prev, fullName: target.value }));
                      }}
                      placeholder="Enter your full name"
                      class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-muted-foreground mb-2">
                      Theme
                    </label>
                    <select
                      value={profileData().theme}
                      onChange={(e) => setProfileData(prev => ({ ...prev, theme: e.target.value }))}
                      class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                    >
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                      <option value="system">System</option>
                    </select>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-muted-foreground mb-2">
                      Primary Color
                    </label>
                    <div class="flex items-center gap-3">
                      <input
                        type="color"
                        value={customColors().primary}
                        onChange={(e) => applyColorChange('primary', e.target.value)}
                        class="h-10 w-20 rounded border border-input bg-background cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customColors().primary}
                        onChange={(e) => applyColorChange('primary', e.target.value)}
                        placeholder="#5ab9ff"
                        class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring font-mono"
                      />
                    </div>
                    <div class="flex gap-2 mt-2">
                      <For each={['#5ab9ff', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b', '#6ab04c']}>
                        {(color) => (
                          <button
                            type="button"
                            onClick={() => applyColorChange('primary', color)}
                            class="w-8 h-8 rounded border-2 border-border hover:border-primary transition-colors"
                            style={{ 'background-color': color }}
                            title={color}
                          />
                        )}
                      </For>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleUpdateProfile}
                    disabled={isLoading()}
                    class="inline-flex justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-4 py-2 disabled:opacity-50"
                  >
                    {isLoading() ? 'Updating...' : 'Update Profile'}
                  </button>
                </div>
              </Card>

              <Card class="p-6">
                <h2 class="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <IconLock class="size-5" />
                  Change Password
                </h2>
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-muted-foreground mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordData().currentPassword}
                      onInput={(e) => {
                        const target = e.currentTarget as HTMLInputElement;
                        if (target) setPasswordData(prev => ({ ...prev, currentPassword: target.value }));
                      }}
                      placeholder="Enter current password"
                      class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-muted-foreground mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData().newPassword}
                      onInput={(e) => {
                        const target = e.currentTarget as HTMLInputElement;
                        if (target) setPasswordData(prev => ({ ...prev, newPassword: target.value }));
                      }}
                      placeholder="Enter new password"
                      class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-muted-foreground mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData().confirmPassword}
                      onInput={(e) => {
                        const target = e.currentTarget as HTMLInputElement;
                        if (target) setPasswordData(prev => ({ ...prev, confirmPassword: target.value }));
                      }}
                      placeholder="Confirm new password"
                      class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={isLoading()}
                    class="inline-flex justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-auto items-center gap-2 py-2 px-4 w-full"
                  >
                    {isLoading() ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </Card>
            </div>
          </div>
        </Show>

      {/* Security Tab */}
        <Show when={activeTab() === 'security'}>
          <div class="space-y-6">
            {/* Two-Factor Authentication Section */}
            <div class="border rounded-lg p-6">
              <h2 class="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <IconKey class="size-5" />
                Two-Factor Authentication
              </h2>
              <TwoFactorAuth />
            </div>
          </div>
        </Show>

        {/* Communication Tab */}
        <Show when={activeTab() === 'communication'}>
          <div class="space-y-6">
            {/* Email & OAuth Settings */}
            <div class="border rounded-lg p-6">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-semibold text-foreground flex items-center gap-2">
                  <IconMail class="size-5" />
                  Email Settings
                </h2>
                <button
                  type="button"
                  onClick={() => setEmailSettingsExpanded(!emailSettingsExpanded())}
                  class="inline-flex justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground shadow hover:bg-secondary/90 h-auto items-center gap-2 py-1 px-3"
                >
                  {emailSettingsExpanded() ? 'Collapse' : 'Expand'}
                </button>
              </div>

              <Show when={emailSettingsExpanded()}>
                <div class="space-y-6">
                  {/* SMTP Configuration */}
                  <div class="border rounded-lg p-4">
                    <h3 class="text-lg font-medium text-foreground mb-3 flex items-center gap-2">
                      <IconSend class="size-4" />
                      SMTP Configuration
                    </h3>
                    <div class="space-y-4">
                      <div class="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={emailSettings().smtp_enabled}
                          onChange={(e) => {
                            setEmailSettings(prev => ({ ...prev, smtp_enabled: e.currentTarget.checked }));
                          }}
                          class="rounded border-input"
                        />
                        <label class="text-sm font-medium text-foreground">Enable SMTP</label>
                      </div>
                      
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label class="block text-sm font-medium text-muted-foreground mb-1">SMTP Host</label>
                          <input
                            type="text"
                            value={emailSettings().smtp_host}
                            onInput={(e) => setEmailSettings(prev => ({ ...prev, smtp_host: e.currentTarget.value }))}
                            placeholder="smtp.gmail.com"
                            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                          />
                        </div>
                        
                        <div>
                          <label class="block text-sm font-medium text-muted-foreground mb-1">Port</label>
                          <input
                            type="number"
                            value={emailSettings().smtp_port}
                            onInput={(e) => setEmailSettings(prev => ({ ...prev, smtp_port: parseInt(e.currentTarget.value) }))}
                            placeholder="587"
                            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                          />
                        </div>
                      </div>
                      
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label class="block text-sm font-medium text-muted-foreground mb-1">Username</label>
                          <input
                            type="text"
                            value={emailSettings().smtp_username}
                            onInput={(e) => setEmailSettings(prev => ({ ...prev, smtp_username: e.currentTarget.value }))}
                            placeholder="your-email@gmail.com"
                            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                          />
                        </div>
                        
                        <div>
                          <label class="block text-sm font-medium text-muted-foreground mb-1">Password</label>
                          <input
                            type="password"
                            value={emailSettings().smtp_password}
                            onInput={(e) => setEmailSettings(prev => ({ ...prev, smtp_password: e.currentTarget.value }))}
                            placeholder="App password"
                            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                          />
                        </div>
                      </div>
                      
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label class="block text-sm font-medium text-muted-foreground mb-1">From Email</label>
                          <input
                            type="email"
                            value={emailSettings().smtp_from_email}
                            onInput={(e) => setEmailSettings(prev => ({ ...prev, smtp_from_email: e.currentTarget.value }))}
                            placeholder="noreply@trackeep.com"
                            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                          />
                        </div>
                        
                        <div>
                          <label class="block text-sm font-medium text-muted-foreground mb-1">From Name</label>
                          <input
                            type="text"
                            value={emailSettings().smtp_from_name}
                            onInput={(e) => setEmailSettings(prev => ({ ...prev, smtp_from_name: e.currentTarget.value }))}
                            placeholder="Trackeep"
                            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label class="block text-sm font-medium text-muted-foreground mb-1">Encryption</label>
                        <select
                          value={emailSettings().smtp_encryption}
                          onChange={(e) => setEmailSettings(prev => ({ ...prev, smtp_encryption: e.currentTarget.value as 'none' | 'ssl' | 'tls' }))}
                          class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                        >
                          <option value="none">None</option>
                          <option value="ssl">SSL</option>
                          <option value="tls">TLS</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div class="flex gap-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={async () => {
                        // Save email settings
                        try {
                          const token = localStorage.getItem('token');
                          const response = await fetch(`${getApiOrigin()}/api/v1/auth/email/settings`, {
                            method: 'PUT',
                            headers: {
                              'Authorization': `Bearer ${token}`,
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(emailSettings())
                          });

                          if (response.ok) {
                            setMessage('Email settings saved successfully!');
                          } else {
                            setMessage('Failed to save email settings');
                          }
                        } catch (error) {
                          console.error('Failed to save email settings:', error);
                          setMessage('Failed to save email settings');
                        }
                      }}
                      class="inline-flex justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-auto items-center gap-2 py-2 px-4"
                    >
                      Save Email Settings
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        // Test email configuration
                        try {
                          const token = localStorage.getItem('token');
                          const response = await fetch(`${getApiOrigin()}/api/v1/auth/email/test`, {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${token}`,
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(emailSettings())
                          });

                          if (response.ok) {
                            setMessage('Email test successful!');
                          } else {
                            setMessage('Email test failed');
                          }
                        } catch (error) {
                          console.error('Failed to test email configuration:', error);
                          setMessage('Email test failed');
                        }
                      }}
                      class="inline-flex justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground shadow hover:bg-secondary/90 h-auto items-center gap-2 py-2 px-4"
                    >
                      Test Configuration
                    </button>
                  </div>
                </div>
              </Show>
            </div>
          </div>
        </Show>

        {/* Tools Tab */}
        <Show when={activeTab() === 'tools'}>
          <div class="space-y-6">
            <div class="border rounded-lg p-6">
              <h2 class="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <IconDownload class="size-5" />
                Browser Extension
              </h2>
              <div class="space-y-4">
                <p class="text-sm text-muted-foreground">
                  The extension authenticates with a Trackeep browser-extension API key. Download the extension, then connect it with a key from your account.
                </p>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div class="rounded-xl border border-border/70 bg-muted/20 p-4">
                    <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-1">Active API Keys</p>
                    <p class="text-2xl font-semibold text-foreground">
                      {browserExtensionApiKeys().filter((key) => key.is_active).length}
                    </p>
                    <p class="text-xs text-muted-foreground mt-1">
                      {browserExtensionApiKeys()[0]?.name || 'No extension key created yet'}
                    </p>
                  </div>
                  <div class="rounded-xl border border-border/70 bg-muted/20 p-4">
                    <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-1">Connected Extensions</p>
                    <p class="text-2xl font-semibold text-foreground">
                      {browserExtensions().filter((extension) => extension.is_active).length}
                    </p>
                    <p class="text-xs text-muted-foreground mt-1">
                      {browserExtensions()[0]?.name || 'No extension connected yet'}
                    </p>
                  </div>
                  <div class="rounded-xl border border-border/70 bg-muted/20 p-4">
                    <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-1">Last Activity</p>
                    <p class="text-sm font-medium text-foreground">
                      {browserExtensions()[0]?.last_seen
                        ? new Date(browserExtensions()[0].last_seen as string).toLocaleString()
                        : browserExtensionApiKeys()[0]?.last_used
                          ? new Date(browserExtensionApiKeys()[0].last_used as string).toLocaleString()
                          : 'No extension activity yet'}
                    </p>
                    <p class="text-xs text-muted-foreground mt-1">
                      Paste an API key into the extension options after installation.
                    </p>
                  </div>
                </div>

                <div class="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <h4 class="font-medium text-foreground mb-2">Connection flow</h4>
                  <div class="space-y-2 text-sm text-muted-foreground">
                    <div class="flex items-start gap-2">
                      <span class="text-primary">1.</span>
                      <span>Download and unpack the extension.</span>
                    </div>
                    <div class="flex items-start gap-2">
                      <span class="text-primary">2.</span>
                      <span>Create or reuse a browser-extension API key in Trackeep.</span>
                    </div>
                    <div class="flex items-start gap-2">
                      <span class="text-primary">3.</span>
                      <span>Paste that key into the extension settings to connect bookmarks, files, notes, and tasks.</span>
                    </div>
                  </div>
                </div>

                <div class="flex flex-wrap gap-3">
                  <Button
                    onClick={() => navigate('/app/browser-extension')}
                    variant="default"
                    class="flex items-center gap-2"
                  >
                    <IconKey class="size-4" />
                    Manage API Keys
                  </Button>
                  <Button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = '/browser-extension';
                      link.download = 'browser-extension.zip';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    variant="outline"
                    class="flex items-center gap-2"
                  >
                    <IconDownload class="size-4" />
                    Download Extension (ZIP)
                  </Button>
                </div>
                <div class="bg-muted/30 rounded-lg p-4">
                  <h4 class="font-medium text-foreground mb-2">Installation Instructions:</h4>
                  <div class="space-y-2 text-sm text-muted-foreground">
                    <div class="flex items-start gap-2">
                      <span class="text-primary">•</span>
                      <span><strong>Step 1:</strong> Download the ZIP file using the button above</span>
                    </div>
                    <div class="flex items-start gap-2">
                      <span class="text-primary">•</span>
                      <span><strong>Step 2:</strong> Extract the ZIP file to a folder on your computer</span>
                    </div>
                    <div class="flex items-start gap-2">
                      <span class="text-primary">•</span>
                      <span><strong>Brave/Chrome:</strong> Go to Settings → Extensions → Enable Developer mode → Load unpacked → Select the extracted folder</span>
                    </div>
                    <div class="flex items-start gap-2">
                      <span class="text-primary">•</span>
                      <span><strong>Firefox:</strong> Go to about:debugging#/runtime/this-firefox → Load Temporary Add-on → Select manifest.json in the extracted folder</span>
                    </div>
                  </div>
                  <p class="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                    Note: The extension must be loaded as unpacked for proper functionality. Do not attempt to install the ZIP file directly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Show>

        <Show when={activeTab() === 'solidtime'}>
          <div class="space-y-6">
            <Card class="p-6">
              <h2 class="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <div class="bg-muted flex items-center justify-center p-2 rounded-lg">
                  <IconClock class="size-4 text-primary" />
                </div>
                Solidtime Integration
              </h2>
              <p class="text-sm text-muted-foreground mb-6">
                Configure your solidtime.io API credentials to enable time tracking integration.
              </p>

              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-muted-foreground mb-1">API Key</label>
                  <input
                    type="password"
                    value={solidtimeSettings().apiKey}
                    onInput={(e) => setSolidtimeSettings(prev => ({ ...prev, apiKey: e.currentTarget.value }))}
                    placeholder="Enter your solidtime API key"
                    class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                  />
                  <p class="text-xs text-muted-foreground mt-1">
                    Get your API key from solidtime.io Profile Settings
                  </p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-muted-foreground mb-1">Organization ID</label>
                  <input
                    type="text"
                    value={solidtimeSettings().orgId}
                    onInput={(e) => setSolidtimeSettings(prev => ({ ...prev, orgId: e.currentTarget.value }))}
                    placeholder="Enter your organization ID"
                    class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                  />
                  <p class="text-xs text-muted-foreground mt-1">
                    Find your organization ID in your solidtime.io dashboard URL
                  </p>
                </div>

                <div class="flex gap-3">
                  <Button
                    onClick={() => {
                      localStorage.setItem('solidtime_api_key', solidtimeSettings().apiKey);
                      localStorage.setItem('solidtime_org_id', solidtimeSettings().orgId);
                      setMessage('Solidtime credentials saved successfully!');
                      haptics.success();
                    }}
                    class="flex items-center gap-2"
                  >
                    <IconKey class="size-4" />
                    Save Credentials
                  </Button>
                  <Button
                    onClick={() => {
                      localStorage.removeItem('solidtime_api_key');
                      localStorage.removeItem('solidtime_org_id');
                      setSolidtimeSettings({ apiKey: '', orgId: '' });
                      setMessage('Solidtime credentials cleared');
                      haptics.selection();
                    }}
                    variant="outline"
                  >
                    Clear
                  </Button>
                </div>
              </div>

              <div class="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <h4 class="font-medium text-foreground mb-2">How to get your credentials</h4>
                <div class="space-y-2 text-sm text-muted-foreground">
                  <div class="flex items-start gap-2">
                    <span class="text-primary">1.</span>
                    <span>Log in to your solidtime.io account</span>
                  </div>
                  <div class="flex items-start gap-2">
                    <span class="text-primary">2.</span>
                    <span>Go to Profile Settings → API Tokens</span>
                  </div>
                  <div class="flex items-start gap-2">
                    <span class="text-primary">3.</span>
                    <span>Create a new API token and copy it</span>
                  </div>
                  <div class="flex items-start gap-2">
                    <span class="text-primary">4.</span>
                    <span>Your organization ID is in the dashboard URL: /organizations/{'{id}'}/...</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </Show>
      </div>
    </div>
  );
};
