import { createSignal, onMount, For, Show } from 'solid-js';
import { IconSettings, IconUsers, IconDatabase, IconShield, IconCheck } from '@tabler/icons-solidjs';

interface AdminSetting {
  key: string;
  label: string;
  value: any;
  type: 'string' | 'number' | 'boolean';
  description: string;
  category: 'user' | 'system' | 'security';
  icon: string;
}

export const AdminSettings = () => {
  const [settings, setSettings] = createSignal<AdminSetting[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [message, setMessage] = createSignal('');

  onMount(() => {
    setSettings([
      {
        key: 'max_users',
        label: 'Maximum Users',
        value: '100',
        type: 'number',
        description: 'Maximum number of users allowed in the workspace',
        category: 'user',
        icon: 'IconUsers'
      },
      {
        key: 'allow_registration',
        label: 'Allow Registration',
        value: true,
        type: 'boolean',
        description: 'Allow new users to register',
        category: 'user',
        icon: 'IconUsers'
      },
      {
        key: 'maintenance_mode',
        label: 'Maintenance Mode',
        value: false,
        type: 'boolean',
        description: 'Put the application in maintenance mode',
        category: 'system',
        icon: 'IconDatabase'
      },
      {
        key: 'enable_2fa',
        label: 'Enable 2FA',
        value: false,
        type: 'boolean',
        description: 'Require two-factor authentication for all users',
        category: 'security',
        icon: 'IconShield'
      },
      {
        key: 'session_timeout',
        label: 'Session Timeout (hours)',
        value: '24',
        type: 'number',
        description: 'Hours before user sessions expire',
        category: 'security',
        icon: 'IconShield'
      }
    ]);
  });

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => 
      prev.map(setting => 
        setting.key === key ? { ...setting, value } : setting
      )
    );
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to save settings');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div class="p-6 mt-4 pb-32 max-w-6xl mx-auto">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <IconSettings class="size-8 text-primary" />
          Admin Settings
        </h1>
        <p class="text-muted-foreground">
          Manage system-wide settings and configurations
        </p>
      </div>

      <Show when={message()}>
        <div class="p-4 rounded-lg text-sm mb-6 bg-primary/15 text-primary border border-primary/20">
          {message()}
        </div>
      </Show>

      <div class="space-y-8">
        {/* User Settings */}
        <div class="border rounded-lg p-6 bg-card">
          <div class="flex items-center gap-3 mb-6">
            <div class="flex items-center justify-center p-2 rounded-lg bg-primary/10">
              <IconUsers class="size-5 text-primary" />
            </div>
            <div>
              <h2 class="text-xl font-semibold text-foreground">User Settings</h2>
              <p class="text-sm text-muted-foreground">Manage user-related configurations</p>
            </div>
          </div>
          <div class="space-y-4">
            <For each={settings().filter(s => s.category === 'user')}>
              {(setting) => (
                <div class="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div class="flex-1">
                    <label class="text-sm font-medium text-foreground">{setting.label}</label>
                    <p class="text-xs text-muted-foreground mt-1">{setting.description}</p>
                  </div>
                  {setting.type === 'boolean' ? (
                    <button
                      type="button"
                      onClick={() => updateSetting(setting.key, !setting.value)}
                      class={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                        setting.value ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <span
                        class={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          setting.value ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  ) : (
                    <input
                      type={setting.type}
                      value={String(setting.value)}
                      onInput={(e) => updateSetting(setting.key, e.currentTarget.value)}
                      class="flex h-10 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  )}
                </div>
              )}
            </For>
          </div>
        </div>

        {/* System Settings */}
        <div class="border rounded-lg p-6 bg-card">
          <div class="flex items-center gap-3 mb-6">
            <div class="flex items-center justify-center p-2 rounded-lg bg-primary/10">
              <IconDatabase class="size-5 text-primary" />
            </div>
            <div>
              <h2 class="text-xl font-semibold text-foreground">System Settings</h2>
              <p class="text-sm text-muted-foreground">Manage system configurations</p>
            </div>
          </div>
          <div class="space-y-4">
            <For each={settings().filter(s => s.category === 'system')}>
              {(setting) => (
                <div class="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div class="flex-1">
                    <label class="text-sm font-medium text-foreground">{setting.label}</label>
                    <p class="text-xs text-muted-foreground mt-1">{setting.description}</p>
                  </div>
                  {setting.type === 'boolean' ? (
                    <button
                      type="button"
                      onClick={() => updateSetting(setting.key, !setting.value)}
                      class={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                        setting.value ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <span
                        class={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          setting.value ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  ) : (
                    <input
                      type={setting.type}
                      value={String(setting.value)}
                      onInput={(e) => updateSetting(setting.key, e.currentTarget.value)}
                      class="flex h-10 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  )}
                </div>
              )}
            </For>
          </div>
        </div>

        {/* Security Settings */}
        <div class="border rounded-lg p-6 bg-card">
          <div class="flex items-center gap-3 mb-6">
            <div class="flex items-center justify-center p-2 rounded-lg bg-primary/10">
              <IconShield class="size-5 text-primary" />
            </div>
            <div>
              <h2 class="text-xl font-semibold text-foreground">Security Settings</h2>
              <p class="text-sm text-muted-foreground">Manage security configurations</p>
            </div>
          </div>
          <div class="space-y-4">
            <For each={settings().filter(s => s.category === 'security')}>
              {(setting) => (
                <div class="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div class="flex-1">
                    <label class="text-sm font-medium text-foreground">{setting.label}</label>
                    <p class="text-xs text-muted-foreground mt-1">{setting.description}</p>
                  </div>
                  {setting.type === 'boolean' ? (
                    <button
                      type="button"
                      onClick={() => updateSetting(setting.key, !setting.value)}
                      class={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                        setting.value ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <span
                        class={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          setting.value ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  ) : (
                    <input
                      type={setting.type}
                      value={String(setting.value)}
                      onInput={(e) => updateSetting(setting.key, e.currentTarget.value)}
                      class="flex h-10 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  )}
                </div>
              )}
            </For>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div class="flex justify-end mt-8">
        <button
          type="button"
          onClick={saveSettings}
          disabled={isLoading()}
          class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 h-11 px-6 gap-2"
        >
          {isLoading() ? (
            <>
              <div class="w-4 h-4 border-2 border-primary-foreground/30 border-t-transparent rounded-full animate-spin"></div>
              Saving...
            </>
          ) : (
            <>
              <IconCheck class="size-4" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
};
