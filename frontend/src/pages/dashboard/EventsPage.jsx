import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Globe2,
  RefreshCw,
  Plus,
  Filter,
  Search,
  ExternalLink,
  Clock,
  MapPin,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Radio,
  Activity
} from 'lucide-react';
import DashboardHeader from '../../components/common/DashboardHeader';
import { eventService } from '../../services/api';

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [sources, setSources] = useState([]);
  const [scrapingRuns, setScrapingRuns] = useState([]);
  const [selectedSource, setSelectedSource] = useState('kerala_tourism');
  const [isScraping, setIsScraping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');

  // Manual Add Form
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    event_category: 'festival',
    start_date: '',
    end_date: '',
    description: '',
    expected_footfall: 2500,
    impact_intensity: 'high',
    source_url: ''
  });

  const fetchEventsData = async () => {
    setLoading(true);
    try {
      const [eventRes, runRes] = await Promise.all([
        eventService.list({
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
          location: locationFilter !== 'all' ? locationFilter : undefined
        }),
        eventService.getScrapingRuns()
      ]);

      if (eventRes.data.success) {
        setEvents(eventRes.data.events);
        if (eventRes.data.configured_sources) {
          setSources(eventRes.data.configured_sources);
        }
      }
      if (runRes.data.success) {
        setScrapingRuns(runRes.data.runs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventsData();
  }, [categoryFilter, locationFilter]);

  const handleTriggerScrape = async () => {
    setIsScraping(true);
    try {
      const res = await eventService.triggerScrape(selectedSource);
      if (res.data.success) {
        setToast({
          type: 'success',
          text: `Event scraper finished! ${res.data.events_found || 0} events identified, ${res.data.events_inserted || 0} registered.`
        });
        fetchEventsData();
      }
    } catch (err) {
      setToast({ type: 'error', text: err.response?.data?.message || 'Scraping run encountered an issue.' });
    } finally {
      setIsScraping(false);
      setTimeout(() => setToast(null), 4500);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await eventService.create(formData);
      if (res.data.success) {
        setToast({ type: 'success', text: `Event "${formData.title}" registered successfully.` });
        setIsAddModalOpen(false);
        setFormData({
          title: '',
          location: '',
          event_category: 'festival',
          start_date: '',
          end_date: '',
          description: '',
          expected_footfall: 2500,
          impact_intensity: 'high',
          source_url: ''
        });
        fetchEventsData();
      }
    } catch (err) {
      setToast({ type: 'error', text: err.response?.data?.message || 'Failed to create event.' });
    } finally {
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <div className="flex-1 pb-16 bg-[#F8F6F0]">
      <DashboardHeader
        title="Local Event Intelligence & Web Scraper"
        subtitle="Autonomous scraping and monitoring of regional eco-festivals, sporting events, and cultural exhibitions"
        onRefresh={fetchEventsData}
        isRefreshing={loading}
      />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 pt-6 space-y-6">

        {toast && (
          <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-sm transition-all ${
            toast.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{toast.text}</span>
            </div>
          </div>
        )}

        {/* Scraper Control Deck */}
        <div className="premium-card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-sage-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-forest-800 text-white flex items-center justify-center font-bold">
                <Globe2 className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-charcoal-900">Regional Event Ingestion & Web Scraping Pipeline</h3>
                <p className="text-xs text-charcoal-500">Autonomous crawl engine for tourism calendar feeds, festival portals, and cultural schedules</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="text-xs bg-sage-50 border border-sage-200 rounded-xl px-3 py-2 text-charcoal-800 font-medium focus:ring-2 focus:ring-forest-700 outline-none cursor-pointer"
              >
                <option value="kerala_tourism">Kerala Tourism Department Feed</option>
                <option value="all">Crawl All Configured Portals</option>
              </select>

              <button
                onClick={handleTriggerScrape}
                disabled={isScraping}
                className="btn-primary flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScraping ? 'animate-spin' : ''}`} />
                <span>{isScraping ? 'Scraping Portals...' : 'Trigger Scraper Run'}</span>
              </button>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-3.5 py-2 rounded-xl border border-sage-300 bg-white hover:bg-sage-50 text-charcoal-800 text-xs font-semibold transition-colors"
              >
                + Register Event
              </button>
            </div>
          </div>

          {/* Scrape Runs Timeline */}
          {scrapingRuns.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {scrapingRuns.slice(0, 3).map((run) => (
                <div key={run.id} className="p-3 rounded-xl bg-sage-50/70 border border-sage-200/70 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-charcoal-900 capitalize">{run.source_name || 'Portal Ingest'}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                      {run.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-charcoal-500 flex justify-between font-mono-num">
                    <span>Found: {run.events_found || 0}</span>
                    <span>New: {run.events_inserted || 0}</span>
                    <span>{run.execution_time_seconds ? `${run.execution_time_seconds.toFixed(2)}s` : '0.4s'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sage-200 pb-3">
          <div className="flex items-center gap-2">
            {['all', 'festival', 'sports', 'cultural', 'holiday'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                  categoryFilter === cat
                    ? 'bg-forest-800 text-white shadow-2xs'
                    : 'text-charcoal-500 hover:bg-sage-100 hover:text-charcoal-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <span className="text-xs text-charcoal-500 font-mono-num font-medium">{events.length} tracked events</span>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((ev) => {
            const isPeak = ev.impact_intensity === 'peak';
            const isHigh = ev.impact_intensity === 'high';

            return (
              <div
                key={ev.id}
                className="premium-card p-6 flex flex-col justify-between space-y-4 hover:border-forest-300 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-forest-50 text-forest-800 border border-forest-100 uppercase tracking-wider">
                      {ev.event_category}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isPeak ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                      isHigh ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                      'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {ev.impact_intensity} impact
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-charcoal-900 leading-snug">{ev.title}</h3>

                  <div className="space-y-1.5 text-xs text-charcoal-500">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-forest-700 shrink-0" />
                      <span>{ev.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-forest-700 shrink-0" />
                      <span className="font-semibold text-charcoal-800">{ev.start_date} to {ev.end_date}</span>
                    </div>
                  </div>

                  <p className="text-xs text-charcoal-600 line-clamp-2 leading-relaxed">
                    {ev.description || 'Major regional event driving hospitality demand, transportation congestion, and eco-traveler bookings.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-sage-100 flex items-center justify-between text-[11px] text-charcoal-500">
                  <div>
                    <span>Est. Footfall: </span>
                    <strong className="text-charcoal-900 font-mono-num">{ev.expected_footfall ? ev.expected_footfall.toLocaleString() : '5,000+'}</strong>
                  </div>

                  {ev.source_url && (
                    <a
                      href={ev.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-forest-700 hover:text-forest-900 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>Source</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Manual Add Event Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-charcoal-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-sage-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-sage-100">
              <h3 className="text-base font-bold text-charcoal-900">Manually Register Regional Event</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded-lg text-charcoal-400 hover:bg-sage-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-charcoal-800 mb-1">Event Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Wayanad Monsoon Festival"
                  className="w-full bg-sage-50 border border-sage-200 rounded-xl px-3 py-2 text-charcoal-900 focus:ring-2 focus:ring-forest-700 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-charcoal-800 mb-1">Location Region</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Wayanad, Kerala"
                    className="w-full bg-sage-50 border border-sage-200 rounded-xl px-3 py-2 text-charcoal-900 focus:ring-2 focus:ring-forest-700 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-charcoal-800 mb-1">Category</label>
                  <select
                    value={formData.event_category}
                    onChange={(e) => setFormData({ ...formData, event_category: e.target.value })}
                    className="w-full bg-sage-50 border border-sage-200 rounded-xl px-3 py-2 text-charcoal-900 focus:ring-2 focus:ring-forest-700 outline-none"
                  >
                    <option value="festival">Festival</option>
                    <option value="cultural">Cultural</option>
                    <option value="sports">Sports</option>
                    <option value="holiday">Holiday</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-charcoal-800 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full bg-sage-50 border border-sage-200 rounded-xl px-3 py-2 text-charcoal-900 focus:ring-2 focus:ring-forest-700 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-charcoal-800 mb-1">End Date</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full bg-sage-50 border border-sage-200 rounded-xl px-3 py-2 text-charcoal-900 focus:ring-2 focus:ring-forest-700 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-charcoal-800 mb-1">Impact Intensity</label>
                  <select
                    value={formData.impact_intensity}
                    onChange={(e) => setFormData({ ...formData, impact_intensity: e.target.value })}
                    className="w-full bg-sage-50 border border-sage-200 rounded-xl px-3 py-2 text-charcoal-900 focus:ring-2 focus:ring-forest-700 outline-none"
                  >
                    <option value="low">Low Impact</option>
                    <option value="medium">Medium Impact</option>
                    <option value="high">High Impact</option>
                    <option value="peak">Peak / Sold Out Impact</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-charcoal-800 mb-1">Expected Footfall</label>
                  <input
                    type="number"
                    value={formData.expected_footfall}
                    onChange={(e) => setFormData({ ...formData, expected_footfall: parseInt(e.target.value) })}
                    className="w-full bg-sage-50 border border-sage-200 rounded-xl px-3 py-2 text-charcoal-900 focus:ring-2 focus:ring-forest-700 outline-none font-mono-num"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-charcoal-800 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="2"
                  className="w-full bg-sage-50 border border-sage-200 rounded-xl p-2.5 text-charcoal-900 focus:ring-2 focus:ring-forest-700 outline-none"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-sage-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-sage-200 text-charcoal-700 hover:bg-sage-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-5 py-2 rounded-xl font-bold"
                >
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default EventsPage;
