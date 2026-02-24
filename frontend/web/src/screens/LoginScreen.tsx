import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import managerImg from '../assets/manager.jpg';

function EyeIcon({ color }: { color: string }) {
  return (
    <div style={{ width: 16, height: 16, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: 14, height: 10, border: `1.5px solid ${color}`, borderRadius: 7 }} />
      <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: color, position: 'absolute' }} />
    </div>
  );
}

export default function LoginScreen() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!userName || !password) {
      setError('아이디와 비밀번호를 입력해주세요.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await auth.login(userName, password);
      navigate('/home');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.scrollContent}>
        <div style={styles.centerWrapper}>
          <div style={styles.card}>
            {/* Logo */}
            <div style={styles.logoSection}>
              <img src={managerImg} alt="TTokTTi" style={styles.logoIcon} />
              <span style={styles.logoText}>TTokTTi</span>
            </div>

            {/* Welcome */}
            <h2 style={styles.welcomeTitle}>Welcome!</h2>

            {/* Form */}
            <div style={styles.form}>
              {/* Email */}
              <div style={styles.fieldContainer}>
                {/* <label style={styles.fieldLabel}>Username</label> */}
                <div style={styles.field}>
                  <input
                    style={styles.input}
                    type="text"
                    placeholder="아이디"
                    value={userName}
                    onChange={e => setUserName(e.target.value)}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={styles.fieldContainer}>
                {/* <label style={styles.fieldLabel}>Password</label> */}
                <div style={styles.field}>
                  <input
                    style={{ ...styles.input, paddingRight: 8 }}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={styles.eyeIconContainer}>
                    <EyeIcon color="#8F9098" />
                  </button>
                </div>
                <span style={styles.passwordHint}>
                  {/* It must be a combination of minimum 8 letters, numbers, and symbols. */}
                </span>
              </div>

              {/* Remember Me & Forgot Password */}
              <div style={styles.optionsRow}>
                <button
                  type="button"
                  style={styles.rememberRow}
                  onClick={() => setRememberMe(!rememberMe)}>
                  <div style={{ ...styles.checkbox, ...(rememberMe ? styles.checkboxChecked : {}) }}>
                    {rememberMe && <span style={styles.checkmark}>✓</span>}
                  </div>
                  <span style={styles.rememberText}>Remember me</span>
                </button>
                <button
                  type="button"
                  style={styles.forgotBtn}
                  onClick={() => navigate('/forgot-password')}>
                  <span style={styles.forgotText}>Forgot Password?</span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <span style={styles.errorText}>{error}</span>
            )}

            {/* Login Button */}
            <button
              type="button"
              style={{ ...styles.loginButton, opacity: loading ? 0.6 : 1 }}
              onClick={handleLogin}
              disabled={loading}>
              <span style={styles.loginButtonText}>{loading ? '로그인 중...' : 'Log In'}</span>
            </button>

            {/* Sign Up Link */}
            <button
              type="button"
              style={styles.signUpBtn}
              onClick={() => navigate('/signup')}>
              <span style={styles.signUpText}>
                Not a member? <span style={styles.signUpLink}>Register now</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#C5C6CC',
  },
  scrollContent: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px 0',
  },
  centerWrapper: {
    width: '100%',
    maxWidth: 400,
    padding: '0 24px',
    boxSizing: 'border-box',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: '40px 32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 24,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  logoSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 80,
    height: 80,
    objectFit: 'cover' as const,
    borderRadius: '50%',
  },
  logoText: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 20,
    color: '#1F2024',
    letterSpacing: 0.5,
  },
  welcomeTitle: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 20,
    color: '#1F2024',
    margin: 0,
  },
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  fieldContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  fieldLabel: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 12,
    color: '#2E3036',
  },
  field: {
    height: 48,
    border: '1px solid #C5C6CC',
    borderRadius: 12,
    padding: '0 16px',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    boxSizing: 'border-box',
  },
  input: {
    flex: 1,
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 14,
    color: '#1F2024',
    border: 'none',
    outline: 'none',
    padding: 0,
    height: '100%',
    backgroundColor: 'transparent',
    width: '100%',
  },
  eyeIconContainer: {
    width: 24,
    height: 24,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  passwordHint: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 10,
    color: '#8F9098',
  },
  optionsRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rememberRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    border: '1px solid #C5C6CC',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    boxSizing: 'border-box',
  },
  checkboxChecked: {
    backgroundColor: '#006FFD',
    borderColor: '#006FFD',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 700,
  },
  rememberText: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 12,
    color: '#71727A',
  },
  forgotBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  forgotText: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 12,
    color: '#006FFD',
  },
  loginButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#006FFD',
    borderRadius: 12,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    border: 'none',
    cursor: 'pointer',
  },
  loginButtonText: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 14,
    color: '#FFFFFF',
  },
  signUpBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  signUpText: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 12,
    color: '#71727A',
    textDecoration: 'underline',
  },
  signUpLink: {
    fontWeight: 600,
    color: '#006FFD',
  },
  errorText: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 13,
    color: '#D32F2F',
    textAlign: 'center' as const,
  },
};
