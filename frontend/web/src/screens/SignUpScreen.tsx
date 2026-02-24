import React, { useState } from 'react';

function EyeIcon({ color }: { color: string }) {
  return (
    <div style={{ width: 16, height: 16, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: 14, height: 10, border: `1.5px solid ${color}`, borderRadius: 7 }} />
      <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: color, position: 'absolute' }} />
    </div>
  );
}

export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div style={styles.container}>
      <div style={styles.scrollContent}>
        <div style={styles.centerWrapper}>
          <div style={styles.card}>
            {/* Title */}
            <h2 style={styles.title}>Sign up</h2>

            {/* Form */}
            <div style={styles.form}>
              {/* Name */}
              <div style={styles.fieldContainer}>
                <label style={styles.fieldLabel}>Name</label>
                <div style={styles.field}>
                  <input
                    style={styles.input}
                    type="text"
                    placeholder="Last"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
              </div>

              {/* Email */}
              <div style={styles.fieldContainer}>
                <label style={styles.fieldLabel}>Email Address</label>
                <div style={styles.field}>
                  <input
                    style={styles.input}
                    type="email"
                    placeholder="name@email.com"
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
                    placeholder="Create a password"
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

              {/* Confirm Password */}
              <div style={styles.fieldContainer}>
                <label style={styles.fieldLabel}>Password</label>
                <div style={styles.field}>
                  <input
                    style={{ ...styles.input, paddingRight: 8 }}
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    style={styles.eyeIconContainer}>
                    <EyeIcon color="#8F9098" />
                  </button>
                </div>
              </div>
            </div>

            {/* Terms Text */}
            <p style={styles.termsText}>
              I've read and agree with the{' '}
              <span style={styles.termsLink}>Terms and Conditions</span> and the{' '}
              <span style={styles.termsLink}>Privacy Policy</span>.
            </p>
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
  title: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 22,
    color: '#1F2024',
    textAlign: 'center',
    margin: 0,
  },
  form: {
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
    fontWeight: 700,
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
  termsText: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 12,
    color: '#71727A',
    lineHeight: '18px',
    margin: 0,
  },
  termsLink: {
    color: '#FFB800',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
