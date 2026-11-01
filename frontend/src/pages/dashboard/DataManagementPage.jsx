import React, { useState, useEffect } from 'react';
import {
  Database,
  Upload,
  Download,
  RotateCcw,
  FileText,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ShieldCheck,
  Sparkles,
  CloudSun,
  Calendar,
  Layers,
  RefreshCw,
  ExternalLink,
  Check,
  Radio,
  Clock,
  MapPin,
  Flag
} from 'lucide-react';
import DashboardHeader from '../../components/common/DashboardHeader';
import { dataService } from '../../services/api';

const DataManagementPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [datasetType, setDatasetType] = useState('bookings');
  const [uploadStatus, setUploadStatus] = useState(null);
  const [isResetting, setIsResetting] = useState(false);
  const [toast, setToast] = useState(null);
  const [overview, setOverview] = useState([]);
  const [sources, setSources] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [attractions, setAttractions] = useState([]);
  const [refreshingSourceId, setRefreshingSourceId] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  const fetchOverview = async () => {
    setLoadingOverview(true);
    try {
      const [overviewRes, sourcesRes, holidayRes, attractionRes] = await Promise.all([
        dataService.getDatasetsOverview(),
        dataService.getSources(),
        dataService.getHolidays({ days: 120 }),
        dataService.getAttractions()
      ]);

      if (overviewRes.data.success) {
        setOverview(overviewRes.data.datasets);
      }
      if (sourcesRes.data.success) {
        setSources(sourcesRes.data.sources);
      }
      if (holidayRes?.data?.success) {
        setHolidays(holidayRes.data.holidays || []);
      }
      if (attractionRes?.data?.success) {
        setAttractions(attractionRes.data.attractions || []);
      }
    } catch (err) {
      console.error("Failed to fetch datasets overview:", err);
    } finally {
      setLoadingOverview(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleRefreshSource = async (sourceId = 'all') => {
    setRefreshingSourceId(sourceId);
    try {
      const res = await dataService.refreshLive(sourceId, true);
      if (res.data.success) {
        setToast({
          type: 'success',
          text: `Live external data refreshed: ${res.data.message || 'Updated successfully.'}`
        });
        fetchOverview();
      }
    } catch (err) {
      setToast({
        type: 'error',
        text: err.response?.data?.message || 'External feed sync failed.'
      });
    } finally {
      setRefreshingSourceId(null);
      setTimeout(() => setToast(null), 4500);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('dataset_type', datasetType);

    setUploadStatus('uploading');
    try {
      const res = await dataService.uploadCSV(formData);
      if (res.data.success) {
        setUploadStatus('success');
        setToast({
          type: 'success',
          text: `CSV processed successfully! Processed ${res.data.rows_processed || 0} records.`
        });
        fetchOverview();
      }
    } catch (err) {
      setUploadStatus('error');
      setToast({
        type: 'error',
        text: err.response?.data?.message || 'CSV upload failed validation.'
      });
    } finally {
      setTimeout(() => setUploadStatus(null), 4000);
    }
  };

  const handleExportCSV = () => {
    window.open(dataService.getExportUrl(), '_blank');
  };

  return (
    <div className="flex-1 pb-16 bg-[#F8F6F0]">
      <DashboardHeader
        title="Data Sources, CSV Tools & Freshness Engine"
        subtitle="Live automated pipelines, PMS booking imports, and environmental sensor synchronization"
        onRefresh={fetchOverview}
        isRefreshing={loadingOverview}
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

        {/* Live Ingestion Freshness Hub */}
        <div className="premium-card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-sage-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-forest-800 text-white flex items-center justify-center font-bold">
                <Database className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-charcoal-900">External Live Feeds & API Freshness</h3>
                <p className="text-xs text-charcoal-500">Autonomous synchronizers pulling real-time weather, public holidays, and eco-attraction footfall</p>
              </div>
            </div>

            <button
              onClick={() => handleRefreshSource('all')}
              disabled={refreshingSourceId !== null}
              className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingSourceId === 'all' ? 'animate-spin' : ''}`} />
              <span>{refreshingSourceId === 'all' ? 'Ingesting All Live Feeds...' : 'Force Ingest All Feeds'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {sources.map((src) => {
              const isHealthy = src.fetch_status === 'healthy' || src.fetch_status === 'fresh';
              const isStale = src.fetch_status === 'stale';

              return (
                <div key={src.source_id} className="p-4 rounded-xl bg-sage-50/70 border border-sage-200/80 space-y-3 flex flex-col justify-between hover:bg-sage-50 transition-colors">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-charcoal-900 truncate max-w-[140px]">{src.source_name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                        isHealthy ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        isStale ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {src.fetch_status}
                      </span>
                    </div>

                    <div className="text-[11px] text-charcoal-500 space-y-1 mt-2.5">
                      <div className="flex justify-between">
                        <span>Records:</span>
                        <strong className="text-charcoal-900 font-mono-num">{src.records_collected ?? 0}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Sync Interval:</span>
                        <span>{src.refresh_interval_minutes}m</span>
                      </div>
                      <div className="text-[10px] text-charcoal-400 truncate" title={src.latest_data_timestamp || 'N/A'}>
                        Last: {src.latest_data_timestamp ? src.latest_data_timestamp.split('T')[0] : 'Real-Time'}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-sage-200/60 flex items-center justify-between text-[11px]">
                    {src.source_url ? (
                      <a
                        href={src.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-forest-700 hover:text-forest-900 hover:underline flex items-center gap-1 font-semibold text-[10px]"
                      >
                        <span>Endpoint</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : (
                      <span className="text-[10px] text-charcoal-400">Internal DB</span>
                    )}

                    <button
                      onClick={() => handleRefreshSource(src.source_id)}
                      disabled={refreshingSourceId === src.source_id}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-forest-50 text-charcoal-800 border border-sage-200 text-[10px] font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-2.5 h-2.5 ${refreshingSourceId === src.source_id ? 'animate-spin text-forest-700' : ''}`} />
                      <span>Sync</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Database Inventory Table & CSV Importer Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Dataset Status Overview */}
          <div className="lg:col-span-7 premium-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-sage-100">
              <h3 className="text-sm font-bold text-charcoal-900">Hospitality Dataset Architecture</h3>
              <span className="text-xs text-charcoal-500 font-mono-num">{overview.length} Core Tables</span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-sage-200">
              <table className="w-full text-left text-xs text-charcoal-700">
                <thead className="bg-sage-50 text-[11px] font-bold text-charcoal-900 uppercase tracking-wider border-b border-sage-200">
                  <tr>
                    <th className="py-3 px-4">Dataset</th>
                    <th className="py-3 px-4">Row Count</th>
                    <th className="py-3 px-4">Latest Ingest</th>
                    <th className="py-3 px-4">Health Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage-100 font-medium">
                  {overview.map((ds) => (
                    <tr key={ds.table_name || ds.name} className="hover:bg-sage-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-charcoal-900 capitalize">{(ds.table_name || ds.name).replace(/_/g, ' ')}</div>
                        <div className="text-[10px] text-charcoal-400">{ds.description || 'Verified hospitality entity table'}</div>
                      </td>
                      <td className="py-3 px-4 font-mono-num font-bold text-charcoal-900">
                        {(ds.count || ds.records || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-charcoal-500 font-mono-num text-[11px]">
                        {ds.latest_entry ? ds.latest_entry.split('T')[0] : 'Continuous'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Active Ready
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* CSV Upload & Manual Import Workbench */}
          <div className="lg:col-span-5 premium-card p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-sage-100">
              <FileSpreadsheet className="w-4 h-4 text-forest-700" />
              <h3 className="text-sm font-bold text-charcoal-900">PMS CSV Data Import Tool</h3>
            </div>
            <p className="text-xs text-charcoal-500 leading-relaxed">
              Import historical bookings, event calendars, or seasonal rate tables into the core ML pipeline with automated validation.
            </p>

            <form onSubmit={handleFileUpload} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1.5 uppercase tracking-wider">Target Dataset</label>
                <select
                  value={datasetType}
                  onChange={(e) => setDatasetType(e.target.value)}
                  className="w-full text-xs bg-sage-50 border border-sage-200 rounded-xl px-3.5 py-2.5 text-charcoal-800 font-medium focus:ring-2 focus:ring-forest-700 outline-none cursor-pointer"
                >
                  <option value="bookings">Historical Reservations & PMS Bookings</option>
                  <option value="events">Local Festivals & Tourism Events</option>
                  <option value="weather">Microclimate & Sensor Weather Logs</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1.5 uppercase tracking-wider">Upload CSV File</label>
                <div className="p-4 rounded-xl border-2 border-dashed border-sage-300 hover:border-forest-700 bg-sage-50/50 text-center cursor-pointer transition-colors">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    className="w-full text-xs text-charcoal-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-forest-800 file:text-white hover:file:bg-forest-900 cursor-pointer"
                  />
                  <span className="text-[11px] text-charcoal-400 block mt-2">Maximum file size: 10MB (.csv format)</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3.5 py-2 rounded-xl border border-sage-300 text-charcoal-700 hover:bg-sage-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample</span>
                </button>

                <button
                  type="submit"
                  disabled={!selectedFile || uploadStatus === 'uploading'}
                  className="btn-primary flex-1 py-2 rounded-xl text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Upload className={`w-3.5 h-3.5 ${uploadStatus === 'uploading' ? 'animate-bounce' : ''}`} />
                  <span>{uploadStatus === 'uploading' ? 'Validating & Uploading...' : 'Upload & Parse CSV'}</span>
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
};

export default DataManagementPage;
