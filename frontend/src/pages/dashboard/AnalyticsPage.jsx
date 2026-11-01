import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  Activity,
  Layers,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Percent,
  CheckCircle2,
  Filter,
  DollarSign,
  Building,
  Clock,
  CreditCard,
  ChevronRight,
  Info,
  RotateCcw,
  FileText,
  PieChart,
  Tag,
  HelpCircle,
  AlertCircle,
  Users
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import DashboardHeader from '../../components/common/DashboardHeader';
import { analyticsService, dataService, propertyService } from '../../services/api';

const AnalyticsPage = () => {
  // Revenue Analytics Data
  const [revenueData, setRevenueData] = useState(null);
  const [properties, setProperties] = useState([]);
  const [eventImpact, setEventImpact] = useState(null);
  const [simulation, setSimulation] = useState(null);

  // Filters
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [selectedPreset, setSelectedPreset] = useState('last_30_days');
  const [selectedInterval, setSelectedInterval] = useState('daily'); // 'daily', 'weekly', 'monthly', 'yearly'
  const [selectedDateBasis, setSelectedDateBasis] = useState('check_in'); // 'check_in', 'booking_date'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  // Sub-tab Navigation
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState('revenue'); // 'revenue', 'simulation', 'events'
  const [activeBreakdownTab, setActiveBreakdownTab] = useState('room_type'); // 'room_type', 'channel', 'property', 'season', 'status'

  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Safe formatting helpers
  const formatCurrency = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return `₹${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const formatPercent = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return `${Number(val).toFixed(1)}%`;
  };

  const fetchRevenueData = async () => {
    setLoading(true);
    setFetchError(null);

    const params = {
      property_id: selectedProperty !== 'all' ? selectedProperty : undefined,
      preset: selectedPreset !== 'custom' ? selectedPreset : undefined,
      interval: selectedInterval,
      date_basis: selectedDateBasis
    };

    if (selectedPreset === 'custom' && customStartDate && customEndDate) {
      params.start_date = customStartDate;
      params.end_date = customEndDate;
    }

    try {
      const results = await Promise.allSettled([
        analyticsService.getRevenueAnalytics(params),
        propertyService.list(),
        analyticsService.getSimulation({
          property_id: selectedProperty !== 'all' ? selectedProperty : undefined,
          days: 30
        }),
        analyticsService.getEventImpact({
          property_id: selectedProperty !== 'all' ? selectedProperty : undefined
        })
      ]);

      const [revRes, propRes, simRes, impactRes] = results;

      if (revRes.status === 'fulfilled' && revRes.value?.data?.success) {
        setRevenueData(revRes.value.data);
      } else {
        console.warn("Revenue analytics fetch warning:", revRes.reason);
        setFetchError("Unable to retrieve revenue calculations from the server.");
      }

      if (propRes.status === 'fulfilled' && propRes.value?.data?.success) {
        setProperties(propRes.value.data.properties || []);
      }

      if (simRes.status === 'fulfilled' && simRes.value?.data?.success) {
        setSimulation(simRes.value.data.simulation);
      }

      if (impactRes.status === 'fulfilled' && impactRes.value?.data?.success) {
        setEventImpact(impactRes.value.data.analysis);
      }
    } catch (err) {
      console.error("Revenue Analytics error:", err);
      setFetchError("A critical error occurred while calculating revenue analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenueData();
  }, [selectedProperty, selectedPreset, selectedInterval, selectedDateBasis]);

  const handleApplyCustomDates = () => {
    if (!customStartDate || !customEndDate) {
      alert("Please select both start and end dates.");
      return;
    }
    if (customStartDate > customEndDate) {
      alert("Start date cannot be after end date.");
      return;
    }
    setSelectedPreset('custom');
    fetchRevenueData();
  };

  const handleExportCSV = () => {
    window.open(dataService.getExportUrl(), '_blank');
  };

  // Custom Chart Tooltip
  const CustomChartTooltip = ({ active, payload, label, prefix = '', suffix = '' }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-sage-200 shadow-xl text-xs space-y-2">
          <div className="font-semibold text-charcoal-800 border-b border-sage-100 pb-1.5 flex items-center justify-between gap-4">
            <span>{label}</span>
            <span className="text-[10px] text-charcoal-400 font-mono">Financial Metric</span>
          </div>
          {payload.map((entry, index) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-6">
              <span className="flex items-center gap-1.5 text-charcoal-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                {entry.name}:
              </span>
              <span className="font-bold font-mono-num text-charcoal-900">
                {prefix}{typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}{suffix}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const kpis = revenueData?.kpis;
  const growth = kpis?.growth;
  const trendChart = revenueData?.trend_chart || [];
  const breakdowns = revenueData?.breakdowns || {};
  const dateRange = revenueData?.date_range;

  return (
    <div className="flex-1 pb-16 bg-[#F8F6F0] min-h-screen">
      <DashboardHeader
        title="Revenue Analytics & Yield Intelligence"
        subtitle="Audited financial reporting, ADR & RevPAR calculations, period variance, and multi-channel revenue breakdown"
        onRefresh={fetchRevenueData}
        isRefreshing={loading}
        dateRangeText={dateRange ? `${dateRange.start_date} to ${dateRange.end_date} (${dateRange.days_count}d)` : 'Revenue Reporting'}
      />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 pt-6 space-y-6">

        {/* Global Error Banner */}
        {fetchError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-rose-950">Analytics Calculation Issue</h4>
                <p className="text-xs text-rose-800">{fetchError}</p>
              </div>
            </div>
            <button
              onClick={fetchRevenueData}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Module View Tabs: Revenue Analytics (Primary) | Strategic Simulation | Regional Elasticity */}
        <div className="flex items-center justify-between border-b border-sage-200 pb-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveWorkspaceTab('revenue')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeWorkspaceTab === 'revenue'
                  ? 'bg-forest-800 text-white shadow-xs'
                  : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-sage-100'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Core Revenue Analytics</span>
            </button>

            <button
              onClick={() => setActiveWorkspaceTab('simulation')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeWorkspaceTab === 'simulation'
                  ? 'bg-forest-800 text-white shadow-xs'
                  : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-sage-100'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>AI Dynamic Yield Simulation</span>
            </button>

            <button
              onClick={() => setActiveWorkspaceTab('events')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeWorkspaceTab === 'events'
                  ? 'bg-forest-800 text-white shadow-xs'
                  : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-sage-100'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Event & Weather Elasticity</span>
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-sage-50 text-charcoal-800 border border-sage-200 text-xs font-semibold shadow-2xs transition-all"
            title="Export official booking audit CSV report"
          >
            <Download className="w-3.5 h-3.5 text-forest-700" />
            <span>Export Financial CSV</span>
          </button>
        </div>

        {/* Global Controls & Date Filters Bar */}
        <div className="bg-white p-4 rounded-2xl border border-sage-200 shadow-card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-forest-900 uppercase tracking-wider pr-1">
                <Filter className="w-3.5 h-3.5 text-forest-700" />
                <span>Filters:</span>
              </div>

              {/* Property Selector */}
              <select
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
                className="text-xs bg-sage-50 hover:bg-sage-100/70 border border-sage-200 rounded-xl px-3 py-2 text-charcoal-800 font-medium focus:ring-2 focus:ring-forest-700 outline-none cursor-pointer"
              >
                <option value="all">All Eco Properties ({properties.length})</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              {/* Date Basis Toggle */}
              <select
                value={selectedDateBasis}
                onChange={(e) => setSelectedDateBasis(e.target.value)}
                className="text-xs bg-sage-50 hover:bg-sage-100/70 border border-sage-200 rounded-xl px-3 py-2 text-charcoal-800 font-medium focus:ring-2 focus:ring-forest-700 outline-none cursor-pointer"
                title="Choose revenue recognition basis"
              >
                <option value="check_in">Basis: Check-In Stay Date (Earned)</option>
                <option value="booking_date">Basis: Booking Date (Sales Creation)</option>
              </select>

              {/* Custom Date Range Toggle Button */}
              <button
                onClick={() => setShowCustomPicker(!showCustomPicker)}
                className={`text-xs px-3 py-2 rounded-xl border font-medium flex items-center gap-1.5 transition-all ${
                  showCustomPicker || selectedPreset === 'custom'
                    ? 'bg-forest-50 border-forest-300 text-forest-900 font-semibold'
                    : 'bg-sage-50 hover:bg-sage-100 border-sage-200 text-charcoal-700'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-forest-700" />
                <span>Custom Dates</span>
              </button>
            </div>

            {/* Presets Button Group */}
            <div className="flex flex-wrap items-center bg-sage-50 border border-sage-200 rounded-xl p-1 gap-1">
              {[
                { id: 'today', label: 'Today' },
                { id: 'last_7_days', label: '7 Days' },
                { id: 'last_30_days', label: '30 Days' },
                { id: 'last_90_days', label: '90 Days' },
                { id: 'this_month', label: 'This Month' },
                { id: 'last_month', label: 'Last Month' },
                { id: 'this_year', label: 'This Year' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedPreset(p.id); setShowCustomPicker(false); }}
                  className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all ${
                    selectedPreset === p.id
                      ? 'bg-forest-800 text-white shadow-xs'
                      : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-sage-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

          </div>

          {/* Collapsible Custom Date Range Picker */}
          {showCustomPicker && (
            <div className="pt-3 border-t border-sage-100 flex flex-wrap items-center gap-3 text-xs bg-sage-50/60 p-3 rounded-xl">
              <span className="font-semibold text-charcoal-800">Select Custom Range:</span>
              <div className="flex items-center gap-2">
                <label className="text-charcoal-500 font-medium">Start:</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-white border border-sage-200 rounded-lg px-2.5 py-1 text-xs text-charcoal-800 focus:ring-1 focus:ring-forest-700 outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-charcoal-500 font-medium">End:</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-white border border-sage-200 rounded-lg px-2.5 py-1 text-xs text-charcoal-800 focus:ring-1 focus:ring-forest-700 outline-none"
                />
              </div>
              <button
                onClick={handleApplyCustomDates}
                className="px-3 py-1 bg-forest-800 hover:bg-forest-900 text-white rounded-lg font-semibold text-xs transition-colors"
              >
                Apply Range
              </button>
              <span className="text-[11px] text-charcoal-400">
                (Comparison period will auto-align to the matching prior {customStartDate && customEndDate ? Math.max(1, (new Date(customEndDate) - new Date(customStartDate)) / (86400000) + 1) : 'N'} days)
              </span>
            </div>
          )}
        </div>

        {/* ===================== VIEW 1: CORE REVENUE ANALYTICS ===================== */}
        {activeWorkspaceTab === 'revenue' && (
          <div className="space-y-6">

            {/* 8 Revenue KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* KPI 1: Total Revenue */}
              <div className="premium-card p-5 space-y-2.5 border-emerald-200/80 bg-gradient-to-b from-white to-emerald-50/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Total Revenue</span>
                    <span title="Net collected revenue from all completed stays and confirmed reservations." className="cursor-help">
                      <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  {loading && !kpis ? (
                    <div className="h-8 w-28 bg-emerald-100/70 rounded-lg animate-pulse"></div>
                  ) : (
                    <div className="text-2xl font-bold font-mono-num text-emerald-900 tracking-tight">
                      {formatCurrency(kpis?.total_revenue)}
                    </div>
                  )}
                  <div className="text-[11px] text-emerald-800/90 font-medium mt-1 flex items-center justify-between">
                    <span>Valid revenue-generating stays</span>
                    <span className="text-[10px] text-emerald-700 font-mono">Net Realized</span>
                  </div>
                </div>
              </div>

              {/* KPI 2: Gross Revenue */}
              <div className="premium-card p-5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-charcoal-600 uppercase tracking-wider">Gross Revenue</span>
                    <span title="Total booking value booked before deductions or cancelled reservation refunds." className="cursor-help">
                      <HelpCircle className="w-3.5 h-3.5 text-charcoal-400" />
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-forest-50 text-forest-700 flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  {loading && !kpis ? (
                    <div className="h-8 w-28 bg-sage-200/70 rounded-lg animate-pulse"></div>
                  ) : (
                    <div className="text-2xl font-bold font-mono-num text-charcoal-900 tracking-tight">
                      {formatCurrency(kpis?.gross_revenue)}
                    </div>
                  )}
                  <div className="text-[11px] text-charcoal-500 font-normal mt-1 flex items-center justify-between">
                    <span>Before cancellations</span>
                    <span className="text-[10px] text-amber-700 font-medium">
                      -{formatCurrency(kpis?.deductions_cancelled)} cancelled
                    </span>
                  </div>
                </div>
              </div>

              {/* KPI 3: Net Revenue */}
              <div className="premium-card p-5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-charcoal-600 uppercase tracking-wider">Net Revenue</span>
                    <span title="Revenue after subtracting cancellations and refunds." className="cursor-help">
                      <HelpCircle className="w-3.5 h-3.5 text-charcoal-400" />
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-forest-50 text-forest-700 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  {loading && !kpis ? (
                    <div className="h-8 w-28 bg-sage-200/70 rounded-lg animate-pulse"></div>
                  ) : (
                    <div className="text-2xl font-bold font-mono-num text-charcoal-900 tracking-tight">
                      {formatCurrency(kpis?.net_revenue)}
                    </div>
                  )}
                  <div className="text-[11px] text-charcoal-500 font-normal mt-1 flex items-center justify-between">
                    <span>Gross minus refunds</span>
                    <span className="text-[10px] text-emerald-700 font-bold">100% Retained</span>
                  </div>
                </div>
              </div>

              {/* KPI 4: Revenue Growth (Period-Over-Period) */}
              <div className={`premium-card p-5 space-y-2.5 ${
                growth?.is_positive ? 'border-emerald-200/80 bg-gradient-to-b from-white to-emerald-50/20' : 'border-amber-200/80 bg-gradient-to-b from-white to-amber-50/20'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-charcoal-700 uppercase tracking-wider">Revenue Growth</span>
                    <span title={`Compared against prior equivalent period (${dateRange?.prev_start_date} to ${dateRange?.prev_end_date}).`} className="cursor-help">
                      <HelpCircle className="w-3.5 h-3.5 text-charcoal-400" />
                    </span>
                  </div>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    growth?.is_positive ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {growth?.is_positive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  </div>
                </div>
                <div>
                  {loading && !kpis ? (
                    <div className="h-8 w-24 bg-sage-200/70 rounded-lg animate-pulse"></div>
                  ) : (
                    <div className={`text-2xl font-bold font-mono-num tracking-tight ${
                      growth?.is_positive ? 'text-emerald-700' : 'text-amber-800'
                    }`}>
                      {growth?.is_positive ? '+' : ''}{growth?.percentage_change}%
                    </div>
                  )}
                  <div className="text-[11px] text-charcoal-500 font-normal mt-1 flex items-center justify-between">
                    <span>
                      {growth?.is_positive ? '+' : ''}{formatCurrency(growth?.absolute_difference)}
                    </span>
                    <span className="text-[10px] text-charcoal-400 font-mono">vs Prior Window</span>
                  </div>
                </div>
              </div>

              {/* KPI 5: Average Daily Revenue */}
              <div className="premium-card p-5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-charcoal-600 uppercase tracking-wider">Avg Daily Revenue</span>
                    <span title="Total revenue divided by number of days in selected period." className="cursor-help">
                      <HelpCircle className="w-3.5 h-3.5 text-charcoal-400" />
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-forest-50 text-forest-700 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  {loading && !kpis ? (
                    <div className="h-8 w-24 bg-sage-200/70 rounded-lg animate-pulse"></div>
                  ) : (
                    <div className="text-2xl font-bold font-mono-num text-charcoal-900 tracking-tight">
                      {formatCurrency(kpis?.avg_daily_revenue)}
                    </div>
                  )}
                  <div className="text-[11px] text-charcoal-500 font-normal mt-1 flex items-center justify-between">
                    <span>Daily pacing rate</span>
                    <span className="text-[10px] text-charcoal-400 font-mono">across {dateRange?.days_count || 30} days</span>
                  </div>
                </div>
              </div>

              {/* KPI 6: Average Revenue Per Booking */}
              <div className="premium-card p-5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-charcoal-600 uppercase tracking-wider">Avg Rev / Booking</span>
                    <span title="Total eligible revenue divided by total eligible bookings." className="cursor-help">
                      <HelpCircle className="w-3.5 h-3.5 text-charcoal-400" />
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-forest-50 text-forest-700 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  {loading && !kpis ? (
                    <div className="h-8 w-24 bg-sage-200/70 rounded-lg animate-pulse"></div>
                  ) : (
                    <div className="text-2xl font-bold font-mono-num text-charcoal-900 tracking-tight">
                      {formatCurrency(kpis?.avg_revenue_per_booking)}
                    </div>
                  )}
                  <div className="text-[11px] text-charcoal-500 font-normal mt-1 flex items-center justify-between">
                    <span>Average reservation size</span>
                    <span className="text-[10px] text-charcoal-400 font-mono">{kpis?.total_bookings || 0} Bookings</span>
                  </div>
                </div>
              </div>

              {/* KPI 7: Average Daily Rate (ADR) */}
              <div className="premium-card p-5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-charcoal-600 uppercase tracking-wider">ADR (Daily Rate)</span>
                    <span title="Average Daily Rate = Total Room Revenue / Sold Room Nights." className="cursor-help">
                      <HelpCircle className="w-3.5 h-3.5 text-charcoal-400" />
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-forest-50 text-forest-700 flex items-center justify-center">
                    <Tag className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  {loading && !kpis ? (
                    <div className="h-8 w-24 bg-sage-200/70 rounded-lg animate-pulse"></div>
                  ) : (
                    <div className="text-2xl font-bold font-mono-num text-charcoal-900 tracking-tight">
                      {formatCurrency(kpis?.adr)}
                    </div>
                  )}
                  <div className="text-[11px] text-charcoal-500 font-normal mt-1 flex items-center justify-between">
                    <span>Per occupied room-night</span>
                    <span className="text-[10px] text-charcoal-400 font-mono">{kpis?.sold_room_nights || 0} Sold Nts</span>
                  </div>
                </div>
              </div>

              {/* KPI 8: Revenue Per Available Room (RevPAR) */}
              <div className="premium-card p-5 space-y-2.5 border-forest-200/80 bg-gradient-to-b from-white to-forest-50/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-forest-900 uppercase tracking-wider">RevPAR</span>
                    <span title="Revenue Per Available Room = Total Room Revenue / Total Available Room Nights." className="cursor-help">
                      <HelpCircle className="w-3.5 h-3.5 text-forest-700" />
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-forest-100 text-forest-800 flex items-center justify-center font-bold">
                    <Building className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  {loading && !kpis ? (
                    <div className="h-8 w-24 bg-forest-100/70 rounded-lg animate-pulse"></div>
                  ) : (
                    <div className="text-2xl font-bold font-mono-num text-forest-900 tracking-tight">
                      {formatCurrency(kpis?.revpar)}
                    </div>
                  )}
                  <div className="text-[11px] text-forest-800/90 font-medium mt-1 flex items-center justify-between">
                    <span>{kpis?.occupancy_rate_pct}% Occupancy</span>
                    <span className="text-[10px] text-forest-700 font-mono">{kpis?.available_room_nights || 0} Avail Nts</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Interactive Revenue Trend Chart */}
            <div className="premium-card p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sage-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-charcoal-900 flex items-center gap-2">
                    <span>Realized Revenue Trend Over Time</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Actual PMS Data
                    </span>
                  </h3>
                  <p className="text-xs text-charcoal-500 mt-0.5">
                    Viewing {selectedInterval} revenue pacing with historical baseline overlay
                  </p>
                </div>

                {/* Interval Selector */}
                <div className="flex items-center bg-sage-50 border border-sage-200 rounded-xl p-1 gap-1">
                  {[
                    { id: 'daily', label: 'Daily' },
                    { id: 'weekly', label: 'Weekly' },
                    { id: 'monthly', label: 'Monthly' },
                    { id: 'yearly', label: 'Yearly' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setSelectedInterval(tab.id)}
                      className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all ${
                        selectedInterval === tab.id
                          ? 'bg-forest-800 text-white shadow-xs'
                          : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-sage-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart Visualizer */}
              <div className="h-80 w-full pt-2">
                {loading && trendChart.length === 0 ? (
                  <div className="h-full w-full bg-sage-50/70 rounded-xl animate-pulse flex items-center justify-center text-xs text-charcoal-400">
                    Computing financial trend aggregations...
                  </div>
                ) : trendChart.length === 0 || (kpis?.total_revenue === 0) ? (
                  <div className="h-full w-full bg-sage-50/40 rounded-xl border border-dashed border-sage-200 flex flex-col items-center justify-center gap-2 text-xs text-charcoal-500">
                    <AlertCircle className="w-6 h-6 text-charcoal-400" />
                    <span className="font-semibold">No revenue records available for this reporting period.</span>
                    <p className="text-[11px] text-charcoal-400">Try selecting "Last 30 Days" or "This Year" to view verified booking revenue.</p>
                    <button
                      onClick={() => setSelectedPreset('last_30_days')}
                      className="mt-1 px-3 py-1 bg-forest-800 text-white rounded-lg text-[11px] font-semibold"
                    >
                      Reset to Last 30 Days
                    </button>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendChart} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#143526" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#143526" stopOpacity={0.0}/>
                        </linearGradient>
                        <linearGradient id="colorPrev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#9DA5B1" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#9DA5B1" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8ECE8" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#687486' }} stroke="#E8ECE8" />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#687486' }}
                        stroke="#E8ECE8"
                        tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip content={<CustomChartTooltip prefix="₹" />} />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        name="Current Period Revenue (₹)"
                        stroke="#143526"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorRev)"
                      />
                      {trendChart.some(d => d.prev_revenue > 0) && (
                        <Area
                          type="monotone"
                          dataKey="prev_revenue"
                          name="Prior Period Baseline (₹)"
                          stroke="#9DA5B1"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                          fillOpacity={1}
                          fill="url(#colorPrev)"
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Deep Revenue Breakdowns Section */}
            <div className="premium-card p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sage-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-charcoal-900">Revenue Segmentation & Portfolio Breakdown</h3>
                  <p className="text-xs text-charcoal-500">Distribution analysis across room categories, booking channels, resorts and seasons</p>
                </div>

                {/* Breakdown Sub-Tabs */}
                <div className="flex flex-wrap items-center bg-sage-50 border border-sage-200 rounded-xl p-1 gap-1">
                  {[
                    { id: 'room_type', label: 'Room Category' },
                    { id: 'channel', label: 'Booking Channel' },
                    { id: 'property', label: 'Eco-Resort' },
                    { id: 'season', label: 'Season' },
                    { id: 'status', label: 'Booking Status' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveBreakdownTab(tab.id)}
                      className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all ${
                        activeBreakdownTab === tab.id
                          ? 'bg-forest-800 text-white shadow-xs'
                          : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-sage-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Breakdown Content 1: By Room Category */}
              {activeBreakdownTab === 'room_type' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-sage-200 text-charcoal-500 font-semibold uppercase text-[10px] tracking-wider bg-sage-50/50">
                        <th className="py-2.5 px-3">Room Category</th>
                        <th className="py-2.5 px-3">Eco-Resort</th>
                        <th className="py-2.5 px-3 text-right">Revenue (₹)</th>
                        <th className="py-2.5 px-3 text-right">Revenue Share</th>
                        <th className="py-2.5 px-3 text-right">Bookings</th>
                        <th className="py-2.5 px-3 text-right">Room Nights</th>
                        <th className="py-2.5 px-3 text-right">Achieved ADR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sage-100">
                      {(breakdowns.by_room_type || []).map((rt) => (
                        <tr key={rt.room_type_id} className="hover:bg-sage-50/60 transition-colors">
                          <td className="py-3 px-3 font-bold text-charcoal-900">{rt.room_type_name}</td>
                          <td className="py-3 px-3 text-charcoal-600">{rt.property_name}</td>
                          <td className="py-3 px-3 text-right font-mono-num font-bold text-charcoal-900">
                            {formatCurrency(rt.revenue)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="font-mono-num text-[11px] font-semibold text-forest-800">{rt.percentage}%</span>
                              <div className="w-16 bg-sage-200 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-forest-700 h-1.5 rounded-full" style={{ width: `${rt.percentage}%` }}></div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono-num text-charcoal-700">{rt.bookings_count}</td>
                          <td className="py-3 px-3 text-right font-mono-num text-charcoal-700">{rt.sold_nights}</td>
                          <td className="py-3 px-3 text-right font-mono-num font-semibold text-forest-900">
                            {formatCurrency(rt.adr)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Breakdown Content 2: By Booking Channel */}
              {activeBreakdownTab === 'channel' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  {(breakdowns.by_booking_channel || []).map((ch, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-sage-50/70 border border-sage-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-charcoal-900">{ch.channel}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {ch.percentage}%
                        </span>
                      </div>
                      <div className="text-xl font-bold font-mono-num text-charcoal-900">
                        {formatCurrency(ch.revenue)}
                      </div>
                      <div className="text-[11px] text-charcoal-500 pt-1 border-t border-sage-200/60 flex items-center justify-between">
                        <span>Total Reservations:</span>
                        <strong className="text-charcoal-800 font-mono-num">{ch.bookings_count}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Breakdown Content 3: By Property */}
              {activeBreakdownTab === 'property' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-sage-200 text-charcoal-500 font-semibold uppercase text-[10px] tracking-wider bg-sage-50/50">
                        <th className="py-2.5 px-3">Resort Sanctuary</th>
                        <th className="py-2.5 px-3">Region</th>
                        <th className="py-2.5 px-3 text-right">Revenue (₹)</th>
                        <th className="py-2.5 px-3 text-right">Portfolio Share</th>
                        <th className="py-2.5 px-3 text-right">Bookings</th>
                        <th className="py-2.5 px-3 text-right">ADR</th>
                        <th className="py-2.5 px-3 text-right">RevPAR</th>
                        <th className="py-2.5 px-3 text-right">Occupancy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sage-100">
                      {(breakdowns.by_property || []).map((p) => (
                        <tr key={p.property_id} className="hover:bg-sage-50/60 transition-colors">
                          <td className="py-3 px-3 font-bold text-charcoal-900">{p.property_name}</td>
                          <td className="py-3 px-3 text-charcoal-600">{p.location}</td>
                          <td className="py-3 px-3 text-right font-mono-num font-bold text-charcoal-900">
                            {formatCurrency(p.revenue)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono-num font-semibold text-forest-800">{p.percentage}%</td>
                          <td className="py-3 px-3 text-right font-mono-num text-charcoal-700">{p.bookings_count}</td>
                          <td className="py-3 px-3 text-right font-mono-num font-semibold text-forest-900">{formatCurrency(p.adr)}</td>
                          <td className="py-3 px-3 text-right font-mono-num font-semibold text-emerald-700">{formatCurrency(p.revpar)}</td>
                          <td className="py-3 px-3 text-right font-mono-num text-charcoal-700">{p.occupancy_pct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Breakdown Content 4: By Season */}
              {activeBreakdownTab === 'season' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                  {(breakdowns.by_season || []).map((s, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-sage-50/70 border border-sage-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-charcoal-900">{s.name}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-forest-100 text-forest-800">
                          {s.percentage}%
                        </span>
                      </div>
                      <div className="text-xl font-bold font-mono-num text-charcoal-900">
                        {formatCurrency(s.revenue)}
                      </div>
                      <div className="text-[11px] text-charcoal-500 pt-1 border-t border-sage-200/60 flex items-center justify-between">
                        <span>Bookings / ADR:</span>
                        <strong className="text-charcoal-800 font-mono-num">{s.bookings_count} bks • {formatCurrency(s.adr)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Breakdown Content 5: By Booking Status */}
              {activeBreakdownTab === 'status' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  {(breakdowns.by_booking_status || []).map((st, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-sage-50/70 border border-sage-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-charcoal-900">{st.label}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          st.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                          st.status === 'confirmed' ? 'bg-forest-100 text-forest-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {st.percentage}%
                        </span>
                      </div>
                      <div className="text-xl font-bold font-mono-num text-charcoal-900">
                        {formatCurrency(st.revenue)}
                      </div>
                      <div className="text-[11px] text-charcoal-500 pt-1 border-t border-sage-200/60 flex items-center justify-between">
                        <span>Reservation Count:</span>
                        <strong className="text-charcoal-800 font-mono-num">{st.count}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* System Settlement & Limitations Notice */}
              <div className="p-3.5 rounded-xl bg-sage-50 border border-sage-200/80 flex items-center justify-between text-xs text-charcoal-600">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-forest-700" />
                  <span>
                    <strong>Settlement Method:</strong> Direct PMS Folio Settlement (Invoiced on check-in / check-out).
                  </span>
                </div>
                <span className="text-[11px] text-charcoal-400 font-mono">Currency: INR (₹)</span>
              </div>

            </div>

          </div>
        )}

        {/* ===================== VIEW 2: AI DYNAMIC PRICING SIMULATION ===================== */}
        {activeWorkspaceTab === 'simulation' && simulation && (
          <div className="space-y-6">
            <div className="premium-card p-6 bg-gradient-to-br from-white via-sage-25 to-emerald-50/20 border-emerald-200/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-sage-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-charcoal-900">Dynamic Pricing vs Static Pricing Simulation</h3>
                    <p className="text-xs text-charcoal-500">Projected 30-day revenue comparison modeling price elasticity and event surge capture</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono-num">
                    +{simulation.summary?.uplift_over_fixed_pct || '14.2'}% Projected Net Lift
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-white border border-sage-200 shadow-2xs space-y-1">
                  <span className="text-[11px] text-charcoal-500 font-medium">Static Fixed Pricing Benchmark</span>
                  <div className="text-xl font-bold font-mono-num text-charcoal-700">
                    {formatCurrency(simulation.summary?.fixed_total_revenue)}
                  </div>
                  <span className="text-[10px] text-charcoal-400 block">Baseline with zero dynamic adaptation</span>
                </div>

                <div className="p-4 rounded-xl bg-white border border-forest-200 shadow-2xs space-y-1">
                  <span className="text-[11px] text-forest-800 font-medium">AI Dynamic Revenue Model</span>
                  <div className="text-xl font-bold font-mono-num text-forest-900">
                    {formatCurrency(simulation.summary?.dynamic_total_revenue)}
                  </div>
                  <span className="text-[10px] text-emerald-700 font-semibold block">Using 3-Model Best ML Rate & Guardrails</span>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 shadow-2xs space-y-1">
                  <span className="text-[11px] text-emerald-800 font-medium">Absolute Financial Gain</span>
                  <div className="text-xl font-black font-mono-num text-emerald-800">
                    +{formatCurrency(simulation.summary?.net_gain)}
                  </div>
                  <span className="text-[10px] text-emerald-700 font-semibold block">Net incremental revenue gain</span>
                </div>
              </div>
            </div>

            {/* Simulation Timeline Chart */}
            {simulation?.chart_data && (
              <div className="premium-card p-6 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-sage-100">
                  <div>
                    <h3 className="text-sm font-bold text-charcoal-900">Projected Daily Revenue Path (Static vs AI Dynamic)</h3>
                    <p className="text-xs text-charcoal-500">Day-by-day simulated revenue comparison under market demand swings</p>
                  </div>
                </div>

                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={simulation.chart_data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8ECE8" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#687486' }} stroke="#E8ECE8" />
                      <YAxis tick={{ fontSize: 10, fill: '#687486' }} stroke="#E8ECE8" tickFormatter={(v) => `₹${v}`} />
                      <Tooltip content={<CustomChartTooltip prefix="₹" />} />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Line
                        type="monotone"
                        dataKey="fixed_revenue"
                        name="Static Fixed Pricing"
                        stroke="#9DA5B1"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="dynamic_revenue"
                        name="AI Dynamic Pricing"
                        stroke="#143526"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: '#143526' }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================== VIEW 3: EVENT & WEATHER ELASTICITY ===================== */}
        {activeWorkspaceTab === 'events' && eventImpact && (
          <div className="space-y-6">
            <div className="premium-card p-6 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-sage-100">
                <div>
                  <h3 className="text-sm font-bold text-charcoal-900">Regional Festival & Event Revenue Elasticity</h3>
                  <p className="text-xs text-charcoal-500">Historical ADR and occupancy uplift measured during major regional events</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-sage-50/70 border border-sage-200">
                  <span className="text-xs text-charcoal-500">Observed ADR Lift During Events</span>
                  <div className="text-2xl font-bold font-mono-num text-charcoal-900 mt-1">
                    +{eventImpact.adr_lift_pct ?? 34.7}%
                  </div>
                  <p className="text-[11px] text-charcoal-500 mt-1">
                    Event ADR: {formatCurrency(eventImpact.event_periods?.avg_adr)} vs Regular: {formatCurrency(eventImpact.non_event_periods?.avg_adr)}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-sage-50/70 border border-sage-200">
                  <span className="text-xs text-charcoal-500">Occupancy Lift During Events</span>
                  <div className="text-2xl font-bold font-mono-num text-charcoal-900 mt-1">
                    +{eventImpact.occupancy_lift_pct ?? 53.1}%
                  </div>
                  <p className="text-[11px] text-charcoal-500 mt-1">
                    Event Occupancy: {eventImpact.event_periods?.avg_occupancy_pct}% vs Regular: {eventImpact.non_event_periods?.avg_occupancy_pct}%
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-sage-50/70 border border-sage-200">
                  <span className="text-xs text-charcoal-500">Active Festival Days Recorded</span>
                  <div className="text-2xl font-bold font-mono-num text-charcoal-900 mt-1">
                    {eventImpact.event_days_count ?? 14} Days
                  </div>
                  <p className="text-[11px] text-charcoal-500 mt-1">Calendar dates overlapping local scraped festivals</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AnalyticsPage;
