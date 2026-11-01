import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Home,
  Calendar,
  DollarSign,
  TrendingUp,
  BarChart3,
  Database,
  LogOut,
  Leaf,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Sparkles,
  Sliders
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navigation = [
  { name: 'Dashboard Overview', href: '/dashboard', icon: LayoutDashboard, tag: 'Live' },
  { name: 'Eco Properties', href: '/dashboard/properties', icon: Home },
  { name: 'Local Event Intelligence', href: '/dashboard/events', icon: Calendar },
  { name: 'Dynamic Pricing', href: '/dashboard/pricing', icon: DollarSign, badge: 'AI' },
  { name: 'Demand Prediction & ML', href: '/dashboard/forecast', icon: TrendingUp, badge: '3 Models' },
  { name: 'Revenue Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Data & CSV Tools', href: '/dashboard/data', icon: Database },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`bg-forest-950 text-white flex flex-col shrink-0 border-r border-forest-900/60 select-none min-h-screen relative transition-all duration-300 ease-in-out ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-7 w-6 h-6 rounded-full bg-forest-800 border border-forest-700 text-forest-200 flex items-center justify-center hover:bg-forest-700 hover:text-white transition-all shadow-md z-30"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Brand Header */}
      <div className={`h-20 flex items-center border-b border-forest-900/70 bg-forest-950/80 px-5 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-forest-800 flex items-center justify-center text-white shadow-lg shadow-forest-950/50 shrink-0">
          <Leaf className="w-5 h-5 text-emerald-200" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              EcoRev <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold tracking-wider">AI</span>
            </div>
            <p className="text-[11px] text-sage-400 font-normal truncate">Revenue Management</p>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto overflow-x-hidden">
        {!collapsed && (
          <div className="px-3 mb-2.5 text-[10px] font-bold tracking-wider uppercase text-sage-500/80">
            Operations & AI
          </div>
        )}

        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === '/dashboard'}
              title={collapsed ? item.name : undefined}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all relative ${
                  isActive
                    ? 'bg-forest-800/90 text-white font-semibold shadow-sm border border-forest-700/60'
                    : 'text-sage-300 hover:text-white hover:bg-forest-900/50'
                } ${collapsed ? 'justify-center px-0' : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-emerald-400' : 'text-sage-400 group-hover:text-emerald-300'}`} />
                  {!collapsed && (
                    <div className="flex-1 flex items-center justify-between min-w-0">
                      <span className="truncate">{item.name}</span>
                      {item.badge && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 ml-1">
                          {item.badge}
                        </span>
                      )}
                      {item.tag && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-1"></span>
                      )}
                    </div>
                  )}
                  {/* Subtle active indicator bar */}
                  {isActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-emerald-400"></div>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Profile & Sign Out Footer */}
      <div className={`p-3 border-t border-forest-900/80 bg-forest-950/90 ${collapsed ? 'flex flex-col items-center' : ''}`}>
        {!collapsed ? (
          <>
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-forest-900/50 border border-forest-800/60 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-forest-700 to-forest-800 flex items-center justify-center text-white font-bold text-xs shadow-inner">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'M'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate leading-tight">{user?.full_name || 'Hospitality Manager'}</p>
                <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5 font-medium">
                  <UserCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">Hospitality Manager</span>
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-sage-400 hover:text-rose-300 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/40 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </>
        ) : (
          <button
            onClick={logout}
            className="w-10 h-10 rounded-xl bg-forest-900/60 hover:bg-rose-950/60 hover:text-rose-300 text-sage-400 flex items-center justify-center transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
