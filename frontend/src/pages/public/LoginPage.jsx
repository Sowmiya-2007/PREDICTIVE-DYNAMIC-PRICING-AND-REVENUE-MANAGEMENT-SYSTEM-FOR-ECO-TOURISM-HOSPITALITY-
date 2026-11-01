import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, LogIn, Lock, User, AlertCircle, Sparkles, Shield, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PublicNavbar from '../../components/common/PublicNavbar';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Please provide your username or email and password.');
      return;
    }

    setLoading(true);
    try {
      const loggedUser = await login(username.trim(), password);
      if (loggedUser.role === 'customer' || loggedUser.role === 'user') {
        navigate('/user');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (u, p) => {
    setUsername(u);
    setPassword(p);
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] flex flex-col">
      <PublicNavbar />

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-sage-200 shadow-xl space-y-6">
          
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-forest-800 text-white flex items-center justify-center mx-auto shadow-md">
              <Leaf className="w-6 h-6 text-forest-200" />
            </div>
            <h2 className="text-2xl font-black text-forest-950 tracking-tight">Sign In to EcoRev AI</h2>
            <p className="text-xs text-sage-600">Access your personalized eco-tourism portal</p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Demo Credentials Bar for the 2 user-facing roles */}
          <div className="bg-sage-50/80 p-3.5 rounded-2xl border border-sage-200/80 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-forest-900 uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-forest-700" />
              <span>One-Click Demonstration Logins:</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDemoCredentials('manager', 'manager123')}
                className="px-2.5 py-2 rounded-lg bg-white hover:bg-forest-50 border border-sage-200 text-[11px] font-semibold text-forest-900 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
              >
                <UserCheck className="w-3.5 h-3.5 text-forest-600" />
                <span>Manager Dashboard</span>
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials('tourist', 'user123')}
                className="px-2.5 py-2 rounded-lg bg-white hover:bg-forest-50 border border-sage-200 text-[11px] font-semibold text-forest-900 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
              >
                <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                <span>User / Customer</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-forest-900 mb-1">Username or Email</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-sage-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="manager or tourist"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-sage-200 text-xs focus:ring-2 focus:ring-forest-800 outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-forest-900 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-sage-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-sage-200 text-xs focus:ring-2 focus:ring-forest-800 outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-semibold text-xs transition-colors shadow-md shadow-forest-950/10 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
            </button>
          </form>

          <div className="text-center text-xs text-sage-600 pt-2 border-t border-sage-100">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-forest-800 hover:underline">
              Register here
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
