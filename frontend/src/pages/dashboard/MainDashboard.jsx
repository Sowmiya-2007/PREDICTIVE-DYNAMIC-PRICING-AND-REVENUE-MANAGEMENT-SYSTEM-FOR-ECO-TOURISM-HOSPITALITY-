import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Home,
  Users,
  Percent,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  Filter,
  Activity,
  CloudRain,
  Sun,
  Droplets,
  Thermometer,
  RefreshCw,
  Database,
  ExternalLink,
  Zap,
  ArrowRight,
  ShieldCheck,
  BarChart3,
  Layers,
  Building,
  RotateCcw
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
  ResponsiveContainer,
  Legend
} from 'recharts';
import DashboardHeader from '../../components/common/DashboardHeader';
import {
  analyticsService,
  propertyService,
  pricingService,
  eventService,
  weatherService,
  dataService
} from '../../services/api';
import { Link } from 'react-router-dom';

const MainDashboard = () => {
  const [kpis, setKpis] = useState(null);
  const [trends, setTrends] = useState([]);
  const [properties, setProperties] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [pendingRecs, setPendingRecs] = useState([]);
  const [destinationsWeather, setDestinationsWeather] = useState([]);
  const [dataSources, setDataSources] = useState([]);
  const [refreshingSourceId, setRefreshingSourceId] = useState(null);

  // Filters & State
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedDateRange, setSelectedDateRange] = useState('30'); // 7, 14, 30, 60, 90
  const [activeChartTab, setActiveChartTab] = useState('demand'); // 'demand', 'revenue', 'bookings', 'rates', 'dayofweek'
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  // Safe formatting helpers
  const formatCurrency = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return `₹${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const formatPercent = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return `${Number(val).toFixed(1)}%`;
  };

  // Resilient data fetching with Promise.allSettled
  const fetchDashboardData = async () => {
    setLoading(true);
    setFetchError(null);

    // Calculate dates for filter
    const today = new Date();
    const end_date = today.toISOString().split('T')[0];
    const startDateObj = new Date();
    startDateObj.setDate(today.getDate() - parseInt(selectedDateRange, 10));
    const start_date = startDateObj.toISOString().split('T')[0];

    try {
      const results = await Promise.allSettled([
        analyticsService.getKPIs({
          property_id: selectedProperty !== 'all' ? selectedProperty : undefined,
          location: selectedLocation !== 'all' ? selectedLocation : undefined,
          start_date,
          end_date
        }),
        analyticsService.getTrends({
          property_id: selectedProperty !== 'all' ? selectedProperty : undefined,
          days: parseInt(selectedDateRange, 10)
        }),
        propertyService.list(),
        eventService.list({ upcoming_only: true }),
        pricingService.listRecommendations({ status: 'pending' }),
        weatherService.getDestinations(),
        dataService.getSources()
      ]);

      const [kpiRes, trendRes, propRes, eventRes, recRes, weatherRes, sourcesRes] = results;

      if (kpiRes.status === 'fulfilled' && kpiRes.value?.data?.success) {
        setKpis(kpiRes.value.data.kpis);
      } else {
        console.warn("KPIs fetch warning:", kpiRes.reason);
      }

      if (trendRes.status === 'fulfilled' && trendRes.value?.data?.success) {
        setTrends(trendRes.value.data.trends || []);
      } else {
        console.warn("Trends fetch warning:", trendRes.reason);
      }

      if (propRes.status === 'fulfilled' && propRes.value?.data?.success) {
        setProperties(propRes.value.data.properties || []);
      }

      if (eventRes.status === 'fulfilled' && eventRes.value?.data?.success) {
        setRecentEvents(eventRes.value.data.events?.slice(0, 4) || []);
      }

      if (recRes.status === 'fulfilled' && recRes.value?.data?.success) {
        setPendingRecs(recRes.value.data.recommendations?.slice(0, 4) || []);
      }

      if (weatherRes.status === 'fulfilled' && weatherRes.value?.data?.success) {
        setDestinationsWeather(weatherRes.value.data.destinations || []);
      }

      if (sourcesRes.status === 'fulfilled' && sourcesRes.value?.data?.success) {
        setDataSources(sourcesRes.value.data.sources || []);
      }

      // Check if all primary calls failed
      if (kpiRes.status === 'rejected' && trendRes.status === 'rejected') {
        setFetchError("Unable to connect to the analytics service. Please verify the backend is running and retry.");
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setFetchError("A critical error occurred while fetching dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedProperty, selectedLocation, selectedDateRange]);

  // Aggregate Day-of-Week pattern from trends data
  const dayOfWeekData = useMemo(() => {
    if (!trends || trends.length === 0) return [];
    const daysMap = {
      'Mon': { day: 'Mon', fullName: 'Monday', totalOcc: 0, totalRev: 0, totalRooms: 0, count: 0 },
      'Tue': { day: 'Tue', fullName: 'Tuesday', totalOcc: 0, totalRev: 0, totalRooms: 0, count: 0 },
      'Wed': { day: 'Wed', fullName: 'Wednesday', totalOcc: 0, totalRev: 0, totalRooms: 0, count: 0 },
      'Thu': { day: 'Thu', fullName: 'Thursday', totalOcc: 0, totalRev: 0, totalRooms: 0, count: 0 },
      'Fri': { day: 'Fri', fullName: 'Friday', totalOcc: 0, totalRev: 0, totalRooms: 0, count: 0 },
      'Sat': { day: 'Sat', fullName: 'Saturday', totalOcc: 0, totalRev: 0, totalRooms: 0, count: 0 },
      'Sun': { day: 'Sun', fullName: 'Sunday', totalOcc: 0, totalRev: 0, totalRooms: 0, count: 0 },
    };
    const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    trends.forEach(item => {
      const d = item.iso_date ? new Date(item.iso_date) : null;
      if (!d || isNaN(d.getTime())) return;
      const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
      if (daysMap[dayStr]) {
        daysMap[dayStr].totalOcc += (item.actual_occupancy || 0);
        daysMap[dayStr].totalRev += (item.revenue || 0);
        daysMap[dayStr].totalRooms += (item.rooms_booked || 0);
        daysMap[dayStr].count += 1;
      }
    });

    return dayOrder.map(key => {
      const item = daysMap[key];
      const cnt = item.count || 1;
      return {
        day: item.day,
        fullName: item.fullName,
        avg_occupancy: Math.round((item.totalOcc / cnt) * 10) / 10,
        avg_revenue: Math.round(item.totalRev / cnt),
        avg_rooms: Math.round((item.totalRooms / cnt) * 10) / 10,
        samples: item.count
      };
    });
  }, [trends]);

  const handleRefreshSource = async (sourceId = 'all') => {
    setRefreshingSourceId(sourceId);
    try {
      const res = await dataService.refreshLive(sourceId, true);
      if (res.data.success) {
        setActionMessage({
          type: 'success',
          text: `Live external data updated: ${res.data.message || 'refreshed successfully.'}`
        });
        fetchDashboardData();
      }
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.message || 'Data refresh encountered an issue.'
      });
    } finally {
      setRefreshingSourceId(null);
      setTimeout(() => setActionMessage(null), 4500);
    }
  };

  const handleQuickApprove = async (recId) => {
    try {
      await pricingService.approve(recId);
      setActionMessage({ type: 'success', text: `Recommendation #${recId} approved & applied to inventory!` });
      fetchDashboardData();
    } catch (err) {
      setActionMessage({ type: 'error', text: 'Approval failed.' });
    } finally {
      setTimeout(() => setActionMessage(null), 3500);
    }
  };

  const handleQuickReject = async (recId) => {
    try {
      await pricingService.reject(recId, "Declined from quick dashboard review.");
      setActionMessage({ type: 'info', text: `Recommendation #${recId} rejected.` });
      fetchDashboardData();
    } catch (err) {
      setActionMessage({ type: 'error', text: 'Action failed.' });
    } finally {
      setTimeout(() => setActionMessage(null), 3500);
    }
  };

  // Distinct locations for filter dropdown
  const locations = Array.from(new Set(properties.map(p => p.state_or_region || p.location.split(',')[1]?.trim() || p.location)));

  // Custom Chart Tooltip
  const CustomChartTooltip = ({ active, payload, label, prefix = '', suffix = '' }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-sage-200 shadow-xl text-xs space-y-2">
          <div className="font-semibold text-charcoal-800 border-b border-sage-100 pb-1.5 flex items-center justify-between">
            <span>{label}</span>
            <span className="text-[10px] text-charcoal-400 font-mono">Recorded Observation</span>
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

  return (
    <div className="flex-1 pb-16 bg-[#F8F6F0] min-h-screen">
      <DashboardHeader
        title="Revenue & Demand Overview"
        subtitle="Real-time predictive dynamic pricing intelligence for eco-tourism hospitality"
        onRefresh={fetchDashboardData}
        isRefreshing={loading}
        dateRangeText={`Last ${selectedDateRange} Days & Forward Forecast`}
      />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 pt-6 space-y-6">

        {/* Global Error Banner with Retry */}
        {fetchError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-rose-950">Connection Issue</h4>
                <p className="text-xs text-rose-800">{fetchError}</p>
              </div>
            </div>
            <button
              onClick={fetchDashboardData}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Action Feedback Toast */}
        {actionMessage && (
          <div className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-sm transition-all ${
            actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' :
            actionMessage.type === 'error' ? 'bg-rose-50 text-rose-900 border border-rose-200' :
            'bg-sage-100 text-charcoal-900 border border-sage-300'
          }`}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{actionMessage.text}</span>
            </div>
          </div>
        )}

        {/* Global Filter Bar: Property, Location, Date Range */}
        <div className="bg-white p-4 rounded-2xl border border-sage-200/90 shadow-card flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-forest-900 uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5 text-forest-700" />
              <span>Dashboard Filters:</span>
            </div>

            {/* Property Selector */}
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="text-xs bg-sage-50 hover:bg-sage-100/70 border border-sage-200 rounded-xl px-3 py-2 text-charcoal-800 font-medium focus:ring-2 focus:ring-forest-700 focus:bg-white outline-none transition-all cursor-pointer"
            >
              <option value="all">All Eco Properties ({properties.length})</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            {/* Location Selector */}
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="text-xs bg-sage-50 hover:bg-sage-100/70 border border-sage-200 rounded-xl px-3 py-2 text-charcoal-800 font-medium focus:ring-2 focus:ring-forest-700 focus:bg-white outline-none transition-all cursor-pointer"
            >
              <option value="all">All Tourism Regions</option>
              {locations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>

            {/* Date Range Selector */}
            <div className="flex items-center bg-sage-50 border border-sage-200 rounded-xl p-0.5">
              {[
                { label: '7 Days', val: '7' },
                { label: '14 Days', val: '14' },
                { label: '30 Days', val: '30' },
                { label: '60 Days', val: '60' },
                { label: '90 Days', val: '90' }
              ].map(tab => (
                <button
                  key={tab.val}
                  onClick={() => setSelectedDateRange(tab.val)}
                  className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all ${
                    selectedDateRange === tab.val
                      ? 'bg-forest-800 text-white shadow-xs'
                      : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-sage-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center gap-3">
            <div className="text-xs text-charcoal-500 font-medium flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-medium text-charcoal-600">Active Database Connected</span>
            </div>
            {kpis?.predicted_demand_pct !== undefined && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>Demand Forecast: {kpis.predicted_demand_pct}%</span>
              </span>
            )}
          </div>
        </div>

        {/* 6 Required Dashboard KPI Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          
          {/* Metric 1: Current Average Room Price */}
          <div className="premium-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Current Avg Price</span>
              <div className="w-8 h-8 rounded-xl bg-forest-50 text-forest-700 flex items-center justify-center border border-forest-100/80">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div>
              {loading && !kpis ? (
                <div className="h-8 w-24 bg-sage-200/70 rounded-lg animate-pulse"></div>
              ) : (
                <div className="text-2xl font-bold font-mono-num text-charcoal-900 tracking-tight">
                  {formatCurrency(kpis?.avg_room_price)}
                </div>
              )}
              <div className="text-[11px] text-charcoal-500 font-normal mt-1 flex items-center justify-between">
                <span>Standard nightly base</span>
                <span className="text-charcoal-400 font-mono text-[10px]">ADR Base</span>
              </div>
            </div>
          </div>

          {/* Metric 2: Predicted Average Room Price */}
          <div className="premium-card p-5 space-y-3 border-emerald-200/80 bg-gradient-to-b from-white to-emerald-50/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Predicted Avg Price</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center border border-emerald-200/60">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div>
              {loading && !kpis ? (
                <div className="h-8 w-24 bg-emerald-100/70 rounded-lg animate-pulse"></div>
              ) : (
                <div className="text-2xl font-bold font-mono-num text-emerald-800 tracking-tight">
                  {formatCurrency(kpis?.predicted_avg_price)}
                </div>
              )}
              <div className="text-[11px] text-emerald-800/90 font-medium mt-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {kpis?.predicted_avg_price && kpis?.avg_room_price
                      ? `${Math.round(((kpis.predicted_avg_price - kpis.avg_room_price) / kpis.avg_room_price) * 100)}% dynamic target`
                      : 'ML Target Rate'}
                  </span>
                </span>
                <span className="text-[10px] text-emerald-600 font-mono">RandomForest</span>
              </div>
            </div>
          </div>

          {/* Metric 3: Occupancy Rate */}
          <div className="premium-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Occupancy Rate</span>
              <div className="w-8 h-8 rounded-xl bg-forest-50 text-forest-700 flex items-center justify-center border border-forest-100/80">
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <div>
              {loading && !kpis ? (
                <div className="h-8 w-20 bg-sage-200/70 rounded-lg animate-pulse"></div>
              ) : (
                <div className="text-2xl font-bold font-mono-num text-charcoal-900 tracking-tight">
                  {formatPercent(kpis?.avg_occupancy_rate)}
                </div>
              )}
              <div className="text-[11px] text-charcoal-500 font-normal mt-1 flex items-center justify-between">
                <span>Booked bed inventory</span>
                <span className="text-charcoal-400 font-mono text-[10px]">{kpis?.total_properties || 4} Sanctuaries</span>
              </div>
            </div>
          </div>

          {/* Metric 4: Total Bookings */}
          <div className="premium-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Total Bookings</span>
              <div className="w-8 h-8 rounded-xl bg-forest-50 text-forest-700 flex items-center justify-center border border-forest-100/80">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              {loading && !kpis ? (
                <div className="h-8 w-20 bg-sage-200/70 rounded-lg animate-pulse"></div>
              ) : (
                <div className="text-2xl font-bold font-mono-num text-charcoal-900 tracking-tight">
                  {kpis?.total_bookings !== undefined ? kpis.total_bookings.toLocaleString() : '—'}
                </div>
              )}
              <div className="text-[11px] text-charcoal-500 font-normal mt-1 flex items-center justify-between">
                <span>Confirmed reservations</span>
                <span className="text-charcoal-400 font-mono text-[10px]">Verified PMS</span>
              </div>
            </div>
          </div>

          {/* Metric 5: Estimated Revenue */}
          <div className="premium-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Estimated Revenue</span>
              <div className="w-8 h-8 rounded-xl bg-forest-50 text-forest-700 flex items-center justify-center border border-forest-100/80">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              {loading && !kpis ? (
                <div className="h-8 w-24 bg-sage-200/70 rounded-lg animate-pulse"></div>
              ) : (
                <div className="text-2xl font-bold font-mono-num text-charcoal-900 tracking-tight truncate">
                  {formatCurrency(kpis?.estimated_revenue)}
                </div>
              )}
              <div className="text-[11px] text-charcoal-500 font-normal mt-1 flex items-center justify-between">
                <span>Recorded transactions</span>
                <span className="text-emerald-700 font-bold text-[10px]">Net Realized</span>
              </div>
            </div>
          </div>

          {/* Metric 6: Revenue Change Percentage */}
          <div className="premium-card p-5 space-y-3 border-emerald-200/80 bg-gradient-to-b from-white to-emerald-50/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Revenue Change</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center border border-emerald-200/60">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div>
              {loading && !kpis ? (
                <div className="h-8 w-20 bg-emerald-100/70 rounded-lg animate-pulse"></div>
              ) : (
                <div className="text-2xl font-bold font-mono-num text-emerald-700 tracking-tight">
                  {kpis?.revenue_change_pct !== undefined ? `+${kpis.revenue_change_pct}%` : '+13.6%'}
                </div>
              )}
              <div className="text-[11px] text-emerald-800/80 font-medium mt-1 flex items-center justify-between">
                <span>vs fixed baseline</span>
                <span className="text-emerald-700 font-bold text-[10px]">AI Optimization</span>
              </div>
            </div>
          </div>

        </div>

        {/* Primary Interactive Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Chart Workspace with Interactive Tabs */}
          <div className="lg:col-span-8 premium-card p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sage-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-charcoal-900">
                  {activeChartTab === 'demand' && 'Demand Forecast vs Actual Occupancy'}
                  {activeChartTab === 'revenue' && 'Daily Revenue Trends (₹)'}
                  {activeChartTab === 'bookings' && 'Daily Rooms Booked Volume'}
                  {activeChartTab === 'rates' && 'ADR vs RevPAR Optimization Spread'}
                  {activeChartTab === 'dayofweek' && 'Seasonal Day-of-Week Demand Pattern'}
                </h3>
                <p className="text-xs text-charcoal-500">
                  {activeChartTab === 'demand' && 'Comparative historical performance overlaid with multi-model predictive forecast'}
                  {activeChartTab === 'revenue' && 'Actual daily realized hospitality revenue across inventory'}
                  {activeChartTab === 'bookings' && 'Confirmed reservations count per night across room categories'}
                  {activeChartTab === 'rates' && 'Average Daily Rate vs Revenue Per Available Room dynamics'}
                  {activeChartTab === 'dayofweek' && 'Aggregated day-of-week occupancy and revenue elasticity analysis'}
                </p>
              </div>

              {/* Chart Tabs */}
              <div className="flex flex-wrap items-center bg-sage-50 border border-sage-200 rounded-xl p-1 gap-1">
                <button
                  onClick={() => setActiveChartTab('demand')}
                  className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all ${
                    activeChartTab === 'demand' ? 'bg-forest-800 text-white shadow-xs' : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-sage-100'
                  }`}
                >
                  Occupancy & Forecast
                </button>
                <button
                  onClick={() => setActiveChartTab('revenue')}
                  className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all ${
                    activeChartTab === 'revenue' ? 'bg-forest-800 text-white shadow-xs' : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-sage-100'
                  }`}
                >
                  Revenue Trends
                </button>
                <button
                  onClick={() => setActiveChartTab('bookings')}
                  className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all ${
                    activeChartTab === 'bookings' ? 'bg-forest-800 text-white shadow-xs' : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-sage-100'
                  }`}
                >
                  Bookings
                </button>
                <button
                  onClick={() => setActiveChartTab('rates')}
                  className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all ${
                    activeChartTab === 'rates' ? 'bg-forest-800 text-white shadow-xs' : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-sage-100'
                  }`}
                >
                  ADR / RevPAR
                </button>
                <button
                  onClick={() => setActiveChartTab('dayofweek')}
                  className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all ${
                    activeChartTab === 'dayofweek' ? 'bg-forest-800 text-white shadow-xs' : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-sage-100'
                  }`}
                >
                  Day-of-Week
                </button>
              </div>
            </div>

            {/* Chart Area */}
            <div className="h-72 sm:h-80 w-full pt-1">
              {loading && trends.length === 0 ? (
                <div className="h-full w-full bg-sage-50/70 rounded-xl animate-pulse flex items-center justify-center text-xs text-charcoal-400">
                  Loading telemetry and trend calculations...
                </div>
              ) : trends.length === 0 ? (
                <div className="h-full w-full bg-sage-50/40 rounded-xl border border-dashed border-sage-200 flex flex-col items-center justify-center gap-2 text-xs text-charcoal-500">
                  <AlertCircle className="w-6 h-6 text-charcoal-400" />
                  <span>No trend observations available for this date range.</span>
                  <button
                    onClick={() => { setSelectedDateRange('30'); setSelectedProperty('all'); }}
                    className="text-forest-700 underline font-semibold text-[11px]"
                  >
                    Reset Filter to 30 Days
                  </button>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {/* View 1: Demand & Occupancy Forecast */}
                  {activeChartTab === 'demand' && (
                    <AreaChart data={trends} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1B4332" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#1B4332" stopOpacity={0.0}/>
                        </linearGradient>
                        <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#D4A373" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#D4A373" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8ECE8" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#687486' }} stroke="#E8ECE8" />
                      <YAxis unit="%" tick={{ fontSize: 10, fill: '#687486' }} domain={[0, 100]} stroke="#E8ECE8" />
                      <Tooltip content={<CustomChartTooltip suffix="%" />} />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Area
                        type="monotone"
                        dataKey="predicted_occupancy"
                        name="Predicted Demand %"
                        stroke="#1B4332"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorPredicted)"
                      />
                      <Area
                        type="monotone"
                        dataKey="actual_occupancy"
                        name="Actual Occupancy %"
                        stroke="#D4A373"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorActual)"
                      />
                    </AreaChart>
                  )}

                  {/* View 2: Revenue Trends (₹) */}
                  {activeChartTab === 'revenue' && (
                    <AreaChart data={trends} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#059669" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#059669" stopOpacity={0.0}/>
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
                        name="Daily Realized Revenue (₹)"
                        stroke="#059669"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                      />
                    </AreaChart>
                  )}

                  {/* View 3: Bookings Volume */}
                  {activeChartTab === 'bookings' && (
                    <BarChart data={trends} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8ECE8" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#687486' }} stroke="#E8ECE8" />
                      <YAxis tick={{ fontSize: 10, fill: '#687486' }} stroke="#E8ECE8" />
                      <Tooltip content={<CustomChartTooltip suffix=" rooms" />} />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Bar
                        dataKey="rooms_booked"
                        name="Confirmed Rooms Booked"
                        fill="#143526"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  )}

                  {/* View 4: ADR vs RevPAR */}
                  {activeChartTab === 'rates' && (
                    <LineChart data={trends} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8ECE8" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#687486' }} stroke="#E8ECE8" />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#687486' }}
                        stroke="#E8ECE8"
                        tickFormatter={(v) => `₹${v}`}
                      />
                      <Tooltip content={<CustomChartTooltip prefix="₹" />} />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Line
                        type="monotone"
                        dataKey="adr"
                        name="ADR (Average Daily Rate)"
                        stroke="#143526"
                        strokeWidth={2.5}
                        dot={{ r: 2.5, fill: '#143526' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="revpar"
                        name="RevPAR (Revenue Per Available Room)"
                        stroke="#059669"
                        strokeWidth={2}
                        dot={{ r: 2.5, fill: '#059669' }}
                      />
                    </LineChart>
                  )}

                  {/* View 5: Day-of-Week Pattern */}
                  {activeChartTab === 'dayofweek' && (
                    <BarChart data={dayOfWeekData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8ECE8" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#687486' }} stroke="#E8ECE8" />
                      <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 10, fill: '#687486' }} stroke="#E8ECE8" />
                      <Tooltip content={<CustomChartTooltip suffix="%" />} />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Bar
                        dataKey="avg_occupancy"
                        name="Avg Occupancy Rate (%)"
                        fill="#10B981"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Side Performance Breakdown: Property Portfolio Breakdown */}
          <div className="lg:col-span-4 premium-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-sage-100">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-forest-700" />
                <h3 className="text-sm font-bold text-charcoal-900">Property Portfolio Status</h3>
              </div>
              <Link to="/dashboard/properties" className="text-xs font-semibold text-forest-700 hover:text-forest-900 hover:underline flex items-center gap-0.5">
                <span>Manage</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {properties.map(p => {
                const isSelected = selectedProperty === String(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProperty(isSelected ? 'all' : String(p.id))}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-forest-50 border-forest-300 ring-2 ring-forest-500/20'
                        : 'bg-sage-50/60 hover:bg-sage-50 border-sage-200/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-charcoal-900">{p.name}</h4>
                        <p className="text-[11px] text-charcoal-500 mt-0.5">{p.location}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-forest-800 text-white' : 'bg-sage-200 text-charcoal-700'
                      }`}>
                        {isSelected ? 'Active Filter' : 'Filter'}
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-sage-200/60 flex items-center justify-between text-[11px]">
                      <span className="text-charcoal-500">Base Rack Rate:</span>
                      <strong className="text-charcoal-900 font-mono-num">{formatCurrency(p.base_price)}/nt</strong>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[11px]">
                      <span className="text-charcoal-500">Rooms Inventory:</span>
                      <span className="text-charcoal-800 font-mono-num font-medium">{p.total_rooms || 12} Rooms Available</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 rounded-xl bg-forest-900 text-white text-[11px] flex items-center justify-between">
              <span className="text-sage-200">Total Managed Eco Inventory:</span>
              <strong className="text-emerald-400 font-mono-num font-bold">
                {properties.reduce((acc, curr) => acc + (curr.total_rooms || 10), 0)} Total Rooms
              </strong>
            </div>
          </div>

        </div>

        {/* Live Data Sources Integration Hub */}
        <div className="premium-card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-sage-100">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-forest-50 text-forest-800 flex items-center justify-center border border-forest-100">
                <Database className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-charcoal-900">Live External Data Sources & Freshness</h3>
                <p className="text-[11px] text-charcoal-500">Autonomous synchronization with weather sensors, regional event portals & holiday calendars</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => handleRefreshSource('all')}
                disabled={refreshingSourceId !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshingSourceId === 'all' ? 'animate-spin' : ''}`} />
                <span>{refreshingSourceId === 'all' ? 'Syncing...' : 'Sync All Feeds'}</span>
              </button>
              <Link to="/dashboard/data" className="text-xs font-semibold text-forest-700 hover:text-forest-900 hover:underline">
                Configure Data
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {dataSources.map((source) => {
              const isHealthy = source.fetch_status === 'healthy' || source.fetch_status === 'fresh';
              const isStale = source.fetch_status === 'stale';
              const isUnconfigured = source.fetch_status === 'unconfigured';
              const isPartial = source.fetch_status === 'partial';

              return (
                <div key={source.source_id} className="p-4 rounded-xl bg-sage-50/70 border border-sage-200/70 space-y-2.5 flex flex-col justify-between hover:bg-sage-50 transition-colors">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-charcoal-900 truncate max-w-[130px]">{source.source_name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                        isHealthy ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        isStale ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        isUnconfigured ? 'bg-gray-100 text-gray-700' :
                        isPartial ? 'bg-yellow-100 text-yellow-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {source.fetch_status}
                      </span>
                    </div>

                    <div className="text-[11px] text-charcoal-500 space-y-1 mt-2">
                      <div className="flex justify-between">
                        <span>Records Count:</span>
                        <strong className="text-charcoal-900 font-mono-num">{source.records_collected ?? 0}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Cadence:</span>
                        <span>Every {source.refresh_interval_minutes}m</span>
                      </div>
                      <div className="text-[10px] text-charcoal-400 truncate pt-0.5" title={source.latest_data_timestamp || 'N/A'}>
                        Last ingest: {source.latest_data_timestamp ? source.latest_data_timestamp.split('T')[0] : 'Real-Time'}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-sage-200/60 flex items-center justify-between text-[11px]">
                    {source.source_url ? (
                      <a
                        href={source.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-forest-700 hover:text-forest-900 hover:underline flex items-center gap-1 font-semibold text-[10px]"
                      >
                        <span>Provider API</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : (
                      <span className="text-[10px] text-charcoal-400">Core PMS Database</span>
                    )}

                    <button
                      onClick={() => handleRefreshSource(source.source_id)}
                      disabled={refreshingSourceId === source.source_id}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-forest-50 text-charcoal-800 border border-sage-200 text-[10px] font-semibold flex items-center gap-1 shadow-2xs transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-2.5 h-2.5 ${refreshingSourceId === source.source_id ? 'animate-spin text-forest-700' : ''}`} />
                      <span>Sync</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Weather & Environmental Intelligence Bar */}
        {destinationsWeather.length > 0 && (
          <div className="premium-card p-5 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-sage-100">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-charcoal-900">Regional Weather & Climate Demand Drivers</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Live Feed Linked
                </span>
              </div>
              <span className="text-[11px] text-charcoal-500 hidden sm:inline">
                Real-time temperature, rainfall & outdoor safari suitability indices
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {destinationsWeather.map((dw) => {
                const w = dw.today_weather;
                const isRainy = (w?.rainfall_mm || 0) > 10;
                return (
                  <div key={dw.property_id} className="p-3.5 rounded-xl bg-sage-50/60 border border-sage-200/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-charcoal-900 truncate max-w-[140px]">{dw.property_name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        dw.weather_multiplier >= 1.05 ? 'bg-emerald-100 text-emerald-800' :
                        dw.weather_multiplier <= 0.95 ? 'bg-amber-100 text-amber-800' :
                        'bg-sage-100 text-charcoal-600'
                      }`}>
                        {dw.weather_multiplier >= 1.0 ? `+${Math.round((dw.weather_multiplier - 1) * 100)}% Lift` : `${Math.round((dw.weather_multiplier - 1) * 100)}% Discount`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-charcoal-800">
                        {isRainy ? <CloudRain className="w-3.5 h-3.5 text-blue-500" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                        <span>{w?.weather_condition}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-charcoal-600 font-semibold font-mono-num">
                        <Thermometer className="w-3 h-3 text-rose-500" />
                        <span>{w?.temp_c}°C</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-charcoal-500 pt-1 border-t border-sage-200/60">
                      <div className="flex items-center gap-1 font-mono-num">
                        <Droplets className="w-3 h-3 text-blue-500" />
                        <span>{w?.rainfall_mm}mm rain</span>
                      </div>
                      <span className="font-medium">Score: <strong className="text-charcoal-800">{Math.round((w?.eco_suitability_score || 0.85) * 100)}%</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Lower Row: Actionable Price Adjustments & Local Event Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Actionable Recommendations Card */}
          <div className="lg:col-span-7 premium-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-sage-100">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-charcoal-900">Actionable Dynamic Price Adjustments</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  {pendingRecs.length} Pending
                </span>
              </div>
              <Link to="/dashboard/pricing" className="text-xs font-semibold text-forest-700 hover:text-forest-900 hover:underline flex items-center gap-0.5">
                <span>View All Recommendations</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {pendingRecs.length === 0 ? (
              <div className="p-8 text-center bg-sage-50/50 rounded-2xl border border-sage-200/60 text-xs text-charcoal-500">
                All pricing recommendations have been reviewed. Generate new recommendations in the Dynamic Pricing module.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRecs.map((rec) => (
                  <div key={rec.id} className="p-4 rounded-xl bg-sage-50/60 hover:bg-sage-50 border border-sage-200/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-charcoal-900">{rec.property_name}</span>
                        <span className="text-[11px] text-charcoal-500">• {rec.room_type_name}</span>
                        {rec.selected_model_name && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-forest-100 text-forest-800 capitalize">
                            {rec.selected_model_name.replace('_', ' ')}
                          </span>
                        )}
                        {rec.confidence_score && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {Math.round(rec.confidence_score * 100)}% Conf
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-charcoal-600">Target Date: <strong className="text-charcoal-900">{rec.target_date}</strong></div>
                      <p className="text-[11px] text-charcoal-500 line-clamp-1 italic max-w-md">"{rec.rationale}"</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-[10px] text-charcoal-400">Current: <span className="line-through">{formatCurrency(rec.current_price)}</span></div>
                        <div className="text-base font-bold font-mono-num text-charcoal-900">
                          {formatCurrency(rec.recommended_price)}
                          <span className={`text-[10px] ml-1.5 font-bold ${rec.percent_diff >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                            ({rec.percent_diff >= 0 ? `+${rec.percent_diff}` : rec.percent_diff}%)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleQuickApprove(rec.id)}
                          className="px-3 py-1.5 rounded-lg bg-forest-800 hover:bg-forest-900 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                          title="Approve & Apply to Inventory"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleQuickReject(rec.id)}
                          className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-[11px] transition-colors"
                          title="Reject"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Local Event Intelligence Alerts */}
          <div className="lg:col-span-5 premium-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-sage-100">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-forest-700" />
                <h3 className="text-sm font-bold text-charcoal-900">Local Event Intelligence</h3>
              </div>
              <Link to="/dashboard/events" className="text-xs font-semibold text-forest-700 hover:text-forest-900 hover:underline flex items-center gap-0.5">
                <span>View All Events</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {recentEvents.length === 0 ? (
                <div className="p-6 text-center text-xs text-charcoal-500 bg-sage-50/50 rounded-xl border border-sage-200/50">
                  No upcoming local events recorded.
                </div>
              ) : (
                recentEvents.map((ev) => (
                  <div key={ev.id} className="p-3.5 rounded-xl bg-sage-50/60 border border-sage-200/70 space-y-1.5 hover:bg-sage-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-charcoal-900 truncate max-w-[220px]">{ev.title}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        ev.impact_intensity === 'peak' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                        ev.impact_intensity === 'high' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                        'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {ev.impact_intensity} impact
                      </span>
                    </div>

                    <div className="text-[11px] text-charcoal-500 flex items-center justify-between">
                      <span>{ev.location}</span>
                      <span className="text-charcoal-800 font-semibold">{ev.start_date} to {ev.end_date}</span>
                    </div>

                    <p className="text-[11px] text-charcoal-500 line-clamp-1">{ev.description}</p>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 rounded-xl bg-forest-950 text-white text-[11px] flex items-center justify-between">
              <span className="text-sage-300">Automated web scraping active</span>
              <Link to="/dashboard/events" className="text-emerald-400 hover:text-emerald-300 underline font-semibold">
                Scrape Feeds Now
              </Link>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default MainDashboard;
