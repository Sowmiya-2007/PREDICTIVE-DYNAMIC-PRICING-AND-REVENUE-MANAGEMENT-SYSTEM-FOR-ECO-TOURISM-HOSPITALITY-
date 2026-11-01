import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Calendar,
  Users,
  MapPin,
  Star,
  Sparkles,
  TreePine,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  CalendarDays,
  ArrowUpDown,
  AlertCircle
} from 'lucide-react';
import { propertyService } from '../../services/api';
import BookingModal from './BookingModal';

const propertyImages = {
  1: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=900&q=80',
  2: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=900&q=80',
  3: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=900&q=80',
  4: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80',
};

const defaultImage = 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=900&q=80';

const UserPropertiesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [properties, setProperties] = useState([]);
  const [quotes, setQuotes] = useState({}); // { [propId]: quoteData }
  const [loading, setLoading] = useState(true);
  const [quotingLoading, setQuotingLoading] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDestination, setSelectedDestination] = useState(searchParams.get('destination') || 'all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('rating');

  // Dates & Guests
  const [checkIn, setCheckIn] = useState(() => {
    return searchParams.get('checkIn') || (() => {
      const d = new Date();
      d.setDate(d.getDate() + 2);
      return d.toISOString().split('T')[0];
    })();
  });
  const [checkOut, setCheckOut] = useState(() => {
    return searchParams.get('checkOut') || (() => {
      const d = new Date();
      d.setDate(d.getDate() + 5);
      return d.toISOString().split('T')[0];
    })();
  });
  const [guests, setGuests] = useState(searchParams.get('guests') || '2');

  // Active Booking Modal
  const [bookingTarget, setBookingTarget] = useState(null); // { property, roomType, quote }

  // Expanded room breakdowns: { [propId]: boolean }
  const [expandedBreakdowns, setExpandedBreakdowns] = useState({});

  // 1. Fetch properties
  const fetchProperties = async () => {
    setLoading(true);
    try {
      const res = await propertyService.list();
      if (res.data.success) {
        setProperties(res.data.properties);
      }
    } catch (err) {
      console.error("Error fetching properties:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  // 2. Fetch live stay quotes whenever dates or properties change
  useEffect(() => {
    if (properties.length === 0) return;

    const fetchAllQuotes = async () => {
      setQuotingLoading(true);
      const quotesMap = {};

      await Promise.all(
        properties.map(async (prop) => {
          try {
            const qRes = await propertyService.getQuote(prop.id, {
              check_in: checkIn,
              check_out: checkOut,
              guests: Number(guests),
              rooms: 1
            });
            if (qRes.data.success) {
              quotesMap[prop.id] = qRes.data;
            }
          } catch (e) {
            console.error(`Quote error for property ${prop.id}:`, e);
          }
        })
      );

      setQuotes(quotesMap);
      setQuotingLoading(false);
    };

    fetchAllQuotes();
  }, [properties, checkIn, checkOut, guests]);

  const toggleBreakdown = (propId) => {
    setExpandedBreakdowns(prev => ({
      ...prev,
      [propId]: !prev[propId]
    }));
  };

  // Filter and sort logic
  const filteredProperties = properties.filter((prop) => {
    const matchesSearch =
      prop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prop.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (prop.description && prop.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesDest =
      selectedDestination === 'all' ||
      prop.location.toLowerCase().includes(selectedDestination.toLowerCase()) ||
      prop.state_or_region.toLowerCase().includes(selectedDestination.toLowerCase());

    const matchesCat =
      selectedCategory === 'all' || prop.eco_category === selectedCategory;

    return matchesSearch && matchesDest && matchesCat;
  }).sort((a, b) => {
    if (sortBy === 'rating') return (b.sustainability_rating || 0) - (a.sustainability_rating || 0);
    if (sortBy === 'price_asc') return (a.base_price || 0) - (b.base_price || 0);
    if (sortBy === 'price_desc') return (b.base_price || 0) - (a.base_price || 0);
    if (sortBy === 'capacity') return (b.total_capacity || 0) - (a.total_capacity || 0);
    return 0;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Title & Eco-Pricing Information Banner */}
      <div className="space-y-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-forest-800 uppercase tracking-wider">
            <TreePine className="w-4 h-4" />
            <span>Discover Eco-Tourism Stays</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-forest-950 tracking-tight mt-1">
            Explore Eco-Retreats with Live Dynamic Rates
          </h1>
          <p className="text-xs sm:text-sm text-sage-600 mt-1 max-w-3xl">
            Choose your travel dates to preview verified live accommodation prices. Our rates adjust responsively based on seasonal monsoons, weather indicators, and local festivals without gouging beyond established property price ceilings.
          </p>
        </div>

        {/* Dynamic Pricing Transparency Notice */}
        <div className="bg-sage-50/90 border border-sage-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-forest-800 text-forest-200 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-forest-950">
                Transparent Dynamic Eco-Pricing System
              </h4>
              <p className="text-[11px] text-sage-600 leading-relaxed">
                Prices update in real time when you change your travel dates. All shown rates are direct property prices with strict floor and ceiling guarantees.
              </p>
            </div>
          </div>

          <div className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white border border-sage-200 text-forest-800 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${quotingLoading ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`}></span>
            <span>{quotingLoading ? 'Updating Live Quotes...' : 'Live Quotes Synchronized'}</span>
          </div>
        </div>
      </div>

      {/* Interactive Date & Filter Bar */}
      <div className="bg-white rounded-3xl p-5 border border-sage-200 shadow-md space-y-4">
        {/* Date and Guest Pickers (Triggers Live Re-Quote) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pb-4 border-b border-sage-100">
          <div>
            <label className="block text-[11px] font-bold text-forest-950 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-forest-700" />
              <span>Check-in Date</span>
            </label>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-sage-200 text-xs font-semibold text-forest-950 focus:ring-2 focus:ring-forest-800 outline-none bg-sage-50/50"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-forest-950 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-forest-700" />
              <span>Check-out Date</span>
            </label>
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-sage-200 text-xs font-semibold text-forest-950 focus:ring-2 focus:ring-forest-800 outline-none bg-sage-50/50"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-forest-950 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-forest-700" />
              <span>Number of Guests</span>
            </label>
            <select
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-sage-200 text-xs font-semibold text-forest-950 focus:ring-2 focus:ring-forest-800 outline-none bg-sage-50/50"
            >
              <option value="1">1 Guest</option>
              <option value="2">2 Guests (Couple)</option>
              <option value="3">3 Guests</option>
              <option value="4">4 Guests</option>
              <option value="5">5+ Guests</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-forest-950 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-forest-700" />
              <span>Sort Results By</span>
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-sage-200 text-xs font-semibold text-forest-950 focus:ring-2 focus:ring-forest-800 outline-none bg-sage-50/50"
            >
              <option value="rating">Highest Sustainability Rating</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="capacity">Total Capacity</option>
            </select>
          </div>
        </div>

        {/* Search Input & Category Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Keyword Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-sage-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by property name, features, or location..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-sage-200 text-xs focus:ring-2 focus:ring-forest-800 outline-none"
            />
          </div>

          {/* Destination Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-sage-600 hidden sm:inline">Destination:</span>
            <select
              value={selectedDestination}
              onChange={(e) => setSelectedDestination(e.target.value)}
              className="px-3 py-2 rounded-xl border border-sage-200 text-xs font-semibold text-forest-950 bg-white"
            >
              <option value="all">All Destinations</option>
              <option value="Wayanad">Wayanad, Kerala</option>
              <option value="Nilgiris">Nilgiris, Tamil Nadu</option>
              <option value="Sundarbans">Sundarbans, West Bengal</option>
              <option value="Coorg">Coorg, Karnataka</option>
            </select>
          </div>
        </div>

        {/* Eco Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-1 text-xs">
          <span className="text-sage-500 text-[11px] font-semibold shrink-0">Category:</span>
          {[
            { id: 'all', label: 'All Eco-Categories' },
            { id: 'Forest Eco-Lodge', label: 'Forest Eco-Lodge' },
            { id: 'Mountain Sanctuary', label: 'Mountain Sanctuary' },
            { id: 'Mangrove Retreat', label: 'Mangrove Retreat' },
            { id: 'Organic Farm Homestay', label: 'Organic Farm Homestay' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-all ${
                selectedCategory === cat.id
                  ? 'bg-forest-800 text-white shadow-xs'
                  : 'bg-sage-100/70 text-sage-700 hover:bg-sage-200 hover:text-forest-950'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Property Cards List */}
      <div className="space-y-8">
        {loading ? (
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-96 rounded-3xl bg-sage-100 animate-pulse"></div>
            ))}
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-sage-200 space-y-3">
            <TreePine className="w-12 h-12 text-sage-400 mx-auto" />
            <h3 className="text-lg font-bold text-forest-950">No eco-properties found</h3>
            <p className="text-xs text-sage-600 max-w-md mx-auto">
              Try adjusting your search criteria, dates, or removing the category filter.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedDestination('all');
                setSelectedCategory('all');
              }}
              className="px-4 py-2 rounded-xl bg-forest-800 text-white text-xs font-semibold"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredProperties.map((prop) => {
            const propQuote = quotes[prop.id];
            const roomQuotes = propQuote?.room_quotes || [];
            const isBreakdownOpen = expandedBreakdowns[prop.id] || false;

            return (
              <div
                key={prop.id}
                className="bg-white rounded-3xl border border-sage-200 shadow-lg overflow-hidden transition-all duration-300 hover:border-forest-700/40"
              >
                {/* Property Header Banner */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
                  
                  {/* Photo & Badges */}
                  <div className="lg:col-span-4 relative rounded-2xl overflow-hidden h-56 lg:h-auto min-h-[200px] bg-forest-900">
                    <img
                      src={propertyImages[prop.id] || defaultImage}
                      alt={prop.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    
                    {/* Eco Rating Badge */}
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/95 text-forest-950 text-xs font-bold flex items-center gap-1 shadow-sm">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{prop.sustainability_rating || 4.8} Eco Score</span>
                    </div>

                    <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-forest-900/80 backdrop-blur-xs text-forest-200 text-xs font-semibold">
                      {prop.eco_category}
                    </div>
                  </div>

                  {/* Property Info Details */}
                  <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-sage-600">
                        <MapPin className="w-3.5 h-3.5 text-forest-700" />
                        <span>{prop.location} ({prop.state_or_region})</span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-forest-950 tracking-tight">
                        {prop.name}
                      </h2>
                      <p className="text-xs sm:text-sm text-sage-600 leading-relaxed">
                        {prop.description}
                      </p>
                    </div>

                    {/* Property Eco-Features Summary Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-sage-100 text-xs">
                      <div className="p-2 rounded-xl bg-sage-50 border border-sage-200/60">
                        <span className="text-[10px] text-sage-500 block">Property Capacity</span>
                        <strong className="text-forest-950 font-semibold">{prop.total_capacity} Guests</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-sage-50 border border-sage-200/60">
                        <span className="text-[10px] text-sage-500 block">Rate Boundaries</span>
                        <strong className="text-forest-950 font-semibold">₹{Math.round(prop.min_price)} - ₹{Math.round(prop.max_price)}</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-sage-50 border border-sage-200/60">
                        <span className="text-[10px] text-sage-500 block">Conservation Audit</span>
                        <strong className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Certified Zero-Waste
                        </strong>
                      </div>
                      <div className="p-2 rounded-xl bg-forest-50 border border-forest-100 text-right">
                        <span className="text-[10px] text-forest-700 block">Selected Stay</span>
                        <strong className="text-forest-950 font-semibold">{propQuote?.nights || 3} Nights</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Available Room Types & Live Dynamic Rates Section */}
                <div className="bg-sage-50/60 p-6 border-t border-sage-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-forest-950 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-forest-700" />
                      <span>Available Rooms & Live Approved Rates for {checkIn} to {checkOut}</span>
                    </h3>

                    <button
                      onClick={() => toggleBreakdown(prop.id)}
                      className="text-xs font-semibold text-forest-800 hover:text-forest-950 flex items-center gap-1"
                    >
                      <span>{isBreakdownOpen ? 'Hide Daily Breakdown' : 'View Night-by-Night Pricing'}</span>
                      {isBreakdownOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Room Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {roomQuotes.length > 0 ? (
                      roomQuotes.map((rq) => (
                        <div
                          key={rq.room_type_id}
                          className="bg-white rounded-2xl p-4 border border-sage-200 shadow-xs flex flex-col justify-between space-y-3"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-bold text-forest-950">{rq.name}</h4>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                rq.is_available
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                                {rq.is_available ? 'Available' : 'Fully Booked'}
                              </span>
                            </div>

                            <p className="text-xs text-sage-600 line-clamp-2">
                              {rq.description || 'Sustainable accommodation featuring natural materials.'}
                            </p>

                            <div className="text-[11px] text-sage-500 flex items-center gap-2 pt-1">
                              <Users className="w-3.5 h-3.5 text-forest-700" />
                              <span>Up to {rq.capacity} guests</span>
                              <span>•</span>
                              <span className="truncate">{rq.amenities}</span>
                            </div>
                          </div>

                          {/* Pricing & Booking CTA */}
                          <div className="pt-3 border-t border-sage-100 flex items-center justify-between">
                            <div>
                              <div className="text-lg font-black text-forest-900">
                                ₹{Math.round(rq.price_per_night).toLocaleString()}
                                <span className="text-[11px] font-normal text-sage-600"> / night</span>
                              </div>
                              <span className="text-[10px] text-sage-500 block">
                                Total: ₹{Math.round(rq.total_stay_cost).toLocaleString()} ({rq.nights_count} nights)
                              </span>
                            </div>

                            <button
                              onClick={() => {
                                setBookingTarget({
                                  property: prop,
                                  roomType: {
                                    id: rq.room_type_id,
                                    name: rq.name,
                                    capacity: rq.capacity,
                                    amenities: rq.amenities,
                                    base_price: rq.price_per_night
                                  },
                                  quote: rq
                                });
                              }}
                              disabled={!rq.is_available}
                              className="px-4 py-2 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-semibold text-xs shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {rq.is_available ? 'Reserve Now' : 'Unavailable'}
                            </button>
                          </div>

                          {/* Nightly Breakdown Accordion (If opened) */}
                          {isBreakdownOpen && rq.nightly_breakdown && (
                            <div className="pt-2 border-t border-sage-100 text-xs space-y-1">
                              <div className="text-[10px] font-semibold text-sage-600 mb-1">
                                Date-Specific Rate Itemization:
                              </div>
                              <div className="grid grid-cols-2 gap-1 text-[11px]">
                                {rq.nightly_breakdown.map((n) => (
                                  <div key={n.date} className="px-2 py-1 bg-sage-50 rounded-lg flex items-center justify-between">
                                    <span className="text-sage-600">{n.date}:</span>
                                    <strong className="text-forest-900">₹{Math.round(n.night_rate)}</strong>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 text-center py-4 text-xs text-sage-500">
                        Loading live rates for this property...
                      </div>
                    )}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Booking Modal */}
      {bookingTarget && (
        <BookingModal
          property={bookingTarget.property}
          roomType={bookingTarget.roomType}
          checkIn={checkIn}
          checkOut={checkOut}
          guests={guests}
          rooms={1}
          quote={bookingTarget.quote}
          onClose={() => setBookingTarget(null)}
          onBookingComplete={() => {
            // Re-fetch quotes to update room availability immediately
            fetchProperties();
          }}
        />
      )}

    </div>
  );
};

export default UserPropertiesPage;
