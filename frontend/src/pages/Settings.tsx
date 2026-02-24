import { createSignal, onMount, Show } from 'solid-js';
import { useAuth } from '@/lib/auth';
import { IconUser, IconLock, IconTrash, IconKey, IconBrain, IconMail, IconSend, IconBrandOauth, IconRefresh, IconDownload, IconSettings } from '@tabler/icons-solidjs';
import { TwoFactorAuth } from '@/components/TwoFactorAuth';
import { Button } from '@/components/ui/Button';
import { AIProviderIcon } from '@/components/AIProviderIcon';
import { ColorPicker } from '@/components/ui/ColorPicker';

export const Settings = () => {
  const { authState, updateProfile, changePassword } = useAuth();
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
  const [passwordData, setPasswordData] = createSignal({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [aiSettingsExpanded, setAISettingsExpanded] = createSignal(true);
  const [showMistralKey, setShowMistralKey] = createSignal(false);
  const [showLongcatKey, setShowLongcatKey] = createSignal(false);
  const [showGrokKey, setShowGrokKey] = createSignal(false);
  const [showDeepseekKey, setShowDeepseekKey] = createSignal(false);
  const [showOpenrouterKey, setShowOpenrouterKey] = createSignal(false);
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
  const [emailSettingsExpanded, setEmailSettingsExpanded] = createSignal(true);
  const [aiLoading, setAiLoading] = createSignal(false);
  const [updateSettings, setUpdateSettings] = createSignal({
    autoUpdate: true,
    checkFrequency: 'daily' as 'hourly' | 'daily' | 'weekly',
    notifyUpdates: true,
    backupBeforeUpdate: true
  });
  const [updateStatus, setUpdateStatus] = createSignal({
    currentVersion: '1.0.0',
    availableVersion: null as string | null,
    updateAvailable: false,
    lastCheck: new Date().toISOString()
  });

  onMount(() => {
    if (authState.user) {
      setProfileData({
        fullName: authState.user.full_name,
        theme: authState.user.theme || 'dark',
        showBrowserSearch: localStorage.getItem('showBrowserSearch') !== 'false'
      });
    }
    loadAISettings();
    loadAvailableAIProviders();
    loadUpdateStatus();
  });

  const loadUpdateStatus = async () => {
    try {
      const response = await fetch('/api/updates/check');
      if (response.ok) {
        const data = await response.json();
        setUpdateStatus({
          currentVersion: data.currentVersion || '1.0.0',
          availableVersion: data.latestVersion || null,
          updateAvailable: data.updateAvailable || false,
          lastCheck: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Failed to load update status:', error);
    }
  };

  const checkForUpdates = async () => {
    try {
      const response = await fetch('/api/updates/check');
      if (response.ok) {
        const data = await response.json();
        setUpdateStatus({
          currentVersion: data.currentVersion || '1.0.0',
          availableVersion: data.latestVersion || null,
          updateAvailable: data.updateAvailable || false,
          lastCheck: new Date().toISOString()
        });
        setMessage(data.updateAvailable ? 'New update available!' : 'You are on the latest version');
      }
    } catch (error) {
      setMessage('Failed to check for updates');
    }
  };

  const saveUpdateSettings = async () => {
    try {
      // Save update settings to localStorage for now
      localStorage.setItem('updateSettings', JSON.stringify(updateSettings()));
      setMessage('Update settings saved successfully!');
    } catch (error) {
      setMessage('Failed to save update settings');
    }
  };

  const loadAISettings = async () => {
    try {
      // In demo mode, use the public endpoint without authentication
      const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
      const endpoint = isDemoMode 
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/test-ai-settings`
        : `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/auth/ai/settings`;
      
      const response = await fetch(endpoint, {
        headers: {
          // Only add Authorization header if not in demo mode
          ...(isDemoMode ? {} : {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          })
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
      // In demo mode, use the public endpoint without authentication
      const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
      const endpoint = isDemoMode 
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/test-ai-settings`
        : `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/ai/providers`;
      
      const response = await fetch(endpoint);
      if (response.ok) {
        if (isDemoMode) {
          // In demo mode, show all available providers regardless of enabled status
          const settings = await response.json();
          const providers = Object.keys(settings).filter(key => 
            settings[key] && typeof settings[key] === 'object'
          );
          setAvailableAIProviders(providers);
        } else {
          // Parse providers response
          const data = await response.json();
          const providers = (data.providers || []) as { id: string }[];
          setAvailableAIProviders(providers.map((p) => p.id));
        }
      }
    } catch (error) {
      console.error('Failed to load available AI providers:', error);
      // Fallback: show all known providers in demo mode
      if (import.meta.env.VITE_DEMO_MODE === 'true') {
        setAvailableAIProviders(['mistral', 'grok', 'deepseek', 'ollama', 'longcat', 'openrouter']);
      }
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

  const handleTestConnection = async (provider: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/auth/ai/test-connection?provider=${provider}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (result.success) {
        setMessage(`${provider} connection test successful!`);
      } else {
        setMessage(`${provider} connection test failed: ${result.message}`);
      }
    } catch (error) {
      setMessage(`Failed to test ${provider} connection`);
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
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData().newPassword !== passwordData().confirmPassword) {
      setMessage('New passwords do not match');
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
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div class="p-6 mt-4 pb-32 max-w-5xl mx-auto">
      <h1 class="text-3xl font-bold text-foreground mb-6">Settings</h1>

      {message() && (
        <div class={`p-4 rounded-lg text-sm mb-6 ${
          message().includes('success') 
            ? 'bg-primary/15 border border-primary/20 text-primary' 
            : 'bg-destructive/15 border border-destructive/20 text-destructive'
        }`}>
          {message()}
        </div>
      )}

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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
              <ColorPicker
                value={customColors().primary}
                onChange={(color) => setCustomColors(prev => ({ ...prev, primary: color }))}
                savedColors={['#5ab9ff', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b', '#6ab04c']}
              />
            </div>

            <div>
              <label class="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                <input
                  type="checkbox"
                  checked={profileData().showBrowserSearch}
                  onChange={(e) => setProfileData(prev => ({ ...prev, showBrowserSearch: e.currentTarget.checked }))}
                  class="rounded border-input"
                />
                Show Browser Search on Dashboard
              </label>
              <p class="text-xs text-muted-foreground mt-1">Toggle browser search visibility on the dashboard</p>
            </div>

            <button
              type="button"
              onClick={handleUpdateProfile}
              disabled={isLoading()}
              class="inline-flex justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-auto items-center gap-2 py-2 px-4 w-full"
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

      {/* Two-Factor Authentication Section */}
      <div class="border rounded-lg p-6 mb-6">
        <h2 class="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <IconKey class="size-5" />
          Two-Factor Authentication
        </h2>
        <TwoFactorAuth />
      </div>

      {/* AI Settings Section */}
      <div class="border rounded-lg p-6 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-foreground flex items-center gap-2">
            <IconBrain class="size-5" />
            AI Settings
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAISettingsExpanded(!aiSettingsExpanded())}
            class="h-8 w-8 p-0"
          >
            {aiSettingsExpanded() ? '−' : '+'}
          </Button>
        </div>
        
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
        
        <div class={`space-y-6 transition-all duration-300 ${aiSettingsExpanded() ? 'max-h-none opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
          {/* Quick Setup Section */}
          <div class="border rounded-lg p-4 bg-primary/5">
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
                }}
                class="flex items-center gap-2"
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

          {/* Detailed Settings */}
          <div class="space-y-4">
            <h4 class="text-md font-medium text-foreground">Detailed Configuration</h4>
          </div>

          {/* Mistral Settings */}
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
                <label class="block text-sm font-medium text-muted-foreground mb-1">API Key</label>
                <div class="relative">
                  <input
                    type={showMistralKey() ? "text" : "password"}
                    value={aiSettings().mistral.api_key}
                    onInput={(e) => {
                      const settings = aiSettings();
                      setAISettings({
                        ...settings,
                        mistral: { ...settings.mistral, api_key: e.currentTarget.value }
                      });
                    }}
                    placeholder="Enter Mistral API key"
                    class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMistralKey(!showMistralKey())}
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

              <div class="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestConnection('mistral')}
                  disabled={!aiSettings().mistral.enabled}
                  class="text-xs"
                >
                  Test Connection
                </Button>
                <span class="text-xs text-muted-foreground">
                  Test your Mistral API connection
                </span>
              </div>
            </div>
          </div>

          {/* LongCat Settings */}
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
                    type={showLongcatKey() ? "text" : "password"}
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
                    onClick={() => setShowLongcatKey(!showLongcatKey())}
                    class="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  >
                    <IconKey class="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                <div>
                  <label class="block text-sm font-medium text-muted-foreground mb-1">Format</label>
                  <select
                    value={aiSettings().longcat.format}
                    onChange={(e) => {
                      const settings = aiSettings();
                      setAISettings({
                        ...settings,
                        longcat: { ...settings.longcat, format: e.currentTarget.value as 'openai' | 'anthropic' }
                      });
                    }}
                    class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                  >
                    <option value="openai">OpenAI Compatible</option>
                    <option value="anthropic">Anthropic Compatible</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium text-muted-foreground mb-1">OpenAI Endpoint</label>
                  <input
                    type="text"
                    value={aiSettings().longcat.openai_endpoint}
                    onInput={(e) => {
                      const settings = aiSettings();
                      setAISettings({
                        ...settings,
                        longcat: { ...settings.longcat, openai_endpoint: e.currentTarget.value }
                      });
                    }}
                    placeholder="https://api.longcat.chat/openai"
                    class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-muted-foreground mb-1">Anthropic Endpoint</label>
                  <input
                    type="text"
                    value={aiSettings().longcat.anthropic_endpoint}
                    onInput={(e) => {
                      const settings = aiSettings();
                      setAISettings({
                        ...settings,
                        longcat: { ...settings.longcat, anthropic_endpoint: e.currentTarget.value }
                      });
                    }}
                    placeholder="https://api.longcat.chat/anthropic"
                    class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                <div>
                  <label class="block text-sm font-medium text-muted-foreground mb-1">Upgraded Thinking Model</label>
                  <select
                    value={aiSettings().longcat.model_thinking_upgraded}
                    onChange={(e) => {
                      const settings = aiSettings();
                      setAISettings({
                        ...settings,
                        longcat: { ...settings.longcat, model_thinking_upgraded: e.currentTarget.value }
                      });
                    }}
                    class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                  >
                    <option value="">Disabled</option>
                    <option value="LongCat-Flash-Thinking-2601">LongCat Flash Thinking 2601</option>
                  </select>
                </div>
              </div>

              <div class="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestConnection('longcat')}
                  disabled={!aiSettings().longcat.enabled}
                  class="text-xs"
                >
                  Test Connection
                </Button>
                <span class="text-xs text-muted-foreground">
                  Test your LongCat API connection
                </span>
              </div>
            </div>
          </div>

          {/* Grok Settings */}
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
                    type={showGrokKey() ? "text" : "password"}
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
                    onClick={() => setShowGrokKey(!showGrokKey())}
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
              
              <div class="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestConnection('grok')}
                  disabled={!aiSettings().grok.enabled}
                  class="text-xs"
                >
                  Test Connection
                </Button>
                <span class="text-xs text-muted-foreground">
                  Test your Grok API connection
                </span>
              </div>
            </div>
          </div>

          {/* DeepSeek Settings */}
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
                    type={showDeepseekKey() ? "text" : "password"}
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
                    onClick={() => setShowDeepseekKey(!showDeepseekKey())}
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
              
              <div class="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestConnection('deepseek')}
                  disabled={!aiSettings().deepseek.enabled}
                  class="text-xs"
                >
                  Test Connection
                </Button>
                <span class="text-xs text-muted-foreground">
                  Test your DeepSeek API connection
                </span>
              </div>
            </div>
          </div>

          {/* Ollama Settings */}
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
              
              <div class="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestConnection('ollama')}
                  disabled={!aiSettings().ollama.enabled}
                  class="text-xs"
                >
                  Test Connection
                </Button>
                <span class="text-xs text-muted-foreground">
                  Test your Ollama connection
                </span>
              </div>
            </div>
          </div>

          {/* OpenRouter Settings */}
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
                    type={showOpenrouterKey() ? "text" : "password"}
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
                    onClick={() => setShowOpenrouterKey(!showOpenrouterKey())}
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
              
              <div class="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestConnection('openrouter')}
                  disabled={!aiSettings().openrouter.enabled}
                  class="text-xs"
                >
                  Test Connection
                </Button>
                <span class="text-xs text-muted-foreground">
                  Test your OpenRouter API connection
                </span>
              </div>
            </div>
          </div>

          {/* Advanced AI Settings */}
          <div class="border rounded-lg p-4">
            <h3 class="text-lg font-medium text-foreground mb-3 flex items-center gap-2">
              <span class="w-2 h-2 bg-gray-500 rounded-full"></span>
              Advanced Settings
            </h3>
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enable-fallback"
                  checked={localStorage.getItem('aiFallbackEnabled') === 'true'}
                  onChange={(e) => {
                    localStorage.setItem('aiFallbackEnabled', e.currentTarget.checked.toString());
                  }}
                  class="rounded border-input"
                />
                <label for="enable-fallback" class="text-sm font-medium text-foreground">
                  Enable fallback to next available model if primary fails
                </label>
              </div>
              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="auto-switch-model"
                  checked={localStorage.getItem('autoSwitchModel') === 'true'}
                  onChange={(e) => {
                    localStorage.setItem('autoSwitchModel', e.currentTarget.checked.toString());
                  }}
                  class="rounded border-input"
                />
                <label for="auto-switch-model" class="text-sm font-medium text-foreground">
                  Auto-switch to alternative model on errors
                </label>
              </div>
              <div>
                <label class="block text-sm font-medium text-muted-foreground mb-1">Default Temperature</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={parseFloat(localStorage.getItem('aiTemperature') || '0.7')}
                  onChange={(e) => {
                    localStorage.setItem('aiTemperature', e.currentTarget.value);
                  }}
                  class="w-full"
                />
                <div class="text-xs text-muted-foreground mt-1">
                  Temperature: {parseFloat(localStorage.getItem('aiTemperature') || '0.7')} (0 = more focused, 2 = more creative)
                </div>
              </div>
            </div>
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

      {/* Email & OAuth Settings */}
      <div class="border rounded-lg p-6 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-foreground flex items-center gap-2">
            <IconMail class="size-5" />
            Email & OAuth Settings
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

            {/* OAuth Configuration */}
            <div class="border rounded-lg p-4">
              <h3 class="text-lg font-medium text-foreground mb-3 flex items-center gap-2">
                <IconBrandOauth class="size-4" />
                OAuth Configuration
              </h3>
              <div class="space-y-4">
                <div class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={emailSettings().oauth_enabled}
                    onChange={(e) => {
                      setEmailSettings(prev => ({ ...prev, oauth_enabled: e.currentTarget.checked }));
                    }}
                    class="rounded border-input"
                  />
                  <label class="text-sm font-medium text-foreground">Enable OAuth</label>
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-muted-foreground mb-1">Provider</label>
                  <select
                    value={emailSettings().oauth_provider}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, oauth_provider: e.currentTarget.value as 'google' | 'microsoft' | 'github' }))}
                    class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                  >
                    <option value="google">Google</option>
                    <option value="microsoft">Microsoft</option>
                    <option value="github">GitHub</option>
                  </select>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-muted-foreground mb-1">Client ID</label>
                    <input
                      type="text"
                      value={emailSettings().oauth_client_id}
                      onInput={(e) => setEmailSettings(prev => ({ ...prev, oauth_client_id: e.currentTarget.value }))}
                      placeholder="OAuth client ID"
                      class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                    />
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-muted-foreground mb-1">Client Secret</label>
                    <input
                      type="password"
                      value={emailSettings().oauth_client_secret}
                      onInput={(e) => setEmailSettings(prev => ({ ...prev, oauth_client_secret: e.currentTarget.value }))}
                      placeholder="OAuth client secret"
                      class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                    />
                  </div>
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-muted-foreground mb-1">Redirect URI</label>
                  <input
                    type="text"
                    value={emailSettings().oauth_redirect_uri}
                    onInput={(e) => setEmailSettings(prev => ({ ...prev, oauth_redirect_uri: e.currentTarget.value }))}
                    placeholder="http://localhost:8080/auth/callback"
                    class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                  />
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

      {/* Update Settings Section */}
      <div class="border rounded-lg p-6 mb-6">
        <h2 class="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <IconSettings class="size-5" />
          Update Settings
        </h2>
        
        <div class="space-y-4">
          {/* Current Version Info */}
          <div class="p-4 bg-muted/30 rounded-lg">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-foreground">Current Version</p>
                <p class="text-lg font-bold text-primary">{updateStatus().currentVersion}</p>
              </div>
              <div class="text-right">
                <p class="text-sm font-medium text-foreground">Status</p>
                <p class={`text-sm font-bold ${
                  updateStatus().updateAvailable 
                    ? 'text-orange-600 dark:text-orange-400' 
                    : 'text-green-600 dark:text-green-400'
                }`}>
                  {updateStatus().updateAvailable ? 'Update Available' : 'Up to Date'}
                </p>
                {updateStatus().availableVersion && (
                  <p class="text-xs text-muted-foreground">
                    Latest: {updateStatus().availableVersion}
                  </p>
                )}
              </div>
              <div class="flex gap-2">
                <button
                  onClick={checkForUpdates}
                  class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                >
                  <IconRefresh class="size-4" />
                  Check Now
                </button>
                {updateStatus().updateAvailable && (
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/updates/install', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ version: updateStatus().availableVersion })
                        });
                        if (response.ok) {
                          setMessage('Update started! The application will restart automatically.');
                        } else {
                          setMessage('Failed to start update');
                        }
                      } catch (error) {
                        setMessage('Failed to start update');
                      }
                    }}
                    class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                  >
                    <IconDownload class="size-4" />
                    Install Update
                  </button>
                )}
              </div>
            </div>
            <p class="text-xs text-muted-foreground mt-2">
              Last checked: {new Date(updateStatus().lastCheck).toLocaleString()}
            </p>
          </div>

          {/* Update Settings */}
          <div class="space-y-4">
            <div class="flex items-center gap-2">
              <input
                type="checkbox"
                checked={updateSettings().autoUpdate}
                onChange={(e) => setUpdateSettings(prev => ({ ...prev, autoUpdate: e.currentTarget.checked }))}
                class="rounded border-input"
              />
              <label class="text-sm font-medium text-foreground">Automatic Updates</label>
            </div>
            <p class="text-xs text-muted-foreground ml-6">
              Automatically download and install updates when available
            </p>

            <div class="flex items-center gap-2">
              <input
                type="checkbox"
                checked={updateSettings().notifyUpdates}
                onChange={(e) => setUpdateSettings(prev => ({ ...prev, notifyUpdates: e.currentTarget.checked }))}
                class="rounded border-input"
              />
              <label class="text-sm font-medium text-foreground">Update Notifications</label>
            </div>
            <p class="text-xs text-muted-foreground ml-6">
              Show notifications when updates are available
            </p>

            <div class="flex items-center gap-2">
              <input
                type="checkbox"
                checked={updateSettings().backupBeforeUpdate}
                onChange={(e) => setUpdateSettings(prev => ({ ...prev, backupBeforeUpdate: e.currentTarget.checked }))}
                class="rounded border-input"
              />
              <label class="text-sm font-medium text-foreground">Backup Before Update</label>
            </div>
            <p class="text-xs text-muted-foreground ml-6">
              Create automatic backup before installing updates
            </p>

            <div>
              <label class="block text-sm font-medium text-muted-foreground mb-2">
                Check Frequency
              </label>
              <select
                value={updateSettings().checkFrequency}
                onChange={(e) => setUpdateSettings(prev => ({ 
                  ...prev, 
                  checkFrequency: e.target.value as 'hourly' | 'daily' | 'weekly' 
                }))}
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
              <p class="text-xs text-muted-foreground mt-1">
                How often to check for updates
              </p>
            </div>

            <button
              onClick={saveUpdateSettings}
              class="inline-flex justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-auto items-center gap-2 py-2 px-4"
            >
              Save Update Settings
            </button>
          </div>
        </div>
      </div>

      <div class="border rounded-lg p-6 mb-6">
        <h2 class="text-xl font-semibold text-foreground mb-4">Account Information</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-muted-foreground">Account Created</p>
            <p class="text-foreground">
              {authState.user ? new Date(authState.user.created_at).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Last Updated</p>
            <p class="text-foreground">
              {authState.user ? new Date(authState.user.updated_at).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      <div class="border rounded-lg p-6 border-destructive/50">
        <h2 class="text-xl font-semibold text-destructive mb-4 flex items-center gap-2">
          <IconTrash class="size-5" />
          Danger Zone
        </h2>
        <div class="space-y-4">
          <p class="text-muted-foreground text-sm">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <button
            type="button"
            class="inline-flex justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground shadow hover:bg-destructive/90 h-auto items-center gap-2 py-2 px-4"
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
};
