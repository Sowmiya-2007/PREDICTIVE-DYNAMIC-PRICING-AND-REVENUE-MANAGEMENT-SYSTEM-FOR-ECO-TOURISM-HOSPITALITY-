import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Sparkles,
  Calendar,
  CheckCircle2,
  XCircle,
  Edit3,
  Clock,
  Filter,
  ShieldCheck,
  Activity,
  History,
  AlertTriangle,
  X,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Cpu,
  Info,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Check
} from 'lucide-react';
import DashboardHeader from '../../components/common/DashboardHeader';
import { pricingService, propertyService } from '../../services/api';

const PricingPage = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [history, setHistory] = useState([]);
  const [properties, setProperties] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Recommendation Generation Form State
  const [genPropertyId, setGenPropertyId] = useState('');
  const [genRoomTypeId, setGenRoomTypeId] = useState('');
  const [genTargetDate, setGenTargetDate] = useState('');
  const [genModelName, setGenModelName] = useState('best');
  const [isGenerating, setIsGenerating] = useState(false);

  // Expanded card sections
  const [expandedShapId, setExpandedShapId] = useState(null);
  const [expandedRulesId, setExpandedRulesId] = useState(null);

  // Override Modal State
  const [overrideModalRec, setOverrideModalRec] = useState(null);
  const [customPrice, setCustomPrice] = useState('');

  // Reject Modal State
  const [rejectModalRec, setRejectModalRec] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchPricingData = async () => {
    setLoading(true);
    try {
      const [recRes, histRes, propRes] = await Promise.all([
        pricingService.listRecommendations({ status: statusFilter !== 'all' ? statusFilter : undefined }),
        pricingService.getHistory(),
        propertyService.list()
      ]);

      if (recRes.data.success) setRecommendations(recRes.data.recommendations);
      if (histRes.data.success) setHistory(recRes.data.success ? histRes.data.history : []);
      if (propRes.data.success) {
        setProperties(propRes.data.properties);
        if (propRes.data.properties.length > 0 && !genPropertyId) {
          setGenPropertyId(propRes.data.properties[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricingData();
  }, [statusFilter]);

  // Set default target date to 7 days from today
  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setGenTargetDate(d.toISOString().split('T')[0]);
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!genPropertyId || !genTargetDate) {
      setToast({ type: 'error', text: 'Select a property and target date.' });
      return;
    }

    setIsGenerating(true);
    try {
      const res = await pricingService.recommend({
        property_id: parseInt(genPropertyId),
        room_type_id: genRoomTypeId ? parseInt(genRoomTypeId) : undefined,
        target_date: genTargetDate,
        model_name: genModelName !== 'best' ? genModelName : undefined
      });
      if (res.data.success) {
        setToast({ type: 'success', text: 'Dynamic pricing recommendation calculated!' });
        fetchPricingData();
      }
    } catch (err) {
      setToast({ type: 'error', text: err.response?.data?.message || 'Recommendation engine error.' });
    } finally {
      setIsGenerating(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleApprove = async (recId) => {
    try {
      await pricingService.approve(recId);
      setToast({ type: 'success', text: `Recommendation #${recId} approved & applied to live inventory.` });
      fetchPricingData();
    } catch (err) {
      setToast({ type: 'error', text: err.response?.data?.message || 'Approval failed.' });
    } finally {
      setTimeout(() => setToast(null), 3500);
    }
  };

  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    if (!overrideModalRec || !customPrice) return;
    try {
      await pricingService.override(overrideModalRec.id, parseFloat(customPrice));
      setToast({ type: 'success', text: `Price overridden and applied at ₹${customPrice}.` });
      setOverrideModalRec(null);
      setCustomPrice('');
      fetchPricingData();
    } catch (err) {
      setToast({ type: 'error', text: err.response?.data?.message || 'Override failed.' });
    } finally {
      setTimeout(() => setToast(null), 3500);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectModalRec) return;
    try {
      await pricingService.reject(rejectModalRec.id, rejectReason);
      setToast({ type: 'info', text: `Recommendation #${rejectModalRec.id} rejected.` });
      setRejectModalRec(null);
      setRejectReason('');
      fetchPricingData();
    } catch (err) {
      setToast({ type: 'error', text: 'Action failed.' });
    } finally {
      setTimeout(() => setToast(null), 3500);
    }
  };

  return (
    <div className="flex-1 pb-16 bg-[#F8F6F0]">
      <DashboardHeader
        title="Dynamic Pricing Recommendations"
        subtitle="AI-driven room rate optimization with human-in-the-loop review and price guardrails"
        onRefresh={fetchPricingData}
        isRefreshing={loading}
      />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 pt-6 space-y-6">

        {toast && (
          <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-sm transition-all ${
            toast.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' :
            toast.type === 'error' ? 'bg-rose-50 text-rose-900 border border-rose-200' :
            'bg-sage-100 text-charcoal-900 border border-sage-300'
          }`}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{toast.text}</span>
            </div>
          </div>
        )}

        {/* Generate Recommendation Control Card */}
        <div className="premium-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-sage-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-forest-800 text-white flex items-center justify-center font-bold shadow-sm">
                <Sparkles className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-charcoal-900">Generate AI Rate Recommendation</h3>
                <p className="text-xs text-charcoal-500">Evaluates ML demand forecast, upcoming festivals, and property rate bounds</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleGenerate} className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
            <div>
              <label className="block text-[11px] font-semibold text-charcoal-700 mb-1.5 uppercase tracking-wider">Eco Property</label>
              <select
                value={genPropertyId}
                onChange={(e) => {
                  setGenPropertyId(e.target.value);
                  setGenRoomTypeId('');
                }}
                className="w-full text-xs bg-sage-50 border border-sage-200 rounded-xl px-3.5 py-2.5 text-charcoal-800 font-medium focus:ring-2 focus:ring-forest-700 focus:bg-white outline-none transition-all cursor-pointer"
                required
              >
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-charcoal-700 mb-1.5 uppercase tracking-wider">Target Stay Date</label>
              <input
                type="date"
                value={genTargetDate}
                onChange={(e) => setGenTargetDate(e.target.value)}
                className="w-full text-xs bg-sage-50 border border-sage-200 rounded-xl px-3.5 py-2.5 text-charcoal-800 font-medium focus:ring-2 focus:ring-forest-700 focus:bg-white outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-charcoal-700 mb-1.5 uppercase tracking-wider">Demand Prediction Model</label>
              <select
                value={genModelName}
                onChange={(e) => setGenModelName(e.target.value)}
                className="w-full text-xs bg-sage-50 border border-sage-200 rounded-xl px-3.5 py-2.5 text-charcoal-800 font-medium focus:ring-2 focus:ring-forest-700 focus:bg-white outline-none transition-all cursor-pointer"
              >
                <option value="best">Best Validated Model (Auto)</option>
                <option value="random_forest">Random Forest Regressor</option>
                <option value="xgboost">XGBoost Regressor</option>
                <option value="linear_regression">Linear Regression</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={isGenerating}
                className="btn-primary w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? 'Evaluating Rules...' : 'Calculate Optimal Rate'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Filter Navigation */}
        <div className="flex items-center justify-between border-b border-sage-200 pb-3">
          <div className="flex items-center gap-2">
            {['all', 'pending', 'applied', 'rejected'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                  statusFilter === st
                    ? 'bg-forest-800 text-white shadow-2xs'
                    : 'text-charcoal-500 hover:bg-sage-100 hover:text-charcoal-900'
                }`}
              >
                {st} Recommendations
              </button>
            ))}
          </div>
          <span className="text-xs text-charcoal-500 font-medium font-mono-num">{recommendations.length} records</span>
        </div>

        {/* Recommendations Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recommendations.map((rec) => {
            const isPending = rec.status === 'pending';
            const isApplied = rec.status === 'applied';
            const isRejected = rec.status === 'rejected';

            return (
              <div
                key={rec.id}
                className={`premium-card p-6 space-y-4 transition-all ${
                  isPending ? 'border-amber-200 ring-1 ring-amber-100/70' :
                  isApplied ? 'border-emerald-200/90' : 'opacity-85'
                }`}
              >
                {/* Header with Model Badge, Confidence & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-sage-100">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-charcoal-900">{rec.property_name}</h4>
                      {rec.selected_model_name && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-forest-100 text-forest-800 capitalize border border-forest-200/60">
                          {rec.selected_model_name.replace('_', ' ')}
                        </span>
                      )}
                      {rec.confidence_score && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {Math.round(rec.confidence_score * 100)}% Conf
                        </span>
                      )}
                      {rec.is_stale_data_warning && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Stale Live Data
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-charcoal-500 mt-1">{rec.room_type_name} • Target Date: <strong className="text-charcoal-800 font-semibold">{rec.target_date}</strong></p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider self-start sm:self-center ${
                    isPending ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                    isApplied ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                    'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}>
                    {rec.status}
                  </span>
                </div>

                {/* VISUAL PRICE COMPARISON PANEL: Current Rate vs ML Direct vs Final Recommended Rate */}
                <div className="bg-gradient-to-r from-sage-50/90 via-sage-50/50 to-emerald-50/30 p-4 rounded-2xl border border-sage-200/80 space-y-3">
                  <div className="grid grid-cols-3 gap-2 items-center text-center">
                    
                    {/* Current Room Price */}
                    <div className="p-2 rounded-xl bg-white border border-sage-200/80 shadow-2xs">
                      <div className="text-[10px] text-charcoal-400 uppercase font-semibold">Current Rate</div>
                      <div className="text-sm font-bold text-charcoal-500 line-through font-mono-num mt-0.5">
                        ₹{rec.current_price}
                      </div>
                      <span className="text-[9px] text-charcoal-400 block mt-0.5">Inventory</span>
                    </div>

                    {/* ML Model Direct Predicted Price */}
                    <div className="p-2 rounded-xl bg-white border border-forest-200 shadow-2xs">
                      <div className="text-[10px] text-forest-800 uppercase font-bold">Direct Model Price</div>
                      <div className="text-base font-bold font-mono-num text-forest-900 mt-0.5">
                        ₹{rec.model_predicted_price ?? rec.recommended_price}
                      </div>
                      <span className="text-[9px] text-forest-700 font-medium px-1.5 py-0.5 rounded bg-forest-50 inline-block mt-0.5 border border-forest-100">
                        ML Direct Prediction
                      </span>
                    </div>

                    {/* Final Rule-Adjusted Recommended Rate Rate */}
                    <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-300 shadow-2xs">
                      <div className="text-[10px] text-emerald-800 uppercase font-bold">Recommended Rate</div>
                      <div className="text-lg font-black font-mono-num text-charcoal-900 mt-0.5">
                        ₹{rec.recommended_price}
                      </div>
                      <span className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded mt-0.5 ${
                        rec.percent_diff >= 0 ? 'text-emerald-700' : 'text-amber-700'
                      }`}>
                        {rec.percent_diff >= 0 ? `+₹${rec.absolute_diff}` : `-₹${Math.abs(rec.absolute_diff)}`} ({rec.percent_diff >= 0 ? `+${rec.percent_diff}` : rec.percent_diff}%)
                      </span>
                    </div>

                  </div>

                  {/* Three-Model Direct Price Comparison Bar (Linear Reg, Random Forest, XGBoost) */}
                  {rec.all_model_predictions && (
                    <div className="pt-2.5 border-t border-sage-200/80">
                      <div className="flex items-center justify-between text-[10px] font-bold text-charcoal-700 mb-1.5">
                        <span>Direct Price Forecasts by Algorithm:</span>
                        <span className="text-emerald-800 font-semibold">Active: {rec.selected_model_name}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                        <div className="bg-white p-2 rounded-xl border border-sage-200 shadow-2xs">
                          <span className="text-[9px] text-charcoal-500 uppercase block font-semibold">Linear Reg</span>
                          <strong className="text-charcoal-900 font-mono-num">₹{rec.all_model_predictions.linear_regression}</strong>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-emerald-200 shadow-2xs">
                          <span className="text-[9px] text-emerald-800 uppercase block font-semibold">Random Forest</span>
                          <strong className="text-charcoal-900 font-mono-num">₹{rec.all_model_predictions.random_forest}</strong>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-forest-200 shadow-2xs">
                          <span className="text-[9px] text-forest-800 uppercase block font-semibold">XGBoost</span>
                          <strong className="text-charcoal-900 font-mono-num">₹{rec.all_model_predictions.xgboost}</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Factors Summary Pill Grid */}
                <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                  <div className="p-2 rounded-xl bg-sage-50 border border-sage-200">
                    <div className="text-[10px] text-charcoal-500">Pace / Demand</div>
                    <div className="font-bold font-mono-num text-charcoal-800">{rec.predicted_occupancy}%</div>
                  </div>
                  <div className="p-2 rounded-xl bg-sage-50 border border-sage-200">
                    <div className="text-[10px] text-charcoal-500">Event Premium</div>
                    <div className="font-bold text-charcoal-800">{rec.event_impact_factor > 1.0 ? `+${Math.round((rec.event_impact_factor - 1)*100)}%` : 'Baseline'}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-sage-50 border border-sage-200">
                    <div className="text-[10px] text-charcoal-500">Season Multiplier</div>
                    <div className="font-bold font-mono-num text-charcoal-800">{rec.seasonal_factor}x</div>
                  </div>
                </div>

                {/* Multi-Factor Rationale Panel */}
                <div className="p-3.5 rounded-2xl bg-forest-950 text-white text-xs space-y-1 shadow-inner">
                  <div className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Multi-Factor Pricing Rationale:</span>
                  </div>
                  <p className="text-[11px] text-sage-200 leading-relaxed italic">
                    "{rec.rationale}"
                  </p>
                </div>

                {/* Expandable SHAP Explainability in Rupees */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setExpandedShapId(expandedShapId === rec.id ? null : rec.id)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-charcoal-800 bg-sage-50 hover:bg-sage-100 p-2.5 rounded-xl border border-sage-200 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-forest-700" />
                      <span>SHAP Room-Price Attribution Breakdown (₹)</span>
                    </span>
                    {expandedShapId === rec.id ? <ChevronUp className="w-4 h-4 text-charcoal-500" /> : <ChevronDown className="w-4 h-4 text-charcoal-500" />}
                  </button>

                  {expandedShapId === rec.id && (
                    <div className="p-4 rounded-2xl bg-sage-50/80 border border-sage-200 text-xs space-y-3">
                      <div className="flex justify-between items-center text-[11px] text-charcoal-600 pb-1 border-b border-sage-200/60">
                        <span>Expected Baseline Selling Price:</span>
                        <strong className="text-charcoal-900 font-mono-num font-bold">₹{rec.shap_values?.base_value ?? 4200}</strong>
                      </div>

                      {/* Positive Drivers */}
                      {rec.shap_values?.strongest_positive?.length > 0 && (
                        <div>
                          <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Positive Price Contributors (+Willingness to Pay)</span>
                          </div>
                          <div className="space-y-1.5">
                            {rec.shap_values.strongest_positive.map((pos) => (
                              <div key={pos.feature} className="flex justify-between items-center text-[11px] bg-white px-3 py-1.5 rounded-lg border border-emerald-200/70">
                                <span className="capitalize font-medium text-charcoal-800">
                                  {pos.feature.replace(/_/g, ' ')} <span className="text-charcoal-400">({String(pos.actual_value)})</span>
                                </span>
                                <span className="font-bold font-mono-num text-emerald-700">+₹{pos.shap_value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Negative Drivers */}
                      {rec.shap_values?.strongest_negative?.length > 0 && (
                        <div>
                          <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <ArrowDownRight className="w-3.5 h-3.5 text-amber-600" />
                            <span>Price Dampening Contributors (-Rate Relief)</span>
                          </div>
                          <div className="space-y-1.5">
                            {rec.shap_values.strongest_negative.map((neg) => (
                              <div key={neg.feature} className="flex justify-between items-center text-[11px] bg-white px-3 py-1.5 rounded-lg border border-amber-200/70">
                                <span className="capitalize font-medium text-charcoal-800">
                                  {neg.feature.replace(/_/g, ' ')} <span className="text-charcoal-400">({String(neg.actual_value)})</span>
                                </span>
                                <span className="font-bold font-mono-num text-amber-700">-₹{Math.abs(neg.shap_value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="p-2.5 rounded-xl bg-white border border-sage-200 text-[10px] text-charcoal-500 leading-relaxed flex items-start gap-1.5">
                        <Info className="w-3.5 h-3.5 text-forest-700 shrink-0 mt-0.5" />
                        <span>SHAP values quantify how much each input feature shifted the model's room price prediction (in ₹) from the expected baseline for this specific stay date and room category.</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Expandable Pricing Rules & Guardrails Section */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setExpandedRulesId(expandedRulesId === rec.id ? null : rec.id)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-charcoal-800 bg-sage-50 hover:bg-sage-100 p-2.5 rounded-xl border border-sage-200 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Business Pricing Rules & Rate Guardrails</span>
                    </span>
                    {expandedRulesId === rec.id ? <ChevronUp className="w-4 h-4 text-charcoal-500" /> : <ChevronDown className="w-4 h-4 text-charcoal-500" />}
                  </button>

                  {expandedRulesId === rec.id && (
                    <div className="p-4 rounded-2xl bg-sage-50/80 border border-sage-200 text-xs space-y-3">
                      <div className="text-[11px] font-bold text-charcoal-900 uppercase tracking-wider">
                        Step-by-Step Rule Enforcement Audit:
                      </div>
                      
                      <div className="bg-white p-3 rounded-xl border border-sage-200 space-y-1.5 text-[11px] text-charcoal-700">
                        {rec.pricing_rules_explanation ? (
                          rec.pricing_rules_explanation.split('\n').map((step, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-forest-700 mt-1.5 shrink-0"></span>
                              <span className="font-medium text-charcoal-800">{step}</span>
                            </div>
                          ))
                        ) : (
                          <div className="italic text-charcoal-500">Automated volatility limiter (max ±30%) and property corridor bounds verified.</div>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200">
                        <span className="flex items-center gap-1.5 text-emerald-900 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          Rate Floor & Ceiling Validated
                        </span>
                        <span className="text-emerald-800 font-semibold font-mono-num">Max Swing: ±30%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bounds Enforcement Indicator */}
                <div className="flex items-center gap-3 text-[11px] text-charcoal-500 font-medium pt-1">
                  <span className="flex items-center gap-1 text-emerald-700 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Floor & Ceiling Guardrails Enforced
                  </span>
                  {rec.override_price && (
                    <span className="text-amber-800 font-bold">
                      • Overridden to ₹{rec.override_price}
                    </span>
                  )}
                </div>

                {/* Action Buttons for Pending items */}
                {isPending && (
                  <div className="pt-3 border-t border-sage-200/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setOverrideModalRec(rec);
                          setCustomPrice(rec.recommended_price.toString());
                        }}
                        className="px-3 py-1.5 rounded-xl border border-sage-300 text-charcoal-700 hover:bg-sage-100 text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Override</span>
                      </button>
                      <button
                        onClick={() => {
                          setRejectModalRec(rec);
                          setRejectReason("Market adjustment declined by manager.");
                        }}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>

                    <button
                      onClick={() => handleApprove(rec.id)}
                      className="px-4 py-1.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Approve & Apply</span>
                    </button>
                  </div>
                )}

                {/* Reviewer signature if already applied */}
                {rec.reviewer_name && (
                  <div className="text-[11px] text-charcoal-500 pt-1">
                    Reviewed by: <strong className="text-charcoal-800">{rec.reviewer_name}</strong> on {new Date(rec.reviewed_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Price Adjustment Audit History Table */}
        <div className="premium-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-sage-100">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-forest-700" />
              <h3 className="text-sm font-bold text-charcoal-900">Applied Price Change Audit History</h3>
            </div>
            <span className="text-xs text-charcoal-500 font-mono-num">{history.length} historical modifications</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-sage-200">
            <table className="w-full text-left text-xs text-charcoal-700">
              <thead className="bg-sage-50 text-[11px] font-bold text-charcoal-900 uppercase tracking-wider border-b border-sage-200">
                <tr>
                  <th className="py-3 px-4">Date / Property</th>
                  <th className="py-3 px-4">Room Type</th>
                  <th className="py-3 px-4">Previous Price</th>
                  <th className="py-3 px-4">Applied New Price</th>
                  <th className="py-3 px-4">Change Delta</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Approved By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage-100 font-medium">
                {history.slice(0, 8).map((hist) => (
                  <tr key={hist.id} className="hover:bg-sage-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-charcoal-900">{hist.property_name}</div>
                      <div className="text-[10px] text-charcoal-400">{hist.effective_date}</div>
                    </td>
                    <td className="py-3 px-4 text-charcoal-600">{hist.room_type_name}</td>
                    <td className="py-3 px-4 font-mono-num text-charcoal-500">₹{hist.old_price}</td>
                    <td className="py-3 px-4 font-mono-num font-bold text-charcoal-900">₹{hist.new_price}</td>
                    <td className="py-3 px-4 font-mono-num font-semibold text-emerald-700">
                      +{Math.round(((hist.new_price - hist.old_price) / hist.old_price) * 100)}%
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-forest-50 text-forest-800 border border-forest-100">
                        {hist.change_source || 'AI Recommendation'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-charcoal-600">{hist.changed_by_name || 'System Admin'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Override Price Modal */}
      {overrideModalRec && (
        <div className="fixed inset-0 z-50 bg-charcoal-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-sage-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-sage-100">
              <h3 className="text-base font-bold text-charcoal-900">Manual Price Adjustment</h3>
              <button onClick={() => setOverrideModalRec(null)} className="p-1 rounded-lg text-charcoal-400 hover:bg-sage-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOverrideSubmit} className="space-y-4">
              <div className="text-xs text-charcoal-600 space-y-1">
                <p>Property: <strong className="text-charcoal-900">{overrideModalRec.property_name}</strong></p>
                <p>Room: <strong className="text-charcoal-900">{overrideModalRec.room_type_name}</strong></p>
                <p>Target Date: <strong className="text-charcoal-900">{overrideModalRec.target_date}</strong></p>
                <p>ML Recommendation: <strong className="text-emerald-800 font-mono-num">₹{overrideModalRec.recommended_price}</strong></p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-800 mb-1">Override Nightly Rate (₹)</label>
                <input
                  type="number"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="w-full text-sm bg-sage-50 border border-sage-200 rounded-xl px-3 py-2 text-charcoal-900 font-bold focus:ring-2 focus:ring-forest-700 outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setOverrideModalRec(null)}
                  className="px-4 py-2 rounded-xl border border-sage-200 text-charcoal-700 hover:bg-sage-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-5 py-2 rounded-xl text-xs font-bold"
                >
                  Apply Override Rate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalRec && (
        <div className="fixed inset-0 z-50 bg-charcoal-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-sage-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-sage-100">
              <h3 className="text-base font-bold text-charcoal-900">Decline Pricing Recommendation</h3>
              <button onClick={() => setRejectModalRec(null)} className="p-1 rounded-lg text-charcoal-400 hover:bg-sage-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <p className="text-xs text-charcoal-600">
                Provide an audit rationale for declining recommendation #{rejectModalRec.id} for <strong className="text-charcoal-900">{rejectModalRec.property_name}</strong> on {rejectModalRec.target_date}.
              </p>

              <div>
                <label className="block text-xs font-semibold text-charcoal-800 mb-1">Reason for Rejection</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows="3"
                  className="w-full text-xs bg-sage-50 border border-sage-200 rounded-xl p-3 text-charcoal-900 font-medium focus:ring-2 focus:ring-forest-700 outline-none"
                  placeholder="e.g. Existing corporate group contract, local partner promotion..."
                  required
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setRejectModalRec(null)}
                  className="px-4 py-2 rounded-xl border border-sage-200 text-charcoal-700 hover:bg-sage-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold shadow-sm"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default PricingPage;
