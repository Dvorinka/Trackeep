import { createSignal, onMount, Show, For } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { useAuth } from '@/lib/auth';
import { IconUser, IconLock, IconKey, IconBrain, IconMail, IconSend, IconShield, IconDownload } from '@tabler/icons-solidjs';
import { TwoFactorAuth } from '@/components/TwoFactorAuth';
import { Button } from '@/components/ui/Button';
import { AIProviderIcon } from '@/components/AIProviderIcon';
import { useHaptics } from '@/lib/haptics';
import { getApiV1BaseUrl } from '@/lib/api-url';

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
    theme: 'dark',
    showBrowserSearch: true
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
  const [aiSettings, setAISettings] = createSignal({
    mistral: { enabled: false, api_key: '', model: 'mistral-small-latest', model_thinking: 'mistral-large-latest' },
    grok: { enabled: false, api_key: '', base_url: 'https://api.x.ai/v1', model: 'grok-4-1-fast-non-reasoning-latest', model_thinking: 'grok-4-1-fast-reasoning-latest' },
    deepseek: { enabled: false, api_key: '', base_url: 'https://api.deepseek.com', model: 'deepseek-chat', model_thinking: 'deepseek-reasoner' },
    ollama: { enabled: false, base_url: 'http://localhost:11434', model: 'llama3.1', model_thinking: 'llama3.1' },
    longcat: { enabled: false, api_key: '', base_url: 'https://api.longcat.chat', openai_endpoint: 'https://api.longcat.chat/openai', anthropic_endpoint: 'https://api.longcat.chat/anthropic', model: 'LongCat-Flash-Chat', model_thinking: 'LongCat-Flash-Thinking', model_thinking_upgraded: 'LongCat-Flash-Thinking-2601', format: 'openai' },
    openrouter: { enabled: false, api_key: '', base_url: 'https://openrouter.ai/api', model: 'openrouter/auto', model_thinking: 'openrouter/auto' }
  });
  const [availableAIProviders, setAvailableAIProviders] = createSignal<string[]>([]);
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
  const [searchSettings, setSearchSettings] = createSignal({
    brave_api_key: '',
    brave_search_base_url: 'https://api.search.brave.com/res/v1/web/search',
    serper_api_key: '',
    serper_base_url: 'https://google.serper.dev/search',
    search_api_provider: 'brave',
    search_results_limit: 10,
    search_cache_ttl: 300,
    search_rate_limit: 100
  });
  const [emailSettingsExpanded, setEmailSettingsExpanded] = createSignal(true);
  const [aiLoading, setAiLoading] = createSignal(false);
  const [activeTab, setActiveTab] = createSignal('account');
  const [browserExtensionApiKeys, setBrowserExtensionApiKeys] = createSignal<BrowserExtensionApiKey[]>([]);
  const [browserExtensions, setBrowserExtensions] = createSignal<BrowserExtensionClient[]>([]);

  const tabs = [
    { id: 'account', name: 'Account', icon: IconUser },
    { id: 'security', name: 'Security', icon: IconShield },
    { id: 'ai', name: 'AI & Integration', icon: IconBrain },
    { id: 'communication', name: 'Communication', icon: IconMail },
    { id: 'search', name: 'Search API', icon: IconBrain },
    { id: 'tools', name: 'Tools', icon: IconDownload }
  ];

  onMount(() => {
    if (authState.user) {
      setProfileData({
        fullName: authState.user.full_name,
        theme: authState.user.theme || 'dark',
        showBrowserSearch: localStorage.getItem('showBrowserSearch') !== 'false'
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
    
    loadAISettings();
    loadAvailableAIProviders();
    loadSearchSettings();
    loadBrowserExtensionAccess();
  });




  const loadAISettings = async () => {
    try {
      const endpoint = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/auth/ai/settings`;
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAISettings(data);
      }
    } catch (error) {
      console.error('Failed to load AI settings:', error);
    }
  };

  const loadAvailableAIProviders = async () => {
    try {
      const endpoint = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/ai/providers`;
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const providers = (data.providers || []) as { id: string }[];
        setAvailableAIProviders(providers.map((p) => p.id));
      }
    } catch (error) {
      console.error('Failed to load available AI providers:', error);
      setAvailableAIProviders(['mistral', 'grok', 'deepseek', 'ollama', 'longcat', 'openrouter']);
    }
  };

  const loadSearchSettings = async () => {
    try {
      const endpoint = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/auth/search/settings`;
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSearchSettings(data);
      }
    } catch (error) {
      console.error('Failed to load search settings:', error);
    }
  };

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

  const handleUpdateAISettings = async () => {
    setAiLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/auth/ai/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(aiSettings())
      });

      if (response.ok) {
        setMessage('AI settings updated successfully!');
        await loadAISettings(); // Reload to get masked keys
      } else {
        const error = await response.json();
        setMessage(error.error || 'Failed to update AI settings');
      }
    } catch (error) {
      setMessage('Failed to update AI settings');
    } finally {
      setAiLoading(false);
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
      
      // Save browser search setting to localStorage
      localStorage.setItem('showBrowserSearch', profileData().showBrowserSearch.toString());
      
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

  const handleUpdateSearchSettings = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/auth/search/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchSettings())
      });

      if (response.ok) {
        setMessage('Search settings updated successfully!');
        await loadSearchSettings();
      } else {
        const error = await response.json();
        setMessage(error.error || 'Failed to update search settings');
      }
    } catch (error) {
      setMessage('Failed to update search settings');
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
        <nav class="flex space-x-1">
          <For each={tabs}>
            {(tab) => (
              <button
                onClick={() => {
                  setActiveTab(tab.id);
                  haptics.selection();
                }}
                class={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
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
              <div class="border rounded-lg p-6">
                <h2 class="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <IconUser class="size-5" />
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
              </div>

              <div class="border rounded-lg p-6">
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
              </div>
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

        {/* AI & Integration Tab */}
        <Show when={activeTab() === 'ai'}>
          <div class="space-y-6">
            {/* AI Settings Section */}
            <div class="border rounded-lg p-6">
              <h2 class="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <IconBrain class="size-5" />
                AI Settings
              </h2>

              {/* AI Settings Summary */}
              <div class="mb-4 p-3 bg-muted/30 rounded-lg">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-muted-foreground">
                    {(() => {
                      const settings = aiSettings() || {};
                      const providers = availableAIProviders();
                      const enabledCount = Object.values(settings).filter((provider: any) => provider && provider.enabled).length;
                      const totalAvailable = providers.length || Object.keys(settings).length;
                      return `Active Providers: ${enabledCount} / ${totalAvailable}`;
                    })()}
                  </span>
                  <span class="text-xs text-muted-foreground">
                    {(() => {
                      const settings = aiSettings() || {};
                      const enabledCount = Object.values(settings).filter((provider: any) => provider && provider.enabled).length;
                      const totalAvailable = availableAIProviders().length || Object.keys(settings).length;

                      if (totalAvailable === 0) {
                        return 'No AI providers are available on the server. Check backend AI configuration.';
                      }

                      if (enabledCount === 0) {
                        return 'Providers are available but none are enabled. Enable at least one provider below.';
                      }

                      return `AI is ready. ${enabledCount} provider${enabledCount > 1 ? 's' : ''} enabled.`;
                    })()}
                  </span>
                </div>
              </div>

              {/* Quick Setup Section */}
              <div class="border rounded-lg p-4 bg-primary/5 mb-6">
                <h3 class="text-lg font-medium text-foreground mb-3">Quick Setup</h3>
                <p class="text-sm text-muted-foreground mb-4">
                  Configure the most commonly used AI providers quickly:
                </p>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <Button
                    variant={aiSettings().mistral.enabled ? "default" : "outline"}
                    onClick={() => {
                      const settings = aiSettings();
                      setAISettings({
                        ...settings,
                        mistral: { ...settings.mistral, enabled: !settings.mistral.enabled }
                      });
                      haptics.selection();
                    }}
                    class="justify-start"
                  >
                    <AIProviderIcon 
                      providerId="mistral" 
                      size="0.75rem"
                      white={aiSettings().mistral.enabled}
                    />
                    Mistral AI
                  </Button>
                  <Button
                    variant={aiSettings().longcat.enabled ? "default" : "outline"}
                    onClick={() => {
                      const settings = aiSettings();
                      setAISettings({
                        ...settings,
                        longcat: { ...settings.longcat, enabled: !settings.longcat.enabled }
                      });
                    }}
                    class="flex items-center gap-2"
                  >
                    <AIProviderIcon 
                      providerId="longcat" 
                      size="0.75rem"
                      white={aiSettings().longcat.enabled}
                    />
                    LongCat AI
                  </Button>
                  <Button
                    variant={aiSettings().grok.enabled ? "default" : "outline"}
                    onClick={() => {
                      const settings = aiSettings();
                      setAISettings({
                        ...settings,
                        grok: { ...settings.grok, enabled: !settings.grok.enabled }
                      });
                    }}
                    class="flex items-center gap-2"
                  >
                    <AIProviderIcon 
                      providerId="grok" 
                      size="0.75rem"
                      white={aiSettings().grok.enabled}
                    />
                    Grok AI
                  </Button>
                  <Button
                    variant={aiSettings().deepseek.enabled ? "default" : "outline"}
                    onClick={() => {
                      const settings = aiSettings();
                      setAISettings({
                        ...settings,
                        deepseek: { ...settings.deepseek, enabled: !settings.deepseek.enabled }
                      });
                    }}
                    class="flex items-center gap-2"
                  >
                    <AIProviderIcon 
                      providerId="deepseek" 
                      size="0.75rem"
                      white={aiSettings().deepseek.enabled}
                    />
                    DeepSeek AI
                  </Button>
                  <Button
                    variant={aiSettings().ollama.enabled ? "default" : "outline"}
                    onClick={() => {
                      const settings = aiSettings();
                      setAISettings({
                        ...settings,
                        ollama: { ...settings.ollama, enabled: !settings.ollama.enabled }
                      });
                    }}
                    class="flex items-center gap-2"
                  >
                    <AIProviderIcon 
                      providerId="ollama" 
                      size="0.75rem"
                      white={aiSettings().ollama.enabled}
                    />
                    Ollama (Local)
                  </Button>
                  <Button
                    variant={aiSettings().openrouter.enabled ? "default" : "outline"}
                    onClick={() => {
                      const settings = aiSettings();
                      setAISettings({
                        ...settings,
                        openrouter: { ...settings.openrouter, enabled: !settings.openrouter.enabled }
                      });
                    }}
                    class="flex items-center gap-2"
                  >
                    <AIProviderIcon 
                      providerId="openrouter" 
                      size="0.75rem"
                      white={aiSettings().openrouter.enabled}
                    />
                    OpenRouter
                  </Button>
                </div>
              </div>

              {/* Detailed Configuration */}
              <div class="space-y-6">
                <h4 class="text-md font-medium text-foreground">Detailed Configuration</h4>
                
                {/* Mistral Settings */}
                <Show when={aiSettings().mistral.enabled}>
                  <div class="border rounded-lg p-4">
                    <h3 class="text-lg font-medium text-foreground mb-3 flex items-center gap-2">
                      <span class="w-2 h-2 bg-blue-500 rounded-full"></span>
                      Mistral AI
                    </h3>
                    <div class="space-y-3">
                      <div class="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={aiSettings().mistral.enabled}
                          onChange={(e) => {
                            const settings = aiSettings();
                            setAISettings({
                              ...settings,
                              mistral: { ...settings.mistral, enabled: e.currentTarget.checked }
                            });
                          }}
                          class="rounded border-input"
                        />
                        <label class="text-sm font-medium text-foreground">Enable Mistral AI</label>
                      </div>

                      <div>
                        <label class="block text-sm font-medium text-muted-foreground mb-1">API Key *</label>
                        <div class="relative">
                          <input
                            type="password"
                            value={aiSettings().mistral.api_key}
                            onInput={(e) => {
                              const settings = aiSettings();
                              setAISettings({
                                ...settings,
                                mistral: { ...settings.mistral, api_key: e.currentTarget.value }
                              });
                            }}
                            placeholder="Enter Mistral API key"
                            required
                            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                          />
                          <button
                            type="button"
                            class="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                          >
                            <IconKey class="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div class="grid grid-cols-2 gap-3">
                        <div>
                          <label class="block text-sm font-medium text-muted-foreground mb-1">Model</label>
                          <input
                            type="text"
                            value={aiSettings().mistral.model}
                            onInput={(e) => {
                              const settings = aiSettings();
                              setAISettings({
                                ...settings,
                                mistral: { ...settings.mistral, model: e.currentTarget.value }
                              });
                            }}
                            placeholder="mistral-small-latest"
                            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                          />
                        </div>

                        <div>
                          <label class="block text-sm font-medium text-muted-foreground mb-1">Thinking Model</label>
                          <input
                            type="text"
                            value={aiSettings().mistral.model_thinking}
                            onInput={(e) => {
                              const settings = aiSettings();
                              setAISettings({
                                ...settings,
                                mistral: { ...settings.mistral, model_thinking: e.currentTarget.value }
                              });
                            }}
                            placeholder="mistral-large-latest"
                            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Show>

                {/* LongCat Settings */}
                <Show when={aiSettings().longcat.enabled}>
                  <div class="border rounded-lg p-4">
                    <h3 class="text-lg font-medium text-foreground mb-3 flex items-center gap-2">
                      <span class="w-2 h-2 bg-purple-500 rounded-full"></span>
                      LongCat AI
                    </h3>
                    <div class="space-y-3">
                      <div class="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={aiSettings().longcat.enabled}
                          onChange={(e) => {
                            const settings = aiSettings();
                            setAISettings({
                              ...settings,
                              longcat: { ...settings.longcat, enabled: e.currentTarget.checked }
                            });
                          }}
                          class="rounded border-input"
                        />
                        <label class="text-sm font-medium text-foreground">Enable LongCat AI</label>
                      </div>

                      <div>
                        <label class="block text-sm font-medium text-muted-foreground mb-1">API Key</label>
                        <div class="relative">
                          <input
                            type="password"
                            value={aiSettings().longcat.api_key}
                            onInput={(e) => {
                              const settings = aiSettings();
                              setAISettings({
                                ...settings,
                                longcat: { ...settings.longcat, api_key: e.currentTarget.value }
                              });
                            }}
                            placeholder="Enter LongCat API key"
                            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                          />
                          <button
                            type="button"
                            class="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                          >
                            <IconKey class="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label class="block text-sm font-medium text-muted-foreground mb-1">Base URL</label>
                        <input
                          type="text"
                          value={aiSettings().longcat.base_url}
                          onInput={(e) => {
                            const settings = aiSettings();
                            setAISettings({
                              ...settings,
                              longcat: { ...settings.longcat, base_url: e.currentTarget.value }
                            });
                          }}
                          placeholder="https://api.longcat.chat"
                          class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                        />
                      </div>

                      <div class="grid grid-cols-2 gap-3">
                        <div>
                          <label class="block text-sm font-medium text-muted-foreground mb-1">Default Model</label>
                          <select
                            value={aiSettings().longcat.model}
                            onChange={(e) => {
                              const settings = aiSettings();
                              setAISettings({
                                ...settings,
                                longcat: { ...settings.longcat, model: e.currentTarget.value }
                              });
                            }}
                            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                          >
                            <option value="LongCat-Flash-Chat">LongCat Flash Chat</option>
                            <option value="LongCat-Flash-Thinking">LongCat Flash Thinking</option>
                            <option value="LongCat-Flash-Thinking-2601">LongCat Flash Thinking 2601</option>
                          </select>
                        </div>
                        <div>
                          <label class="block text-sm font-medium text-muted-foreground mb-1">Thinking Model</label>
                          <select
                            value={aiSettings().longcat.model_thinking}
                            onChange={(e) => {
                              const settings = aiSettings();
                              setAISettings({
                                ...settings,
                                longcat: { ...settings.longcat, model_thinking: e.currentTarget.value }
                              });
                            }}
                            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                          >
                            <option value="LongCat-Flash-Thinking">LongCat Flash Thinking</option>
                            <option value="LongCat-Flash-Thinking-2601">LongCat Flash Thinking 2601</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </Show>

                {/* Grok Settings */}
                <Show when={aiSettings().grok.enabled}>
                  <div class="border rounded-lg p-4">
                    <h3 class="text-lg font-medium text-foreground mb-3 flex items-center gap-2">
                      <span class="w-2 h-2 bg-red-500 rounded-full"></span>
                      Grok AI
                    </h3>
                    <div class="space-y-3">
                      <div class="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={aiSettings().grok.enabled}
                          onChange={(e) => {
                            const settings = aiSettings();
                            setAISettings({
                              ...settings,
                              grok: { ...settings.grok, enabled: e.currentTarget.checked }
                            });
                          }}
                          class="rounded border-input"
                        />
                        <label class="text-sm font-medium text-foreground">Enable Grok AI</label>
                      </div>
                      
                      <div>
                        <label class="block text-sm font-medium text-muted-foreground mb-1">API Key</label>
                        <div class="relative">
                          <input
                            type="password"
                            value={aiSettings().grok.api_key}
                            onInput={(e) => {
                              const settings = aiSettings();
                              setAISettings({
                                ...settings,
                                grok: { ...settings.grok, api_key: e.currentTarget.value }
                              });
                            }}
                            placeholder="Enter Grok API key"
                            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                          />
                          <button
                            type="button"
                            class="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                          >
                            <IconKey class="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <label class="block text-sm font-medium text-muted-foreground mb-1">Base URL</label>
                        <input
                          type="text"
                          value={aiSettings().grok.base_url}
                          onInput={(e) => {
                            const settings = aiSettings();
                            setAISettings({
                              ...settings,
                              grok: { ...settings.grok, base_url: e.currentTarget.value }
                            });
                          }}
                          placeholder="https://api.x.ai/v1"
                          class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                        />
                      </div>
                      
                      <div class="grid grid-cols-2 gap-3">
                        <div>
                          <label class="block text-sm font-medium text-muted-foreground mb-1">Model</label>
                          <input
                            type="text"
                            value={aiSettings().grok.model}
                            onInput={(e) => {
                              const settings = aiSettings();
                              setAISettings({
                                ...settings,
                                grok: { ...settings.grok, model: e.currentTarget.value }
                              });
                            }}
                            placeholder="grok-4-1-fast-non-reasoning-latest"
                            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                          />
                        </div>
                        
                        <div>
                          <label class="block text-sm font-medium text-muted-foreground mb-1">Thinking Model</label>
                          <input
                            type="text"
                            value={aiSettings().grok.model_thinking}
                            onInput={(e) => {
                              const settings = aiSettings();
                              setAISettings({
                                ...settings,
                                grok: { ...settings.grok, model_thinking: e.currentTarget.value }
                              });
                            }}
                            placeholder="grok-4-1-fast-reasoning-latest"
                            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Show>

                {/* DeepSeek Settings */}
                <Show when={aiSettings().deepseek.enabled}>
                  <div class="border rounded-lg p-4">
                    <h3 class="text-lg font-medium text-foreground mb-3 flex items-center gap-2">
                      <span class="w-2 h-2 bg-green-500 rounded-full"></span>
                      DeepSeek AI
                    </h3>
                    <div class="space-y-3">
                      <div class="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={aiSettings().deepseek.enabled}
                          onChange={(e) => {
                            const settings = aiSettings();
                            setAISettings({
                              ...settings,
                              deepseek: { ...settings.deepseek, enabled: e.currentTarget.checked }
                            });
                          }}
                          class="rounded border-input"
                        />
                        <label class="text-sm font-medium text-foreground">Enable DeepSeek AI</label>
                      </div>
                      
                      <div>
                        <label class="block text-sm font-medium text-muted-foreground mb-1">API Key</label>
                        <div class="relative">
                          <input
                            type="password"
                            value={aiSettings().deepseek.api_key}
                            onInput={(e) => {
                              const settings = aiSettings();
                              setAISettings({
                                ...settings,
                                deepseek: { ...settings.deepseek, api_key: e.currentTarget.value }
                              });
                            }}
                            placeholder="Enter DeepSeek API key"
                            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                          />
                          <button
                            type="button"
                            class="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                          >
                            <IconKey class="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <label class="block text-sm font-medium text-muted-foreground mb-1">Base URL</label>
                        <input
                          type="text"
                          value={aiSettings().deepseek.base_url}
                          onInput={(e) => {
                            const settings = aiSettings();
                            setAISettings({
                              ...settings,
                              deepseek: { ...settings.deepseek, base_url: e.currentTarget.value }
                            });
                          }}
                          placeholder="https://api.deepseek.com"
                          class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                        />
                      </div>
                      
                      <div class="grid grid-cols-2 gap-3">
                        <div>
                          <label class="block text-sm font-medium text-muted-foreground mb-1">Model</label>
                          <input
                            type="text"
                            value={aiSettings().deepseek.model}
                            onInput={(e) => {
                              const settings = aiSettings();
                              setAISettings({
                                ...settings,
                                deepseek: { ...settings.deepseek, model: e.currentTarget.value }
                              });
                            }}
                            placeholder="deepseek-chat"
                            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                          />
                        </div>
                        
                        <div>
                          <label class="block text-sm font-medium text-muted-foreground mb-1">Thinking Model</label>
                          <input
                            type="text"
                            value={aiSettings().deepseek.model_thinking}
                            onInput={(e) => {
                              const settings = aiSettings();
                              setAISettings({
                                ...settings,
                                deepseek: { ...settings.deepseek, model_thinking: e.currentTarget.value }
                              });
                            }}
                            placeholder="deepseek-reasoner"
                            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Show>

                {/* Ollama Settings */}
                <Show when={aiSettings().ollama.enabled}>
                  <div class="border rounded-lg p-4">
                    <h3 class="text-lg font-medium text-foreground mb-3 flex items-center gap-2">
                      <span class="w-2 h-2 bg-yellow-500 rounded-full"></span>
                      Ollama (Local AI)
                    </h3>
                    <div class="space-y-3">
                      <div class="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={aiSettings().ollama.enabled}
                          onChange={(e) => {
                            const settings = aiSettings();
                            setAISettings({
                              ...settings,
                              ollama: { ...settings.ollama, enabled: e.currentTarget.checked }
                            });
                          }}
                          class="rounded border-input"
                        />
                        <label class="text-sm font-medium text-foreground">Enable Ollama</label>
                      </div>
                      
                      <div>
                        <label class="block text-sm font-medium text-muted-foreground mb-1">Base URL</label>
                        <input
                          type="text"
                          value={aiSettings().ollama.base_url}
                          onInput={(e) => {
                            const settings = aiSettings();
                            setAISettings({
                              ...settings,
                              ollama: { ...settings.ollama, base_url: e.currentTarget.value }
                            });
                          }}
                          placeholder="http://localhost:11434"
                          class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                        />
                      </div>
                      
                      <div class="grid grid-cols-2 gap-3">
                        <div>
                          <label class="block text-sm font-medium text-muted-foreground mb-1">Model</label>
                          <input
                            type="text"
                            value={aiSettings().ollama.model}
                            onInput={(e) => {
                              const settings = aiSettings();
                              setAISettings({
                                ...settings,
                                ollama: { ...settings.ollama, model: e.currentTarget.value }
                              });
                            }}
                            placeholder="llama3.1"
                            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                          />
                        </div>
                        
                        <div>
                          <label class="block text-sm font-medium text-muted-foreground mb-1">Thinking Model</label>
                          <input
                            type="text"
                            value={aiSettings().ollama.model_thinking}
                            onInput={(e) => {
                              const settings = aiSettings();
                              setAISettings({
                                ...settings,
                                ollama: { ...settings.ollama, model_thinking: e.currentTarget.value }
                              });
                            }}
                            placeholder="llama3.1"
                            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Show>

                {/* OpenRouter Settings */}
                <Show when={aiSettings().openrouter.enabled}>
                  <div class="border rounded-lg p-4">
                    <h3 class="text-lg font-medium text-foreground mb-3 flex items-center gap-2">
                      <span class="w-2 h-2 bg-sky-500 rounded-full"></span>
                      OpenRouter
                    </h3>
                    <div class="space-y-3">
                      <div class="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={aiSettings().openrouter.enabled}
                          onChange={(e) => {
                            const settings = aiSettings();
                            setAISettings({
                              ...settings,
                              openrouter: { ...settings.openrouter, enabled: e.currentTarget.checked }
                            });
                          }}
                          class="rounded border-input"
                        />
                        <label class="text-sm font-medium text-foreground">Enable OpenRouter</label>
                      </div>
                      
                      <div>
                        <label class="block text-sm font-medium text-muted-foreground mb-1">API Key</label>
                        <div class="relative">
                          <input
                            type="password"
                            value={aiSettings().openrouter.api_key}
                            onInput={(e) => {
                              const settings = aiSettings();
                              setAISettings({
                                ...settings,
                                openrouter: { ...settings.openrouter, api_key: e.currentTarget.value }
                              });
                            }}
                            placeholder="Enter OpenRouter API key"
                            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                          />
                          <button
                            type="button"
                            class="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                          >
                            <IconKey class="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <label class="block text-sm font-medium text-muted-foreground mb-1">Base URL</label>
                        <input
                          type="text"
                          value={aiSettings().openrouter.base_url}
                          onInput={(e) => {
                            const settings = aiSettings();
                            setAISettings({
                              ...settings,
                              openrouter: { ...settings.openrouter, base_url: e.currentTarget.value }
                            });
                          }}
                          placeholder="https://openrouter.ai/api"
                          class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                        />
                      </div>
                      
                      <div class="grid grid-cols-2 gap-3">
                        <div>
                          <label class="block text-sm font-medium text-muted-foreground mb-1">Model</label>
                          <input
                            type="text"
                            value={aiSettings().openrouter.model}
                            onInput={(e) => {
                              const settings = aiSettings();
                              setAISettings({
                                ...settings,
                                openrouter: { ...settings.openrouter, model: e.currentTarget.value }
                              });
                            }}
                            placeholder="openrouter/auto"
                            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                          />
                        </div>
                        
                        <div>
                          <label class="block text-sm font-medium text-muted-foreground mb-1">Thinking Model</label>
                          <input
                            type="text"
                            value={aiSettings().openrouter.model_thinking}
                            onInput={(e) => {
                              const settings = aiSettings();
                              setAISettings({
                                ...settings,
                                openrouter: { ...settings.openrouter, model_thinking: e.currentTarget.value }
                              });
                            }}
                            placeholder="openrouter/auto"
                            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Show>
              </div>

              <div class="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleUpdateAISettings}
                  disabled={aiLoading()}
                  class="inline-flex justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-auto items-center gap-2 py-2 px-4"
                >
                  {aiLoading() ? 'Saving...' : 'Save AI Model Settings'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Test AI configuration
                    const enabledProviders = Object.entries(aiSettings()).filter(([_, config]) => config.enabled);
                    if (enabledProviders.length > 0) {
                      alert(`AI configuration test successful! (${enabledProviders.length} providers enabled)`);
                    } else {
                      alert('No AI providers enabled. Please enable at least one provider.');
                    }
                  }}
                  class="inline-flex justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground shadow hover:bg-secondary/90 h-auto items-center gap-2 py-2 px-4"
                >
                  Test AI Configuration
                </button>
              </div>
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
                          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/auth/email/settings`, {
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
                          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/auth/email/test`, {
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

        {/* Search API Tab */}
        <Show when={activeTab() === 'search'}>
          <div class="space-y-6">
            <div class="border rounded-lg p-6">
              <h2 class="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <IconBrain class="size-5" />
                Browser Search API Configuration
              </h2>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-muted-foreground mb-2">
                    Search API Provider
                  </label>
                  <select
                    value={searchSettings().search_api_provider}
                    onChange={(e) => setSearchSettings(prev => ({ ...prev, search_api_provider: e.target.value }))}
                    class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                  >
                    <option value="brave">Brave Search API</option>
                    <option value="serper">Serper (Google) API</option>
                  </select>
                </div>

                <Show when={searchSettings().search_api_provider === 'brave'}>
                  <div class="space-y-3">
                    <div>
                      <label class="block text-sm font-medium text-muted-foreground mb-2">Brave API Key *</label>
                      <input
                        type="password"
                        value={searchSettings().brave_api_key}
                        onInput={(e) => setSearchSettings(prev => ({ ...prev, brave_api_key: e.currentTarget.value }))}
                        placeholder="Enter Brave API key"
                        required
                        class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                      />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-muted-foreground mb-2">Brave Search Base URL</label>
                      <input
                        type="url"
                        value={searchSettings().brave_search_base_url}
                        onInput={(e) => setSearchSettings(prev => ({ ...prev, brave_search_base_url: e.currentTarget.value }))}
                        placeholder="https://api.search.brave.com/res/v1/web/search"
                        class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                      />
                    </div>
                  </div>
                </Show>

                <Show when={searchSettings().search_api_provider === 'serper'}>
                  <div class="space-y-3">
                    <div>
                      <label class="block text-sm font-medium text-muted-foreground mb-2">Serper API Key *</label>
                      <input
                        type="password"
                        value={searchSettings().serper_api_key}
                        onInput={(e) => setSearchSettings(prev => ({ ...prev, serper_api_key: e.currentTarget.value }))}
                        placeholder="Enter Serper API key"
                        required
                        class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                      />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-muted-foreground mb-2">Serper Base URL</label>
                      <input
                        type="url"
                        value={searchSettings().serper_base_url}
                        onInput={(e) => setSearchSettings(prev => ({ ...prev, serper_base_url: e.currentTarget.value }))}
                        placeholder="https://google.serper.dev/search"
                        class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                      />
                    </div>
                  </div>
                </Show>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-sm font-medium text-muted-foreground mb-2">Results Limit</label>
                    <input
                      type="number"
                      value={searchSettings().search_results_limit}
                      onInput={(e) => setSearchSettings(prev => ({ ...prev, search_results_limit: parseInt(e.currentTarget.value) || 10 }))}
                      min="1"
                      max="50"
                      class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-muted-foreground mb-2">Cache TTL (seconds)</label>
                    <input
                      type="number"
                      value={searchSettings().search_cache_ttl}
                      onInput={(e) => setSearchSettings(prev => ({ ...prev, search_cache_ttl: parseInt(e.currentTarget.value) || 300 }))}
                      min="0"
                      max="3600"
                      class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-muted-foreground mb-2">Rate Limit</label>
                    <input
                      type="number"
                      value={searchSettings().search_rate_limit}
                      onInput={(e) => setSearchSettings(prev => ({ ...prev, search_rate_limit: parseInt(e.currentTarget.value) || 100 }))}
                      min="1"
                      max="1000"
                      class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleUpdateSearchSettings}
                  disabled={isLoading()}
                  class="inline-flex justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-auto items-center gap-2 py-2 px-4"
                >
                  {isLoading() ? 'Saving...' : 'Save Search Settings'}
                </button>
              </div>
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
      </div>
    </div>
  );
};
