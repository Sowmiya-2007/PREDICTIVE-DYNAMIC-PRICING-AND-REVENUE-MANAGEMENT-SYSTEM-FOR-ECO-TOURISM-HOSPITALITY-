import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Compass,
  TreePine,
  Calendar,
  Users,
  Search,
  Sparkles,
  ArrowRight,
  Star,
  MapPin,
  CalendarDays,
  ShieldCheck,
  TrendingUp,
  Leaf,
  Sun,
  Activity,
  Award
} from 'lucide-react';
import { propertyService, eventService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// Reliable eco-tourism destination photos
const propertyImages = {
  1: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=900&q=80', // Rainforest lodge
  2: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=900&q=80', // Misty peaks
  3: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=900&q=80', // Mangrove retreat
  4: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80', // Coffee estate
};

const defaultImage = 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=900&q=80';

const UserWelcomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [properties, setProperties] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search parameters
  const [destination, setDestination] = useState('all');
  const [checkIn, setCheckIn] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [checkOut, setCheckOut] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split('T')[0];
  });
  const [guests, setGuests] = useState('2');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [propRes, eventRes] = await Promise.all([
          propertyService.list(),
          eventService.list({ upcoming_only: true })
        ]);
        if (propRes.data.success) setProperties(propRes.data.properties);
        if (eventRes.data.success) setUpcomingEvents(eventRes.data.events.slice(0, 4));
      } catch (err) {
        console.error("Welcome page fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const query = new URLSearchParams({
      destination: destination !== 'all' ? destination : '',
      checkIn,
      checkOut,
      guests
    }).toString();
    navigate(`/user/properties?${query}`);
  };

  return (
    <div className="space-y-12 pb-16">
      
      {/* Personalized Hero & Quick Search */}
      <section className="relative overflow-hidden bg-gradient-to-b from-forest-900 via-forest-950 to-forest-950 text-white pt-12 pb-20 px-4 sm:px-6 lg:px-8">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-forest-700/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto space-y-8 relative z-10">
          
          {/* Welcome Greeting */}
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-800/80 border border-forest-700 text-forest-200 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-forest-300" />
              <span>Eco-Tourism Guest Sanctuary</span>
            </div>
            
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Welcome back, <span className="text-forest-300 underline decoration-forest-500/50 underline-offset-4">{user?.full_name?.split(' ')[0] || 'Traveler'}</span>!
            </h1>
            
            <p className="text-sm sm:text-base text-sage-300 leading-relaxed max-w-2xl">
              Immerse yourself in India's pristine ecological reserves. Enjoy transparent, fair dynamic pricing that automatically adjusts for local seasons and cultural festivals while safeguarding nature.
            </p>
          </div>

          {/* Quick Stay Search Box */}
          <form
            onSubmit={handleSearchSubmit}
            className="bg-white rounded-3xl p-4 sm:p-5 shadow-2xl border border-sage-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-end text-forest-950"
          >
            {/* Destination */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-sage-600 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-forest-700" />
                <span>Destination</span>
              </label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-sage-200 text-xs font-semibold focus:ring-2 focus:ring-forest-800 outline-none bg-sage-50/60"
              >
                <option value="all">All Nature Destinations</option>
                <option value="Wayanad">Wayanad, Kerala</option>
                <option value="Nilgiris">Nilgiris, Tamil Nadu</option>
                <option value="Sundarbans">Sundarbans, West Bengal</option>
                <option value="Coorg">Coorg, Karnataka</option>
              </select>
            </div>

            {/* Check-in Date */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-sage-600 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-forest-700" />
                <span>Check-in Date</span>
              </label>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-sage-200 text-xs font-semibold focus:ring-2 focus:ring-forest-800 outline-none bg-sage-50/60"
              />
            </div>

            {/* Check-out Date */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-sage-600 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-forest-700" />
                <span>Check-out Date</span>
              </label>
              <input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-sage-200 text-xs font-semibold focus:ring-2 focus:ring-forest-800 outline-none bg-sage-50/60"
              />
            </div>

            {/* Guests */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-sage-600 mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-forest-700" />
                <span>Guests</span>
              </label>
              <select
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-sage-200 text-xs font-semibold focus:ring-2 focus:ring-forest-800 outline-none bg-sage-50/60"
              >
                <option value="1">1 Eco Traveler</option>
                <option value="2">2 Guests (Couple)</option>
                <option value="3">3 Guests (Small Family)</option>
                <option value="4">4 Guests (Group)</option>
                <option value="5">5+ Guests</option>
              </select>
            </div>

            {/* Search Button */}
            <div>
              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-xs shadow-md shadow-forest-950/20 transition-all flex items-center justify-center gap-2 group"
              >
                <Search className="w-4 h-4 text-forest-200 group-hover:scale-110 transition-transform" />
                <span>Explore Availability</span>
              </button>
            </div>
          </form>

        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">

        {/* Recommended Destinations & Eco-Retreats */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-forest-800 uppercase tracking-wider">
                <Award className="w-4 h-4" />
                <span>Curated Destinations</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-forest-950 tracking-tight mt-1">
                Featured Eco-Retreats & Sanctuaries
              </h2>
              <p className="text-xs text-sage-600 mt-1">
                Zero-carbon retreats with certified sustainability ratings and dynamic fair-rate protection
              </p>
            </div>

            <Link
              to="/user/properties"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-forest-800 hover:text-forest-900 hover:underline"
            >
              <span>View All Properties ({properties.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-80 rounded-3xl bg-sage-100 animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {properties.map((prop) => (
                <div
                  key={prop.id}
                  className="bg-white rounded-3xl border border-sage-200 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group"
                >
                  {/* Photo */}
                  <div className="relative h-48 overflow-hidden bg-forest-900">
                    <img
                      src={propertyImages[prop.id] || defaultImage}
                      alt={prop.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    
                    {/* Eco Score Badge */}
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-xs text-forest-900 text-xs font-bold flex items-center gap-1 shadow-sm">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{prop.sustainability_rating || 4.8}</span>
                    </div>

                    {/* Category */}
                    <div className="absolute bottom-3 left-3 px-2.5 py-0.5 rounded-lg bg-forest-900/80 backdrop-blur-xs text-forest-200 text-[10px] font-semibold">
                      {prop.eco_category}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1 text-[11px] font-medium text-sage-500">
                        <MapPin className="w-3.5 h-3.5 text-forest-700 shrink-0" />
                        <span className="truncate">{prop.location}</span>
                      </div>
                      <h3 className="text-base font-bold text-forest-950 leading-snug line-clamp-1 group-hover:text-forest-700 transition-colors">
                        {prop.name}
                      </h3>
                      <p className="text-xs text-sage-600 line-clamp-2 leading-relaxed">
                        {prop.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-sage-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-sage-500 block">Starting From</span>
                        <div className="text-base font-black text-forest-900">
                          ₹{Math.round(prop.base_price).toLocaleString()}
                          <span className="text-[10px] font-normal text-sage-600"> / night</span>
                        </div>
                      </div>

                      <Link
                        to={`/user/properties?destination=${encodeURIComponent(prop.location.split(',')[0])}`}
                        className="px-3.5 py-2 rounded-xl bg-forest-800 hover:bg-forest-900 text-white text-xs font-semibold shadow-xs flex items-center gap-1 transition-all"
                      >
                        <span>Check Dates</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Local Events & Tourism Festivals (Event Scraping Intelligence) */}
        <section className="space-y-6 bg-sage-50/70 p-6 sm:p-8 rounded-3xl border border-sage-200">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-forest-800 uppercase tracking-wider">
                <CalendarDays className="w-4 h-4" />
                <span>Regional Tourism Intelligence</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-forest-950 tracking-tight mt-1">
                Upcoming Local Festivals & Nature Events
              </h2>
              <p className="text-xs text-sage-600 mt-1">
                Harvested from regional portals. Stay during vibrant cultural celebrations or choose tranquil off-peak windows.
              </p>
            </div>

            <div className="text-xs font-medium text-sage-600 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Live Scraped Portal Feeds</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {upcomingEvents.map((evt) => (
              <div
                key={evt.id}
                className="bg-white p-5 rounded-2xl border border-sage-200/90 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-forest-100 text-forest-800">
                      {evt.event_category?.replace('_', ' ')}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      evt.impact_intensity === 'high' || evt.impact_intensity === 'peak'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-sage-100 text-sage-700'
                    }`}>
                      {evt.impact_intensity?.toUpperCase()} DEMAND
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-forest-950 line-clamp-1">
                    {evt.title}
                  </h4>
                  <p className="text-xs text-sage-600 line-clamp-2">
                    {evt.description || 'Regional cultural gathering and festival.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-sage-100 text-xs text-sage-600 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-forest-700 shrink-0" />
                    <span className="truncate font-medium">{evt.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-forest-700 shrink-0" />
                    <span>{evt.start_date} to {evt.end_date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Eco-Tourism Stewardship & Guarantee Banner */}
        <section className="bg-gradient-to-br from-forest-800 to-forest-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-700 text-forest-200 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Responsible Eco-Tourism Guarantee</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Transparent Dynamic Pricing for Conservation
              </h3>
              <p className="text-xs sm:text-sm text-forest-100 leading-relaxed max-w-2xl">
                Unlike conventional booking engines with surge pricing markups, EcoRev AI uses strict price boundaries. A ceiling ensures guests are never gouged during peak festivals, while floor rates guarantee continuous funding for native reforestation and tribal community rangers.
              </p>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-3">
              <Link
                to="/user/properties"
                className="w-full py-3.5 px-6 rounded-2xl bg-white hover:bg-forest-50 text-forest-950 font-bold text-xs text-center shadow-lg transition-all"
              >
                Discover Nature Retreats
              </Link>
              <Link
                to="/user/bookings"
                className="w-full py-3 px-6 rounded-2xl bg-forest-700 hover:bg-forest-600 text-white font-semibold text-xs text-center border border-forest-600 transition-all"
              >
                View My Reservations
              </Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default UserWelcomePage;
