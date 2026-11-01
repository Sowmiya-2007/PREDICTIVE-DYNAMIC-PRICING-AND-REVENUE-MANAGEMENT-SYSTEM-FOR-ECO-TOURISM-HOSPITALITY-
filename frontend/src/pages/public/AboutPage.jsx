import React from 'react';
import { Target, AlertTriangle, Lightbulb, Cpu, CheckCircle2, Shield, Leaf, Database, Terminal } from 'lucide-react';
import PublicNavbar from '../../components/common/PublicNavbar';
import PublicFooter from '../../components/common/PublicFooter';

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-[#F8FAF8] flex flex-col">
      <PublicNavbar />

      {/* Hero Header */}
      <section className="bg-forest-950 text-white py-16 lg:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-forest-300 bg-forest-900 px-3 py-1 rounded-full border border-forest-800">
            Academic Project Overview
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
            Predictive Dynamic Pricing & Revenue Management
          </h1>
          <p className="text-sm sm:text-base text-sage-300 max-w-2xl mx-auto leading-relaxed">
            Bridging machine learning demand forecasting, permitted web scraping, and ethical hospitality pricing models for nature retreats and eco-resorts.
          </p>
        </div>
      </section>

      {/* Main Content Sections */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        
        {/* 1. Problem Statement */}
        <section className="bg-white p-8 rounded-3xl border border-sage-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-amber-700">
            <AlertTriangle className="w-6 h-6" />
            <h2 className="text-xl font-bold text-forest-950">1. Problem Statement</h2>
          </div>
          <p className="text-sm text-sage-700 leading-relaxed">
            Eco-tourism resorts, rainforest lodges, and wildlife camps experience severe seasonal demand volatility. Unlike urban business hotels with steady corporate travelers, nature retreats are strongly influenced by monsoon weather shifts, local harvest fairs, wildlife migration patterns, and cultural festivals.
          </p>
          <p className="text-sm text-sage-700 leading-relaxed">
            Most eco-lodges currently rely on rigid, flat rate cards across the entire calendar year. During high-demand event periods, they miss substantial revenue opportunities that could fund their conservation projects. Conversely, during off-peak shoulder seasons, rigid pricing results in unbooked rooms and perishable lost inventory.
          </p>
        </section>

        {/* 2. Proposed Solution */}
        <section className="bg-white p-8 rounded-3xl border border-sage-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-forest-700">
            <Lightbulb className="w-6 h-6" />
            <h2 className="text-xl font-bold text-forest-950">2. Proposed Solution</h2>
          </div>
          <p className="text-sm text-sage-700 leading-relaxed">
            This project introduces an integrated revenue engineering platform tailored to eco-tourism:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-sage-50 border border-sage-200">
              <h4 className="font-bold text-forest-900 text-sm mb-1">Local Event Scraping</h4>
              <p className="text-xs text-sage-600 leading-relaxed">
                Automated collection of festivals and regional tourism bulletins using BeautifulSoup and Python Requests.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-sage-50 border border-sage-200">
              <h4 className="font-bold text-forest-900 text-sm mb-1">ML Demand Forecasting</h4>
              <p className="text-xs text-sage-600 leading-relaxed">
                RandomForestRegressor predicting booking occupancy from lead-times, seasonality, and proximity to active events.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-sage-50 border border-sage-200">
              <h4 className="font-bold text-forest-900 text-sm mb-1">Human-in-the-Loop Pricing</h4>
              <p className="text-xs text-sage-600 leading-relaxed">
                Algorithmic recommendation engine with transparent pricing rationales, strict floors/ceilings, and manager approval controls.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Technology Stack */}
        <section className="bg-white p-8 rounded-3xl border border-sage-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 text-forest-800">
            <Cpu className="w-6 h-6" />
            <h2 className="text-xl font-bold text-forest-950">3. Technology Stack</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-sage-50 border border-sage-200 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-forest-800">Frontend Technologies</div>
              <ul className="space-y-2 text-xs text-sage-700">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> React 19 with Vite for ultra-fast SPA development</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Tailwind CSS for responsive eco-themed styling</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> React Router v7 for role-protected navigation</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Recharts for interactive analytics, ADR, and RevPAR curves</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Lucide React for consistent UI iconography</li>
              </ul>
            </div>
            <div className="p-5 rounded-2xl bg-sage-50 border border-sage-200 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-forest-800">Backend & ML Technologies</div>
              <ul className="space-y-2 text-xs text-sage-700">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Python 3.14 & Flask REST API with Blueprints</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> SQLAlchemy ORM with MySQL & SQLite dual support</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Scikit-learn (RandomForestRegressor, MAE/RMSE/R²)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> BeautifulSoup4 & Requests for permitted event scraping</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> PyJWT & Bcrypt for secure token and password hashing</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 4. Benefits for Eco-Tourism Businesses */}
        <section className="bg-white p-8 rounded-3xl border border-sage-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-forest-800">
            <Target className="w-6 h-6" />
            <h2 className="text-xl font-bold text-forest-950">4. Benefits for Hospitality Managers</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-sage-200">
              <div className="font-bold text-forest-900 text-sm mb-1">Informed Pricing Decisions</div>
              <p className="text-xs text-sage-600">Replaces guesswork with empirical forecasts based on active regional festivals and seasons.</p>
            </div>
            <div className="p-4 rounded-xl border border-sage-200">
              <div className="font-bold text-forest-900 text-sm mb-1">Carrying Capacity Protection</div>
              <p className="text-xs text-sage-600">Strict price bounds and room limits ensure eco-retreats do not exceed environmental thresholds.</p>
            </div>
            <div className="p-4 rounded-xl border border-sage-200">
              <div className="font-bold text-forest-900 text-sm mb-1">Human-in-the-Loop Governance</div>
              <p className="text-xs text-sage-600">Managers maintain full authority to approve, reject, or manually adjust rates with recorded audit logs.</p>
            </div>
            <div className="p-4 rounded-xl border border-sage-200">
              <div className="font-bold text-forest-900 text-sm mb-1">Transparent Rationale</div>
              <p className="text-xs text-sage-600">Every price adjustment is accompanied by a plain-language explanation of demand factors.</p>
            </div>
          </div>
        </section>

      </div>

      <PublicFooter />
    </div>
  );
};

export default AboutPage;
