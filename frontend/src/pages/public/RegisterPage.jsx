import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, UserPlus, Lock, Mail, User, AlertCircle, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PublicNavbar from '../../components/common/PublicNavbar';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    role: 'customer'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const newUser = await register({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        full_name: formData.full_name.trim(),
        role: formData.role
      });
      if (newUser.role === 'customer' || newUser.role === 'user') {
        navigate('/user');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
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
            <h2 className="text-2xl font-black text-forest-950 tracking-tight">Create Account</h2>
            <p className="text-xs text-sage-600">Register as an Eco Tourist or Hospitality Manager</p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-forest-900 mb-1">Full Name</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="e.g. Vikram Iyer"
                className="w-full px-3.5 py-2.5 rounded-xl border border-sage-200 text-xs focus:ring-2 focus:ring-forest-800 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-forest-900 mb-1">Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="e.g. vikram_eco"
                className="w-full px-3.5 py-2.5 rounded-xl border border-sage-200 text-xs focus:ring-2 focus:ring-forest-800 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-forest-900 mb-1">Work Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g. vikram@ecoresort.org"
                className="w-full px-3.5 py-2.5 rounded-xl border border-sage-200 text-xs focus:ring-2 focus:ring-forest-800 outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-forest-900 mb-1">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min 6 chars"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-sage-200 text-xs focus:ring-2 focus:ring-forest-800 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-forest-900 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Repeat password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-sage-200 text-xs focus:ring-2 focus:ring-forest-800 outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-forest-900 mb-1">Account Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-sage-200 text-xs focus:ring-2 focus:ring-forest-800 outline-none bg-white font-medium text-forest-950"
              >
                <option value="customer">User / Eco Tourist (Discover & Book Stays)</option>
                <option value="hospitality_manager">Hospitality Manager (Pricing & Operations)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-semibold text-xs transition-colors shadow-md shadow-forest-950/10 flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
            >
              <UserPlus className="w-4 h-4" />
              <span>{loading ? 'Creating Account...' : 'Complete Registration'}</span>
            </button>
          </form>

          <div className="text-center text-xs text-sage-600 pt-2 border-t border-sage-100">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-forest-800 hover:underline">
              Sign In
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
