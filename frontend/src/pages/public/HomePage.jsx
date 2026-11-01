import React from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Globe2,
  CalendarCheck,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  TreePine,
  Activity,
  Layers,
  CheckCircle2,
  Lock,
  ChevronRight
} from 'lucide-react';
import PublicNavbar from '../../components/common/PublicNavbar';
import PublicFooter from '../../components/common/PublicFooter';
import { useAuth } from '../../context/AuthContext';

const HomePage = () => {
  const { isAuthenticated, user } = useAuth();
  const targetDashboard = user?.role === 'customer' || user?.role === 'user' ? '/user' : '/dashboard';

  return (
    <div className="min-h-screen bg-[#F8FAF8] flex flex-col">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-24 lg:pt-20 lg:pb-32 bg-gradient-to-b from-forest-50/70 via-[#F8FAF8] to-[#F8FAF8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Headlines & CTAs */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-forest-100/80 border border-forest-200/80 text-forest-900 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-forest-700" />
                <span>AI-Powered Hospitality Revenue Engineering</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-forest-950 tracking-tight leading-[1.12]">
                Predictive Dynamic Pricing for <span className="text-forest-700 underline decoration-forest-400/60 decoration-wavy">Eco-Tourism</span>
              </h1>

              <p className="text-base sm:text-lg text-sage-700 leading-relaxed max-w-2xl">
                Replace inflexible flat rates with an intelligent revenue engine. Powered by Scikit-learn demand forecasting and real-time local festival web scraping, EcoRev AI helps nature retreats maximize occupancy while upholding ecological carrying capacity.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to={isAuthenticated ? targetDashboard : '/login'}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-semibold text-sm shadow-md shadow-forest-950/20 hover:shadow-lg transition-all"
                >
                  <span>{isAuthenticated ? 'Open My Dashboard' : 'Explore Platform'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/about"
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-sage-50 text-forest-900 border border-sage-300 font-semibold text-sm transition-all"
                >
                  <span>Project Methodology</span>
                </Link>
              </div>

              {/* Highlights badge bar */}
              <div className="pt-6 grid grid-cols-3 gap-4 border-t border-sage-200/80 max-w-lg">
                <div>
                  <div className="text-xl font-bold text-forest-950">100%</div>
                  <div className="text-xs text-sage-600 font-medium mt-0.5">Automated Scraping</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-forest-950">RF & ML</div>
                  <div className="text-xs text-sage-600 font-medium mt-0.5">Demand Regressor</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-forest-950">Protected</div>
                  <div className="text-xs text-sage-600 font-medium mt-0.5">Price Ceilings & Floors</div>
                </div>
              </div>
            </div>

            {/* Right Column: Visual Showcase Mockup */}
            <div className="lg:col-span-5">
              <div className="relative">
                {/* Visual Glassmorphic Preview Card */}
                <div className="bg-white rounded-3xl p-6 shadow-2xl border border-sage-200/90 relative z-10 space-y-5">
                  <div className="flex items-center justify-between pb-4 border-b border-sage-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-forest-100 text-forest-800 flex items-center justify-center font-bold text-xs">
                        <TreePine className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-forest-950">Wayanad Canopy Retreat</div>
                        <div className="text-[11px] text-sage-500">Treehouse Villa • Oct 18, 2026</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                      Recommendation Ready
                    </span>
                  </div>

                  <div className="bg-sage-50/70 rounded-2xl p-4 border border-sage-200/60 space-y-3">
                    <div className="flex items-center justify-between text-xs text-sage-600">
                      <span>Event Intelligence Detected:</span>
                      <span className="font-semibold text-forest-800 flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-amber-600" /> Bio-Diversity Fest (+25%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-sage-600">
                      <span>Forecasted Occupancy:</span>
                      <span className="font-semibold text-forest-950">84.5% (High Demand)</span>
                    </div>
                    <div className="pt-2 border-t border-sage-200 flex items-baseline justify-between">
                      <div>
                        <div className="text-[10px] text-sage-500 uppercase tracking-wide">Base Rate</div>
                        <div className="text-sm font-semibold text-sage-600 line-through">₹4,200/night</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wide">Dynamic Recommended</div>
                        <div className="text-2xl font-black text-forest-900">₹5,250<span className="text-xs font-normal text-sage-500">/night</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-forest-900 text-white text-xs space-y-1">
                    <div className="font-semibold flex items-center gap-1.5 text-forest-200">
                      <Sparkles className="w-3.5 h-3.5" /> Explainable Pricing Rationale
                    </div>
                    <p className="text-[11px] text-sage-300 leading-relaxed">
                      "Surge demand driven by Western Ghats Bio-Diversity Fest. Price safely bounded below property maximum of ₹9,800 to maintain eco-brand goodwill."
                    </p>
                  </div>
                </div>

                {/* Decorative background glow */}
                <div className="absolute -inset-4 bg-gradient-to-tr from-forest-200/50 to-sage-200/40 rounded-3xl blur-2xl -z-10"></div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Feature Capabilities Section */}
      <section className="py-20 bg-white border-y border-sage-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-forest-700 bg-forest-50 px-3 py-1 rounded-full border border-forest-100">
              Core Architectural Pillars
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-forest-950 tracking-tight">
              Four Interconnected Engines for Eco-Hospitality
            </h2>
            <p className="text-sage-600 text-sm sm:text-base leading-relaxed">
              Designed from first principles to bridge the gap between commercial revenue management science and sustainable nature retreat constraints.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="bg-sage-50/50 hover:bg-white rounded-2xl p-6 border border-sage-200/80 hover:border-forest-300 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 rounded-xl bg-forest-100 text-forest-800 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Globe2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-forest-950 mb-2">Local Event Web Scraping</h3>
              <p className="text-xs text-sage-600 leading-relaxed">
                Automated collection of regional festivals, agro-tourism exhibitions, and eco-marathons from permitted tourism portals using BeautifulSoup and Requests.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-sage-50/50 hover:bg-white rounded-2xl p-6 border border-sage-200/80 hover:border-forest-300 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 rounded-xl bg-forest-100 text-forest-800 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-forest-950 mb-2">ML Demand Forecasting</h3>
              <p className="text-xs text-sage-600 leading-relaxed">
                Chronologically split RandomForestRegressor trained on 15 temporal, event proximity, and historical occupancy features evaluated with MAE, RMSE, and R².
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-sage-50/50 hover:bg-white rounded-2xl p-6 border border-sage-200/80 hover:border-forest-300 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 rounded-xl bg-forest-100 text-forest-800 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-forest-950 mb-2">Bounded Dynamic Pricing</h3>
              <p className="text-xs text-sage-600 leading-relaxed">
                Rule-based optimization that translates demand predictions into optimal room rates while strictly enforcing property price floors and ceilings.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-sage-50/50 hover:bg-white rounded-2xl p-6 border border-sage-200/80 hover:border-forest-300 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 rounded-xl bg-forest-100 text-forest-800 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-forest-950 mb-2">Revenue Analytics & Audit</h3>
              <p className="text-xs text-sage-600 leading-relaxed">
                Interactive ADR and RevPAR tracking, pricing strategy simulations against fixed baselines, and complete human-in-the-loop approval workflows.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-[#F8FAF8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-forest-950 tracking-tight">How the Platform Works</h2>
            <p className="text-sage-600 text-sm mt-2">A clean five-step decision loop for eco-hospitality leaders.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {[
              { step: '01', title: 'Data Ingestion', desc: 'Properties, room types, and baseline prices are registered.' },
              { step: '02', title: 'Event Scraping', desc: 'Local festival dates and tourism notices are scraped and geocoded.' },
              { step: '03', title: 'ML Forecasting', desc: 'RandomForest model evaluates lead-time and event intensity.' },
              { step: '04', title: 'Price Recommendation', desc: 'Pricing engine calculates rate with transparent reasoning.' },
              { step: '05', title: 'Manager Review', desc: 'Hospitality manager approves, overrides, or rejects before applying.' },
            ].map((s, idx) => (
              <div key={idx} className="bg-white p-5 rounded-2xl border border-sage-200 shadow-sm relative">
                <div className="text-2xl font-black text-forest-300 mb-2">{s.step}</div>
                <h4 className="text-sm font-bold text-forest-950 mb-1">{s.title}</h4>
                <p className="text-xs text-sage-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Eco Sustainability Statement */}
      <section className="py-16 bg-forest-900 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <TreePine className="w-10 h-10 text-forest-300 mx-auto" />
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Eco-Tourism First: Ethical Dynamic Pricing</h2>
          <p className="text-sm sm:text-base text-sage-300 leading-relaxed max-w-2xl mx-auto">
            Traditional airline dynamic pricing maximizes price without regard to over-tourism. EcoRev AI respects carrying capacities, protects sustainable travelers from gouging through configurable price caps, and uses off-peak discounts to level out demand across all seasons.
          </p>
          <div className="pt-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-forest-700 hover:bg-forest-600 text-white font-semibold text-sm transition-colors"
            >
              <span>Launch Demo Environment</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
};

export default HomePage;
