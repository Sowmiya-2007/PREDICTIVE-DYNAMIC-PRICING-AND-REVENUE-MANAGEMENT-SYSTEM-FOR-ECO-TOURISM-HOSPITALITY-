import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Leaf,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  LogOut,
  CalendarCheck,
  TreePine,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService, bookingService } from '../../services/api';

const UserProfilePage = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    preferred_destination: user?.preferred_destination || 'Wayanad, Kerala',
    eco_preference: user?.eco_preference || 'Zero-Waste Rainforest Stays',
    new_password: ''
  });

  const [stats, setStats] = useState({ totalBookings: 0, upcomingCount: 0 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchBookingStats = async () => {
      try {
        const res = await bookingService.getMyBookings();
        if (res.data.success) {
          setStats({
            totalBookings: (res.data.all || []).length,
            upcomingCount: (res.data.upcoming || []).length
          });
        }
      } catch (err) {
        console.error("Error fetching user stats:", err);
      }
    };
    fetchBookingStats();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await authService.updateProfile({
        full_name: formData.full_name,
        phone: formData.phone,
        preferred_destination: formData.preferred_destination,
        eco_preference: formData.eco_preference,
        new_password: formData.new_password || undefined
      });

      if (res.data.success) {
        updateUser(res.data.user);
        setMessage({ type: 'success', text: 'Profile and preferences updated successfully!' });
        setFormData(prev => ({ ...prev, new_password: '' }));
      } else {
        setMessage({ type: 'error', text: res.data.message || 'Update failed.' });
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to update profile.'
      });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-forest-800 uppercase tracking-wider">
          <User className="w-4 h-4" />
          <span>Guest Profile & Preferences</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-forest-950 tracking-tight mt-1">
          Traveler Account Settings
        </h1>
        <p className="text-xs sm:text-sm text-sage-600 mt-1">
          Manage your personal details, preferred eco-retreat destinations, and nature stay preferences.
        </p>
      </div>

      {/* Status Alert */}
      {message && (
        <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2.5 border ${
          message.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Lifetime Eco-Tourism Impact Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-sage-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-sage-500 font-semibold">
            <span>Total Stays Booked</span>
            <CalendarCheck className="w-4 h-4 text-forest-700" />
          </div>
          <div className="text-2xl font-black text-forest-950">{stats.totalBookings}</div>
          <span className="text-[11px] text-sage-500 block">Reservations across nature retreats</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sage-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-sage-500 font-semibold">
            <span>Upcoming Escapes</span>
            <TreePine className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-forest-950">{stats.upcomingCount}</div>
          <span className="text-[11px] text-emerald-700 font-medium block">Confirmed upcoming visits</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sage-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-sage-500 font-semibold">
            <span>Conservation Impact</span>
            <Leaf className="w-4 h-4 text-forest-700" />
          </div>
          <div className="text-2xl font-black text-forest-900">100% Direct</div>
          <span className="text-[11px] text-sage-500 block">Zero commission fees to intermediaries</span>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-sage-200 p-6 sm:p-8 shadow-md space-y-8">
        
        {/* Basic Contact Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-forest-950 uppercase tracking-wide flex items-center gap-2">
            <User className="w-4 h-4 text-forest-700" />
            <span>Personal & Contact Information</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-forest-900 mb-1">Full Name</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-sage-200 text-xs focus:ring-2 focus:ring-forest-800 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-forest-900 mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-sage-400" />
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-sage-200 text-xs focus:ring-2 focus:ring-forest-800 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-sage-500 mb-1">Username (Read-Only)</label>
              <input
                type="text"
                value={user?.username || ''}
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl border border-sage-200 text-xs bg-sage-50 text-sage-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-sage-500 mb-1">Email Address (Read-Only)</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl border border-sage-200 text-xs bg-sage-50 text-sage-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Eco Preferences */}
        <div className="space-y-4 pt-6 border-t border-sage-100">
          <h3 className="text-sm font-bold text-forest-950 uppercase tracking-wide flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-forest-700" />
            <span>Eco-Tourism Preferences</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-forest-900 mb-1">Preferred Nature Destination</label>
              <select
                value={formData.preferred_destination}
                onChange={(e) => setFormData({ ...formData, preferred_destination: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-sage-200 text-xs focus:ring-2 focus:ring-forest-800 outline-none bg-white font-medium text-forest-950"
              >
                <option value="Wayanad, Kerala">Wayanad, Kerala (Rainforests & Canopies)</option>
                <option value="Nilgiris, Tamil Nadu">Nilgiris, Tamil Nadu (Mountain Grasslands & Tea)</option>
                <option value="Sundarbans, West Bengal">Sundarbans, West Bengal (Mangroves & Estuaries)</option>
                <option value="Coorg, Karnataka">Coorg, Karnataka (Organic Coffee & Agro-Forestry)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-forest-900 mb-1">Eco-Stay Travel Style</label>
              <select
                value={formData.eco_preference}
                onChange={(e) => setFormData({ ...formData, eco_preference: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-sage-200 text-xs focus:ring-2 focus:ring-forest-800 outline-none bg-white font-medium text-forest-950"
              >
                <option value="Zero-Waste Rainforest Stays">Zero-Waste Rainforest Stays</option>
                <option value="Organic Farm Stays & Culinary Workshops">Organic Farm Stays & Culinary Workshops</option>
                <option value="Wildlife Tracking & Silent Solar Safaris">Wildlife Tracking & Silent Solar Safaris</option>
                <option value="High-Altitude Mountain Sanctuaries">High-Altitude Mountain Sanctuaries</option>
              </select>
            </div>
          </div>
        </div>

        {/* Password Security */}
        <div className="space-y-4 pt-6 border-t border-sage-100">
          <h3 className="text-sm font-bold text-forest-950 uppercase tracking-wide flex items-center gap-2">
            <Lock className="w-4 h-4 text-forest-700" />
            <span>Account Security</span>
          </h3>

          <div className="max-w-md">
            <label className="block text-xs font-semibold text-forest-900 mb-1">
              Change Password <span className="text-sage-400 font-normal">(Leave blank to keep current)</span>
            </label>
            <input
              type="password"
              value={formData.new_password}
              onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
              placeholder="Minimum 6 characters"
              className="w-full px-3.5 py-2.5 rounded-xl border border-sage-200 text-xs focus:ring-2 focus:ring-forest-800 outline-none"
            />
          </div>
        </div>

        {/* Save & Logout Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-sage-100">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of Account</span>
          </button>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving Preferences...' : 'Save Profile Changes'}</span>
          </button>
        </div>

      </form>

    </div>
  );
};

export default UserProfilePage;
