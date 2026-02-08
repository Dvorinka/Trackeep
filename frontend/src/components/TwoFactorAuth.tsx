import { createSignal, onMount, Show } from 'solid-js';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface TOTPSetupResponse {
  secret: string;
  qr_code: string;
  backup_codes: string[];
}

interface TOTPStatus {
  enabled: boolean;
  setup: boolean;
}

export function TwoFactorAuth() {
  const [totpStatus, setTotpStatus] = createSignal<TOTPStatus | null>(null);
  const [setupData, setSetupData] = createSignal<TOTPSetupResponse | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [success, setSuccess] = createSignal<string | null>(null);

  // Form states
  const [setupPassword, setSetupPassword] = createSignal('');
  const [verifyCode, setVerifyCode] = createSignal('');
  const [enableCode, setEnableCode] = createSignal('');
  const [disableCode, setDisableCode] = createSignal('');
  const [disablePassword, setDisablePassword] = createSignal('');
  const [backupCodeVerify, setBackupCodeVerify] = createSignal('');
  const [regenerateCode, setRegenerateCode] = createSignal('');

  // UI states
  const [showSetup, setShowSetup] = createSignal(false);
  const [backupCodes, setBackupCodes] = createSignal<string[]>([]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchTOTPStatus = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/auth/2fa/status`, {
        headers: getAuthHeaders(),
      });
      
      if (response.ok) {
        const data = await response.json();
        setTotpStatus(data);
      }
    } catch (err) {
      setError('Failed to fetch 2FA status');
    }
  };

  const setupTOTP = async () => {
    if (!setupPassword()) {
      setError('Password is required');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/auth/2fa/setup`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          password: setupPassword(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSetupData(data);
        setBackupCodes(data.backup_codes);
        setShowSetup(true);
        setSuccess('TOTP setup initiated. Please scan the QR code and save your backup codes.');
        setSetupPassword('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to setup TOTP');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyTOTPCode = async () => {
    if (!verifyCode()) {
      setError('Verification code is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/auth/2fa/verify`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          code: verifyCode(),
        }),
      });

      if (response.ok) {
        setSuccess('TOTP code verified successfully!');
        setVerifyCode('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Invalid verification code');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const enableTOTP = async () => {
    if (!enableCode()) {
      setError('Enable code is required');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/auth/2fa/enable`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          code: enableCode(),
        }),
      });

      if (response.ok) {
        setSuccess('Two-Factor Authentication enabled successfully!');
        setEnableCode('');
        setShowSetup(false);
        setSetupData(null);
        await fetchTOTPStatus();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to enable TOTP');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const disableTOTP = async () => {
    if (!disableCode() || !disablePassword()) {
      setError('Both code and password are required');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/auth/2fa/disable`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          code: disableCode(),
          password: disablePassword(),
        }),
      });

      if (response.ok) {
        setSuccess('Two-Factor Authentication disabled successfully!');
        setDisableCode('');
        setDisablePassword('');
        await fetchTOTPStatus();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to disable TOTP');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyBackupCode = async () => {
    if (!backupCodeVerify()) {
      setError('Backup code is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/auth/2fa/backup-codes/verify`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          code: backupCodeVerify(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(`Backup code verified! ${data.remaining_codes} codes remaining.`);
        setBackupCodeVerify('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Invalid backup code');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const regenerateBackupCodes = async () => {
    if (!regenerateCode()) {
      setError('Current TOTP code is required');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/auth/2fa/backup-codes/regenerate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          code: regenerateCode(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setBackupCodes(data.backup_codes);
        setSuccess('Backup codes regenerated successfully!');
        setRegenerateCode('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to regenerate backup codes');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    fetchTOTPStatus();
  });

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold text-white">Two-Factor Authentication</h2>
        <div class="flex items-center space-x-2">
          <div class={`w-3 h-3 rounded-full ${totpStatus()?.enabled ? 'bg-primary' : 'bg-muted'}`}></div>
          <span class="text-gray-300">
            {totpStatus()?.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>

      {/* Error and Success Messages */}
      <Show when={error()}>
        <div class="bg-destructive/15 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
          {error()}
        </div>
      </Show>

      <Show when={success()}>
        <div class="bg-primary/15 border border-primary/20 text-primary px-4 py-3 rounded-lg">
          {success()}
        </div>
      </Show>

      {/* Current Status */}
      <Card class="p-6">
        <h3 class="text-lg font-semibold text-white mb-4">Current Status</h3>
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-gray-300">2FA Status:</span>
            <span class={`font-medium ${totpStatus()?.enabled ? 'text-primary' : 'text-muted-foreground'}`}>
              {totpStatus()?.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-300">Setup Status:</span>
            <span class={`font-medium ${totpStatus()?.setup ? 'text-blue-400' : 'text-gray-400'}`}>
              {totpStatus()?.setup ? 'Configured' : 'Not Configured'}
            </span>
          </div>
        </div>
      </Card>

      {/* Setup TOTP */}
      <Show when={!totpStatus()?.enabled}>
        <Card class="p-6">
          <h3 class="text-lg font-semibold text-white mb-4">Setup Two-Factor Authentication</h3>
          <p class="text-gray-300 mb-4">
            Enable 2FA to add an extra layer of security to your account. You'll need a TOTP app like Google Authenticator or Authy.
          </p>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={setupPassword()}
                onInput={(e) => setSetupPassword(e.currentTarget.value)}
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your password"
              />
            </div>
            
            <Button
              onClick={setupTOTP}
              disabled={loading()}
              class="w-full"
            >
              {loading() ? 'Setting up...' : 'Setup 2FA'}
            </Button>
          </div>
        </Card>
      </Show>

      {/* TOTP Setup Process */}
      <Show when={showSetup() && setupData()}>
        <Card class="p-6">
          <h3 class="text-lg font-semibold text-white mb-4">Complete 2FA Setup</h3>
          
          <div class="space-y-6">
            {/* QR Code */}
            <div class="text-center">
              <h4 class="text-md font-medium text-gray-300 mb-3">Scan QR Code</h4>
              <img 
                src={setupData()!.qr_code} 
                alt="TOTP QR Code"
                class="mx-auto border-2 border-gray-600 rounded-lg"
              />
              <p class="text-sm text-gray-400 mt-2">
                Or manually enter this secret in your TOTP app:
              </p>
              <code class="block bg-gray-800 px-3 py-2 rounded text-blue-400 break-all">
                {setupData()!.secret}
              </code>
            </div>

            {/* Backup Codes */}
            <div>
              <h4 class="text-md font-medium text-gray-300 mb-3">Backup Codes</h4>
              <p class="text-sm text-gray-400 mb-3">
                Save these backup codes in a secure location. You can use them to access your account if you lose your TOTP device.
              </p>
              <div class="grid grid-cols-2 gap-2">
                {backupCodes().map((code) => (
                  <code class="bg-gray-800 px-3 py-2 rounded text-gray-300 text-sm">
                    {code}
                  </code>
                ))}
              </div>
            </div>

            {/* Verification */}
            <div>
              <h4 class="text-md font-medium text-gray-300 mb-3">Verify Setup</h4>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">
                    Enter 6-digit code
                  </label>
                  <input
                    type="text"
                    value={verifyCode()}
                    onInput={(e) => setVerifyCode(e.currentTarget.value.replace(/\D/g, '').slice(0, 6))}
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="000000"
                    maxlength={6}
                  />
                </div>
                
                <div class="flex space-x-3">
                  <Button
                    onClick={verifyTOTPCode}
                    disabled={loading() || verifyCode().length !== 6}
                    class="flex-1"
                  >
                    {loading() ? 'Verifying...' : 'Verify Code'}
                  </Button>
                  
                  <Button
                    onClick={enableTOTP}
                    disabled={loading() || verifyCode().length !== 6}
                    variant="papra"
                    class="flex-1"
                  >
                    {loading() ? 'Enabling...' : 'Enable 2FA'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </Show>

      {/* Disable 2FA */}
      <Show when={totpStatus()?.enabled}>
        <Card class="p-6">
          <h3 class="text-lg font-semibold text-white mb-4">Disable Two-Factor Authentication</h3>
          <p class="text-gray-300 mb-4">
            Disabling 2FA will make your account less secure. You'll need to provide your current TOTP code and password.
          </p>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                TOTP Code
              </label>
              <input
                type="text"
                value={disableCode()}
                onInput={(e) => setDisableCode(e.currentTarget.value.replace(/\D/g, '').slice(0, 6))}
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="000000"
                maxlength={6}
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={disablePassword()}
                onInput={(e) => setDisablePassword(e.currentTarget.value)}
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your password"
              />
            </div>
            
            <Button
              onClick={disableTOTP}
              disabled={loading()}
              variant="destructive"
              class="w-full"
            >
              {loading() ? 'Disabling...' : 'Disable 2FA'}
            </Button>
          </div>
        </Card>
      </Show>

      {/* Backup Code Management */}
      <Show when={totpStatus()?.enabled}>
        <Card class="p-6">
          <h3 class="text-lg font-semibold text-white mb-4">Backup Code Management</h3>
          
          <div class="space-y-6">
            {/* Verify Backup Code */}
            <div>
              <h4 class="text-md font-medium text-gray-300 mb-3">Verify Backup Code</h4>
              <div class="space-y-4">
                <input
                  type="text"
                  value={backupCodeVerify()}
                  onInput={(e) => setBackupCodeVerify(e.currentTarget.value)}
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter backup code"
                />
                
                <Button
                  onClick={verifyBackupCode}
                  disabled={loading()}
                  class="w-full"
                >
                  {loading() ? 'Verifying...' : 'Verify Backup Code'}
                </Button>
              </div>
            </div>

            {/* Regenerate Backup Codes */}
            <div>
              <h4 class="text-md font-medium text-gray-300 mb-3">Regenerate Backup Codes</h4>
              <p class="text-sm text-gray-400 mb-3">
                This will invalidate all existing backup codes and generate new ones.
              </p>
              
              <div class="space-y-4">
                <input
                  type="text"
                  value={regenerateCode()}
                  onInput={(e) => setRegenerateCode(e.currentTarget.value.replace(/\D/g, '').slice(0, 6))}
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Current TOTP code"
                  maxlength={6}
                />
                
                <Button
                  onClick={regenerateBackupCodes}
                  disabled={loading()}
                  variant="secondary"
                  class="w-full"
                >
                  {loading() ? 'Regenerating...' : 'Regenerate Backup Codes'}
                </Button>
              </div>
            </div>

            {/* Show New Backup Codes */}
            <Show when={backupCodes().length > 0}>
              <div>
                <h4 class="text-md font-medium text-gray-300 mb-3">New Backup Codes</h4>
                <p class="text-sm text-gray-400 mb-3">
                  Save these new backup codes in a secure location:
                </p>
                <div class="grid grid-cols-2 gap-2">
                  {backupCodes().map((code) => (
                    <code class="bg-gray-800 px-3 py-2 rounded text-gray-300 text-sm">
                      {code}
                    </code>
                  ))}
                </div>
              </div>
            </Show>
          </div>
        </Card>
      </Show>
    </div>
  );
}
