import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Leaf, BarChart3, Calendar, Sparkles, LogIn, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const PublicNavbar = () => {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-sage-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-forest-800 to-forest-600 flex items-center justify-center text-white shadow-md shadow-forest-900/10 group-hover:scale-105 transition-transform">
            <Leaf className="w-6 h-6 text-forest-200" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-forest-950 flex items-center gap-1.5">
              EcoRev <span className="text-xs px-2 py-0.5 rounded-full bg-forest-100 text-forest-800 font-semibold uppercase tracking-wider">AI</span>
            </span>
            <p className="text-xs text-sage-600 font-medium">Predictive Pricing for Eco-Tourism</p>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            to="/"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive('/') ? 'text-forest-800 bg-forest-50' : 'text-sage-700 hover:text-forest-900 hover:bg-sage-50'
            }`}
          >
            Home
          </Link>
          <Link
            to="/about"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive('/about') ? 'text-forest-800 bg-forest-50' : 'text-sage-700 hover:text-forest-900 hover:bg-sage-50'
            }`}
          >
            About & Objectives
          </Link>
          <Link
            to="/contact"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive('/contact') ? 'text-forest-800 bg-forest-50' : 'text-sage-700 hover:text-forest-900 hover:bg-sage-50'
            }`}
          >
            Contact
          </Link>
        </nav>

        {/* CTA Buttons */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              to={user?.role === 'customer' || user?.role === 'user' ? '/user' : '/dashboard'}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-medium text-sm shadow-md shadow-forest-950/10 hover:shadow-lg transition-all"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>{user?.role === 'customer' || user?.role === 'user' ? 'Customer Dashboard' : 'Manager Dashboard'}</span>
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-forest-900 hover:bg-sage-100 font-medium text-sm transition-colors"
              >
                <LogIn className="w-4 h-4 text-forest-700" />
                <span>Sign In</span>
              </Link>
              <Link
                to="/register"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-medium text-sm shadow-md shadow-forest-950/10 hover:shadow-lg transition-all"
              >
                <span>Get Started</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default PublicNavbar;
