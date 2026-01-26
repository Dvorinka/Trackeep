import { createSignal } from 'solid-js';
import { useAuth, type LoginRequest, type RegisterRequest } from '@/lib/auth';

export const Login = () => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = createSignal(true);
  const [formData, setFormData] = createSignal<LoginRequest | RegisterRequest>({
    email: '',
    password: '',
    ...(isLogin() ? {} : { username: '', fullName: '' }),
  });
  const [error, setError] = createSignal('');
  const [loading, setLoading] = createSignal(false);

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
      // Navigation will be handled by the auth state change
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
            {isLogin() ? 'Welcome back' : 'Create your account'}
          </p>
        </div>

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
        </div>

        <div class="mt-8 pt-6 border-t border-[#262626]">
          <div class="text-center text-sm text-[#a3a3a3]">
            <p>Demo Account:</p>
            <p>Email: demo@trackeep.com</p>
            <p>Password: demo123</p>
          </div>
        </div>
      </div>
    </div>
  );
};
