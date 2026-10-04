import { useState } from 'react';
import useForm from '../hooks/useForm.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useNav } from '../context/NavContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Alert, FormField } from '../components/ui.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateLogin(v) {
  const e = {};
  if (!v.email.trim()) e.email = 'Email is required';
  else if (!EMAIL_RE.test(v.email)) e.email = 'Enter a valid email address';
  if (!v.password) e.password = 'Password is required';
  return e;
}

function validateRegister(v) {
  const e = validateLogin(v);
  if (!v.name.trim()) e.name = 'Full name is required';
  else if (v.name.trim().length < 3) e.name = 'Name must be at least 3 characters';
  if (v.password && v.password.length < 6) e.password = 'Password must be at least 6 characters';
  if (v.confirm !== v.password) e.confirm = 'Passwords do not match';
  return e;
}

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login, register } = useAuth();
  const { navigate } = useNav();
  const toast = useToast();

  const isLogin = mode === 'login';
  const form = useForm(
    { name: '', email: '', password: '', confirm: '' },
    isLogin ? validateLogin : validateRegister
  );

  const submit = form.handleSubmit(async (v) => {
    setBusy(true);
    setServerError('');
    try {
      const user = isLogin ? await login(v.email, v.password) : await register(v.name, v.email, v.password);
      toast.success(`Welcome, ${user.name}!`);
      navigate('dashboard');
    } catch (err) {
      setServerError(err.message);
    } finally {
      setBusy(false);
    }
  });

  const switchMode = (next) => {
    setMode(next);
    setServerError('');
    form.reset();
  };

  const fillDemo = (email, password) => form.setValues((v) => ({ ...v, email, password }));
  const bind = (name) => ({ id: name, name, value: form.values[name], onChange: form.handleChange, onBlur: form.handleBlur });

  return (
    <div className="auth-wrap">
      <section className="auth-card">
        <div className="auth-brand">🔬 BookMyLab</div>
        <h1>{isLogin ? 'Welcome back' : 'Create student account'}</h1>
        <p className="muted">{isLogin ? 'Login to book equipment and track your bookings.' : 'Register to start booking lab equipment.'}</p>

        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={isLogin} className={isLogin ? 'tab active' : 'tab'} onClick={() => switchMode('login')}>Login</button>
          <button role="tab" aria-selected={!isLogin} className={!isLogin ? 'tab active' : 'tab'} onClick={() => switchMode('register')}>Register</button>
        </div>

        {serverError && <Alert>{serverError}</Alert>}

        <form onSubmit={submit} noValidate>
          {!isLogin && (
            <FormField label="Full name" name="name" error={form.errors.name} touched={form.touched.name}>
              <input type="text" placeholder="e.g. Rahul Sharma" autoComplete="name" {...bind('name')} />
            </FormField>
          )}
          <FormField label="Email" name="email" error={form.errors.email} touched={form.touched.email}>
            <input type="email" placeholder="you@college.edu" autoComplete="email" {...bind('email')} />
          </FormField>
          <FormField label="Password" name="password" error={form.errors.password} touched={form.touched.password}>
            <input type="password" placeholder="••••••" autoComplete={isLogin ? 'current-password' : 'new-password'} {...bind('password')} />
          </FormField>
          {!isLogin && (
            <FormField label="Confirm password" name="confirm" error={form.errors.confirm} touched={form.touched.confirm}>
              <input type="password" placeholder="Repeat password" autoComplete="new-password" {...bind('confirm')} />
            </FormField>
          )}
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Please wait…' : isLogin ? 'Login' : 'Create account'}
          </button>
        </form>

        {isLogin && (
          <div className="demo-box">
            <p className="muted">Demo accounts (click to fill):</p>
            <div className="demo-buttons">
              <button type="button" className="chip" onClick={() => fillDemo('admin@bookmylab.com', 'admin123')}>👨‍💼 Admin</button>
              <button type="button" className="chip" onClick={() => fillDemo('rahul@student.com', 'student123')}>🎓 Student</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
