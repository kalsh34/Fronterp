import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types';
import { useT } from '../../i18n';
import { ThemeToggle, LanguageToggle } from '../../components/ThemeToggle';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const t = useT();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      const user = useAuthStore.getState().user;
      if (user?.role === UserRole.GUARD) {
        navigate('/guard');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t('loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas ">
      {/* Top-right controls */}
      <div className="flex items-center justify-end gap-3 p-5">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      <div className="flex-1 flex items-start justify-center px-4 pb-10">
        <div className="bg-surface border border-line shadow-overlay w-full max-w-md rounded-2xl p-8 mt-2">
          <div className="text-center mb-8">
            <svg className="w-12 h-12 text-primary-600 mx-auto mb-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm-1 14.5v-5h2v5h-2zm0-7v-2h2v2h-2z" />
            </svg>
            <h1 className="text-2xl font-bold text-ink">VITAL SECURITY</h1>
            <p className="text-sm text-muted mt-1">Enterprise ERP System</p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 p-3 rounded mb-4 text-sm border border-red-200 dark:border-red-900">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="v-label">{t('email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="v-input"
                placeholder={t('enterEmail')}
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label className="v-label">{t('password')}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="v-input pr-11"
                  placeholder={t('enterPassword')}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted hover:text-ink hover:bg-subtle transition-colors"
                  aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                  title={showPassword ? t('hidePassword') : t('showPassword')}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white py-3 rounded-xl hover:bg-primary-700 disabled:opacity-50 font-medium transition-colors"
            >
              {loading ? t('signingIn') : t('signIn')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
