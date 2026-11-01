import React, { useState } from 'react';
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import {
  Leaf,
  Compass,
  Home,
  CalendarCheck,
  User,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const customerNav = [
  { name: 'Explore & Welcome', href: '/user', icon: Compass, end: true },
  { name: 'Eco-Retreats & Lodges', href: '/user/properties', icon: Home, end: false },
  { name: 'My Bookings', href: '/user/bookings', icon: CalendarCheck, end: false },
  { name: 'Profile & Preferences', href: '/user/profile', icon: User, end: false },
];

const CustomerLayout = () => {
  const { user, logout, isManager } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] flex flex-col font-sans">
      {/* Top Customer Announcement / Conservation Banner */}
      <div className="bg-forest-900 text-white text-[11px] py-1.5 px-4 text-center font-medium flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-forest-300" />
        <span>Welcome to EcoRev AI Guest Portal • Sustainable Stays with Transparent Dynamic Eco-Pricing</span>
      </div>

      {/* Main Customer Header / Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-sage-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Brand Logo */}
            <Link to="/user" className="flex items-center gap-3 group">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-forest-800 to-forest-600 flex items-center justify-center text-white shadow-md shadow-forest-900/10 group-hover:scale-105 transition-transform">
                <Leaf className="w-6 h-6 text-forest-200" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-forest-950 flex items-center gap-1.5">
                  EcoRev <span className="text-xs px-2 py-0.5 rounded-full bg-forest-100 text-forest-800 font-semibold uppercase tracking-wider">Guest</span>
                </span>
                <p className="text-xs text-sage-600 font-medium">Eco-Tourism Booking & Discovery</p>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1.5">
              {customerNav.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                        isActive
                          ? 'bg-forest-800 text-white shadow-sm shadow-forest-950/20'
                          : 'text-sage-700 hover:text-forest-950 hover:bg-sage-100/70'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* User Profile & Actions */}
            <div className="hidden md:flex items-center gap-3">
              {/* Optional Manager Switch */}
              {isManager && (
                <Link
                  to="/dashboard"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-forest-50 hover:bg-forest-100 text-forest-800 border border-forest-200 text-xs font-semibold transition-colors"
                  title="Switch to Hospitality Manager Console"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Manager View</span>
                </Link>
              )}

              {/* User Avatar & Name */}
              <Link
                to="/user/profile"
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-sage-50 hover:bg-sage-100/80 border border-sage-200/80 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-forest-700 text-white flex items-center justify-center font-bold text-xs shadow-inner">
                  {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'G'}
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-forest-950 leading-tight truncate max-w-[120px]">
                    {user?.full_name || 'Eco Guest'}
                  </p>
                  <p className="text-[10px] text-sage-600 font-medium capitalize">
                    {user?.role === 'customer' ? 'Eco Traveler' : user?.role?.replace('_', ' ')}
                  </p>
                </div>
              </Link>

              {/* Sign Out Button */}
              <button
                onClick={handleLogout}
                className="p-2.5 rounded-xl text-sage-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Hamburger Toggle */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-sage-700 hover:bg-sage-100"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-sage-200 bg-white px-4 py-4 space-y-2">
            <div className="flex items-center gap-3 p-3 bg-sage-50 rounded-2xl mb-3">
              <div className="w-10 h-10 rounded-full bg-forest-700 text-white flex items-center justify-center font-bold text-sm">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'G'}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-forest-950">{user?.full_name || 'Eco Guest'}</p>
                <p className="text-xs text-sage-600">{user?.email}</p>
              </div>
            </div>

            {customerNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  end={item.end}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-forest-800 text-white'
                        : 'text-sage-700 hover:bg-sage-100'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}

            {isManager && (
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-forest-800 bg-forest-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Switch to Manager Dashboard</span>
              </Link>
            )}

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-rose-700 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Customer Footer */}
      <footer className="bg-forest-950 text-sage-300 py-10 border-t border-forest-900 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-forest-800 text-forest-200 flex items-center justify-center">
                <Leaf className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-white">EcoRev AI • Eco-Tourism Stays</span>
                <p className="text-xs text-sage-400">Balancing ecological conservation and fair dynamic pricing</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs text-sage-400">
              <Link to="/user" className="hover:text-white transition-colors">Home & Stays</Link>
              <Link to="/user/properties" className="hover:text-white transition-colors">Discover Lodges</Link>
              <Link to="/user/bookings" className="hover:text-white transition-colors">My Bookings</Link>
              <Link to="/user/profile" className="hover:text-white transition-colors">Preferences</Link>
              <Link to="/about" className="hover:text-white transition-colors">Conservation Methodology</Link>
            </div>

            <p className="text-xs text-sage-500">
              © {new Date().getFullYear()} EcoRev AI. Nature Conservation Stays.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CustomerLayout;
