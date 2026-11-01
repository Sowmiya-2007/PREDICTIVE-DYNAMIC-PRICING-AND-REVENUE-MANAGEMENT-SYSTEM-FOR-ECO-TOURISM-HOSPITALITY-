import React from 'react';
import { Leaf, ShieldCheck, Cpu, Code2, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

const PublicFooter = () => {
  return (
    <footer className="bg-forest-950 text-sage-200 border-t border-forest-900 mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand & Purpose */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-forest-800 flex items-center justify-center text-forest-300">
                <Leaf className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">EcoRev AI</span>
            </div>
            <p className="text-sage-400 text-sm max-w-md leading-relaxed">
              Predictive dynamic pricing and revenue management system designed specifically for eco-tourism resorts, nature retreats, and sustainable homestays. Integrating real-time local event web scraping with machine learning demand forecasting.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-forest-900/80 text-forest-300 border border-forest-800">
                <Cpu className="w-3.5 h-3.5" /> Scikit-learn Random Forest
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-forest-900/80 text-forest-300 border border-forest-800">
                <Globe className="w-3.5 h-3.5" /> BeautifulSoup Web Scraping
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-forest-900/80 text-forest-300 border border-forest-800">
                <ShieldCheck className="w-3.5 h-3.5" /> Dynamic Rule Engine
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Platform Pages</h4>
            <ul className="space-y-2.5 text-sm text-sage-400">
              <li>
                <Link to="/" className="hover:text-forest-300 transition-colors">Home & Overview</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-forest-300 transition-colors">Project Methodology</Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-forest-300 transition-colors">Demonstration Inquiries</Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-forest-300 transition-colors">Manager Sign In</Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-forest-300 transition-colors">Register Account</Link>
              </li>
            </ul>
          </div>

          {/* Academic Context */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Academic Project</h4>
            <p className="text-sm text-sage-400 leading-relaxed">
              Developed as an AI-powered revenue management and hospitality decision-support prototype. Designed for eco-tourism sustainability and commercial demonstration.
            </p>
            <div className="mt-4 pt-4 border-t border-forest-900 text-xs text-sage-500">
              Tech Stack: React, Vite, Tailwind CSS, Python Flask, SQLAlchemy, Scikit-learn, MySQL.
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-forest-900/80 flex flex-col sm:flex-row items-center justify-between text-xs text-sage-500 gap-4">
          <p>© {new Date().getFullYear()} EcoRev AI Hospitality Systems. Academic & Portfolio Demonstration.</p>
          <p className="flex items-center gap-1 text-sage-400">
            <Code2 className="w-4 h-4 text-forest-400" /> Complete Full-Stack Implementation
          </p>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
