import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function EyeIcon({ color }: { color: string }) {
  return (
    <div style={{ width: 16, height: 16, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: 14, height: 10, border: `1.5px solid ${color}`, borderRadius: 7 }} />
      <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: color, position: 'absolute' }} />
    </div>
  );
}

export default function SignUpFreeScreen() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  return (
    <div style={styles.container}>
      <div style={styles.scrollContent}>
        <div style={styles.centerWrapper}>
          <div style={styles.card}>
            {/* Header */}
            <div style={styles.headerSection}>
              <h2 style={styles.title}>Sign Up Free</h2>
              <p style={styles.subtitle}>14 day free access to unlimited resources</p>
            </div>

            {/* Form */}
            <div style={styles.form}>
              {/* First Name / Last Name Row */}
              <div style={styles.nameRow}>
                <div style={{ ...styles.fieldContainer, flex: 1 }}>
                  <label style={styles.fieldLabel}>First Name</label>
                  <div style={styles.field}>
                    <input
                      style={styles.input}
                      type="text"
                      placeholder="Placeholder"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ ...styles.fieldContainer, flex: 1 }}>
                  <label style={styles.fieldLabel}>Last Name</label>
                  <div style={styles.field}>
                    <input
                      style={styles.input}
                      type="text"
                      placeholder="Placeholder"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div style={styles.fieldContainer}>
                <label style={styles.fieldLabel}>Email</label>
                <div style={styles.field}>
                  <input
                    style={styles.input}
                    type="email"
                    placeholder="Placeholder"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={styles.fieldContainer}>
                <label style={styles.fieldLabel}>Password</label>
                <div style={styles.field}>
                  <input
                    style={{ ...styles.input, paddingRight: 8 }}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Placeholder"
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
              </div>
            </div>

            {/* Terms Checkbox */}
            <button
              type="button"
              style={styles.termsRow}
              onClick={() => setAgreeTerms(!agreeTerms)}>
              <div style={{ ...styles.checkbox, ...(agreeTerms ? styles.checkboxChecked : {}) }}>
                {agreeTerms && <span style={styles.checkmark}>✓</span>}
              </div>
              <span style={styles.termsText}>
                Vestibulum faucibus odio vitae erat auctor lectus.
              </span>
            </button>

            {/* Sign Up Button */}
            <button type="button" style={styles.signUpButton}>
              <span style={styles.signUpButtonText}>Button Text</span>
            </button>

            {/* Divider */}
            <div style={styles.dividerSection}>
              <div style={styles.dividerLine} />
              <span style={styles.dividerText}>Or sign up with</span>
              <div style={styles.dividerLine} />
            </div>

            {/* Social Buttons */}
            <div style={styles.socialButtons}>
              <button type="button" style={styles.socialButton}>
                <span style={styles.socialButtonIcon}>G</span>
                <span style={styles.socialButtonText}>Google</span>
              </button>
              <button type="button" style={styles.socialButton}>
                <span style={styles.socialButtonIcon}>{'\uF8FF'}</span>
                <span style={styles.socialButtonText}>Apple</span>
              </button>
              <button type="button" style={styles.socialButton}>
                <span style={styles.socialButtonIcon}>T</span>
                <span style={styles.socialButtonText}>Twitter</span>
              </button>
            </div>

            {/* Already have account */}
            <button
              type="button"
              style={styles.loginLinkBtn}
              onClick={() => navigate('/login')}>
              <span style={styles.loginLink}>Already have an account?</span>
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
    backgroundColor: '#D5DAE1',
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
    maxWidth: 420,
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
    gap: 20,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  headerSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 22,
    color: '#1F2024',
    margin: 0,
  },
  subtitle: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 13,
    color: '#71727A',
    margin: 0,
  },
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  nameRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: 12,
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
  termsRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    textAlign: 'left',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    border: '1px solid #C5C6CC',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    boxSizing: 'border-box',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: '#FFB800',
    borderColor: '#FFB800',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 700,
  },
  termsText: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 12,
    color: '#71727A',
  },
  signUpButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#FFB800',
    borderRadius: 12,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    border: 'none',
    cursor: 'pointer',
  },
  signUpButtonText: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 14,
    color: '#FFFFFF',
  },
  dividerSection: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 12,
    color: '#71727A',
  },
  socialButtons: {
    display: 'flex',
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  socialButton: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    border: '1px solid #D5DAE1',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
  },
  socialButtonIcon: {
    fontSize: 14,
    fontWeight: 700,
    color: '#1F2024',
  },
  socialButtonText: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 12,
    color: '#1F2024',
  },
  loginLinkBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  loginLink: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 12,
    color: '#FFB800',
  },
};
