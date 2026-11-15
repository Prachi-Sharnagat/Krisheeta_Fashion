import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setToken } from '../utils/auth';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setToken(data.token);
        navigate('/dashboard');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Is the server running?');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 border border-primary-200 text-primary-700 text-xs font-mono font-bold mb-3">
            GarmentERP v2.0
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Sign in to GarmentERP
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-600">
            Enterprise Garment Manufacturing Hub
          </p>
        </div>

        <form className="mt-6 space-y-5 bg-white p-5 sm:p-8 rounded-2xl shadow-[0_4px_20px_-4px_rgba(6,81,237,0.08)] border border-slate-100" onSubmit={handleLogin}>
          {error && (
            <div className="rounded-xl bg-red-50 p-3.5 border border-red-200">
              <div className="text-xs font-semibold text-red-700">{error}</div>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email address</label>
              <input
                type="email"
                required
                className="input-field"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Password</label>
              <input
                type="password"
                required
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <div>
            <button type="submit" className="btn-primary w-full py-2.5 text-xs sm:text-sm font-bold">
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
