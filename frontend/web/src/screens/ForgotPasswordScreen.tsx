import React, { useState } from 'react';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');

  return (
    <div style={styles.container}>
      <div style={styles.scrollContent}>
        <div style={styles.centerWrapper}>
          <div style={styles.card}>
            {/* Title */}
            <div style={styles.headerSection}>
              <h2 style={styles.title}>Forgotten your password?</h2>
              <p style={styles.subtitle}>
                There is nothing to worry about, we'll send you a message to help
                you reset your password.
              </p>
            </div>

            {/* Email Field */}
            <div style={styles.fieldContainer}>
              <label style={styles.fieldLabel}>Email Address</label>
              <div style={styles.field}>
                <input
                  style={styles.input}
                  type="email"
                  placeholder="Enter personal or work email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Send Reset Link Button */}
            <button type="button" style={styles.resetButton}>
              <span style={styles.resetButtonText}>Send Reset Link</span>
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
    gap: 24,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  headerSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
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
    lineHeight: '20px',
    margin: 0,
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
  resetButton: {
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
  resetButtonText: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 14,
    color: '#FFFFFF',
  },
};
