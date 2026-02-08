import { createSignal, onMount } from 'solid-js';
import { useAuth, type LoginRequest, type RegisterRequest } from '@/lib/auth';
import { isEnvDemoMode } from '@/lib/demo-mode';
import { useNavigate } from '@solidjs/router';

export const Login = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = createSignal(true);
  const [formData, setFormData] = createSignal<LoginRequest | RegisterRequest>({
    email: '',
    password: '',
    ...(isLogin() ? {} : { username: '', fullName: '' }),
  });
  const [error, setError] = createSignal('');
  const [noAccountsExist, setNoAccountsExist] = createSignal(false);
  const [registrationDisabled, setRegistrationDisabled] = createSignal(false);
  const [loading, setLoading] = createSignal(false);

  // Check if users exist and set appropriate mode
  onMount(async () => {
    // Auto-fill demo credentials if in demo mode
    if (isEnvDemoMode()) {
      setFormData({
        email: 'demo@trackeep.com',
        password: 'demo123',
        ...(isLogin() ? {} : { username: 'demo', fullName: 'Demo User' }),
      });
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'}/auth/check-users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.hasUsers) {
          // Users exist - disable registration
          setRegistrationDisabled(true);
          setNoAccountsExist(false);
          // Force to login mode
          setIsLogin(true);
        } else {
          // No users exist - allow registration for first user (admin)
          setRegistrationDisabled(false);
          setNoAccountsExist(true);
          // Force to registration mode
          setIsLogin(false);
        }
      }
    } catch (err) {
      console.warn('Failed to check if users exist:', err);
    }
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin()) {
        await login(formData() as LoginRequest);
      } else {
        await register(formData() as RegisterRequest);
      }
      // Navigate to app after successful login/registration
      navigate('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleMode = () => {
    // Prevent toggling if registration is disabled (users exist)
    if (registrationDisabled()) {
      setError('Registration is disabled. Please contact your administrator to create an account.');
      return;
    }
    
    setIsLogin(!isLogin());
    setError('');
    setFormData({
      email: '',
      password: '',
      ...(isLogin() ? { username: '', fullName: '' } : {}),
    });
  };

  return (
    <div class="min-h-screen bg-[#18181b] flex items-center justify-center px-4">
      <div class="max-w-md w-full bg-[#141415] border border-[#262626] rounded-lg p-8">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-[#fafafa] mb-2">Trackeep</h1>
          <p class="text-[#a3a3a3]">
            {isEnvDemoMode() ? 'Demo Mode' : (isLogin() ? 'Welcome back' : 'Create your account')}
          </p>
        </div>

        {/* Demo Mode - Show only demo button */}
        {isEnvDemoMode() ? (
          <div class="space-y-6">
            <div class="text-center">
              <div class="mb-6 bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded">
                <div class="flex items-center gap-2 mb-1">
                  <span class="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span class="font-medium">Demo Mode Active</span>
                </div>
                <p class="text-xs">Experience Trackeep with mock data - no login required</p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => {
                // Auto-submit with demo credentials
                handleSubmit(new Event('submit') as any);
              }}
              disabled={loading()}
              class="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 focus:ring-offset-[#141415] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg font-medium"
            >
              {loading() ? 'Entering Demo...' : 'Enter Demo Mode'}
            </button>
          </div>
        ) : (
          <>
            {/* Registration disabled message */}
            {registrationDisabled() && (
              <div class="mb-6 bg-blue-500/10 border border-blue-500/50 text-blue-400 px-4 py-3 rounded">
                <div class="flex items-center gap-2 mb-1">
                  <span class="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span class="font-medium">Registration Disabled</span>
                </div>
                <p class="text-xs">Accounts can only be created by the administrator. Please contact your admin to get an account.</p>
              </div>
            )}

            {/* No accounts exist message */}
            {noAccountsExist() && !isLogin() && (
              <div class="mb-6 bg-yellow-500/10 border border-yellow-500/50 text-yellow-400 px-4 py-3 rounded">
                <div class="flex items-center gap-2 mb-1">
                  <span class="w-2 h-2 bg-yellow-500 rounded-full"></span>
                  <span class="font-medium">Create Admin Account</span>
                </div>
                <p class="text-xs">No accounts exist yet. Create the first administrator account to get started.</p>
              </div>
            )}

            <form onSubmit={handleSubmit} class="space-y-6">
              {error() && (
                <div class="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded">
                  {error()}
                </div>
              )}

              <div>
                <label for="email" class="block text-sm font-medium text-[#fafafa] mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={formData().email}
                  onInput={(e) => handleInputChange('email', e.currentTarget.value)}
                  class="w-full px-3 py-2 bg-[#18181b] border border-[#262626] rounded-md text-[#fafafa] placeholder-[#a3a3a3] focus:outline-none focus:ring-2 focus:ring-[#39b9ff] focus:border-transparent"
                  placeholder="your@email.com"
                />
              </div>

              {!isLogin() && (
                <>
                  <div>
                    <label for="username" class="block text-sm font-medium text-[#fafafa] mb-2">
                      Username
                    </label>
                    <input
                      id="username"
                      type="text"
                      required
                      value={(formData() as RegisterRequest).username}
                      onInput={(e) => handleInputChange('username', e.currentTarget.value)}
                      class="w-full px-3 py-2 bg-[#18181b] border border-[#262626] rounded-md text-[#fafafa] placeholder-[#a3a3a3] focus:outline-none focus:ring-2 focus:ring-[#39b9ff] focus:border-transparent"
                      placeholder="username"
                    />
                  </div>

                  <div>
                    <label for="fullName" class="block text-sm font-medium text-[#fafafa] mb-2">
                      Full Name
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      required
                      value={(formData() as RegisterRequest).fullName}
                      onInput={(e) => handleInputChange('fullName', e.currentTarget.value)}
                      class="w-full px-3 py-2 bg-[#18181b] border border-[#262626] rounded-md text-[#fafafa] placeholder-[#a3a3a3] focus:outline-none focus:ring-2 focus:ring-[#39b9ff] focus:border-transparent"
                      placeholder="Your Name"
                    />
                  </div>
                </>
              )}

              <div>
                <label for="password" class="block text-sm font-medium text-[#fafafa] mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={formData().password}
                  onInput={(e) => handleInputChange('password', e.currentTarget.value)}
                  class="w-full px-3 py-2 bg-[#18181b] border border-[#262626] rounded-md text-[#fafafa] placeholder-[#a3a3a3] focus:outline-none focus:ring-2 focus:ring-[#39b9ff] focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading()}
                class="w-full bg-[#39b9ff] text-white py-2 px-4 rounded-md hover:bg-[#2a8fdb] focus:outline-none focus:ring-2 focus:ring-[#39b9ff] focus:ring-offset-2 focus:ring-offset-[#141415] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading() ? 'Please wait...' : isLogin() ? 'Sign In' : 'Sign Up'}
              </button>
            </form>

            <div class="mt-6 text-center">
              {!registrationDisabled() && (
                <p class="text-[#a3a3a3]">
                  {isLogin() ? "Don't have an account?" : 'Already have an account?'}
                  <button
                    type="button"
                    onClick={toggleMode}
                    class="ml-1 text-[#39b9ff] hover:text-[#2a8fdb] focus:outline-none focus:underline"
                  >
                    {isLogin() ? 'Sign up' : 'Sign in'}
                  </button>
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
