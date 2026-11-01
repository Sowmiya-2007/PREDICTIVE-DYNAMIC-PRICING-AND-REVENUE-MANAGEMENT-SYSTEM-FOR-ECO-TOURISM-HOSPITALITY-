import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck,
  Calendar,
  Users,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  TreePine,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { bookingService } from '../../services/api';

const MyBookingsPage = () => {
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' or 'past'
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [pastBookings, setPastBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await bookingService.getMyBookings();
      if (res.data.success) {
        setUpcomingBookings(res.data.upcoming || []);
        setPastBookings(res.data.past || []);
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancelBooking = async (bookingId, bookingCode) => {
    if (!window.confirm(`Are you sure you want to cancel reservation ${bookingCode}? According to policy, your reserved rooms will be released back to nature sanctuary inventory.`)) {
      return;
    }

    setCancellingId(bookingId);
    try {
      const res = await bookingService.cancel(bookingId);
      if (res.data.success) {
        setActionMessage({
          type: 'success',
          text: `Reservation ${bookingCode} was successfully cancelled.`
        });
        fetchBookings();
      } else {
        setActionMessage({
          type: 'error',
          text: res.data.message || 'Cancellation could not be completed.'
        });
      }
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to cancel reservation.'
      });
    } finally {
      setCancellingId(null);
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  const currentList = activeTab === 'upcoming' ? upcomingBookings : pastBookings;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-forest-800 uppercase tracking-wider">
            <CalendarCheck className="w-4 h-4" />
            <span>Customer Itinerary</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-forest-950 tracking-tight mt-1">
            My Nature Stays & Reservations
          </h1>
          <p className="text-xs sm:text-sm text-sage-600 mt-1">
            Review your upcoming eco-tourism visits, reservation details, and booking references.
          </p>
        </div>

        <Link
          to="/user/properties"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-semibold text-xs shadow-md transition-all self-start sm:self-auto"
        >
          <TreePine className="w-4 h-4" />
          <span>Book Another Retreat</span>
        </Link>
      </div>

      {/* Action Notification Message */}
      {actionMessage && (
        <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2.5 border ${
          actionMessage.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {actionMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-sage-200 pb-3">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'upcoming'
              ? 'bg-forest-800 text-white shadow-sm'
              : 'bg-sage-100 text-sage-700 hover:text-forest-950'
          }`}
        >
          <span>Upcoming Stays</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'upcoming' ? 'bg-forest-950 text-white' : 'bg-white text-sage-800'}`}>
            {upcomingBookings.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('past')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'past'
              ? 'bg-forest-800 text-white shadow-sm'
              : 'bg-sage-100 text-sage-700 hover:text-forest-950'
          }`}
        >
          <span>Past & Cancelled</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'past' ? 'bg-forest-950 text-white' : 'bg-white text-sage-800'}`}>
            {pastBookings.length}
          </span>
        </button>

        <button
          onClick={fetchBookings}
          className="ml-auto text-xs text-sage-600 hover:text-forest-900 flex items-center gap-1 font-semibold"
          title="Refresh Bookings"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-44 rounded-3xl bg-sage-100 animate-pulse"></div>
          ))}
        </div>
      ) : currentList.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-sage-200 space-y-4">
          <CalendarCheck className="w-12 h-12 text-sage-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-forest-950">
              No {activeTab === 'upcoming' ? 'upcoming' : 'past'} reservations
            </h3>
            <p className="text-xs text-sage-600 max-w-sm mx-auto">
              {activeTab === 'upcoming'
                ? "You don't have any nature stays scheduled yet. Discover certified eco-lodges today."
                : "Your past accommodation and travel history will appear here once completed."}
            </p>
          </div>
          {activeTab === 'upcoming' && (
            <Link
              to="/user/properties"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-semibold text-xs transition-colors"
            >
              <span>Explore Nature Sanctuaries</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {currentList.map((b) => {
            const isConfirmed = b.booking_status === 'confirmed';
            const isCancelled = b.booking_status === 'cancelled';
            const isCompleted = b.booking_status === 'completed';

            return (
              <div
                key={b.id}
                className="bg-white rounded-3xl p-6 border border-sage-200 shadow-md hover:shadow-lg transition-all space-y-4"
              >
                {/* Top Row: Property & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-sage-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-forest-100 text-forest-800 flex items-center justify-center shrink-0">
                      <TreePine className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-forest-950">{b.property_name}</h3>
                      <p className="text-xs text-sage-600">{b.room_type_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status Badge */}
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                      isConfirmed
                        ? 'bg-emerald-100 text-emerald-800'
                        : isCancelled
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-sage-100 text-sage-700'
                    }`}>
                      {isConfirmed && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {isCancelled && <XCircle className="w-3.5 h-3.5" />}
                      {isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span>{b.booking_status}</span>
                    </span>

                    {/* Booking Reference Chip */}
                    <span className="px-3 py-1 rounded-xl bg-sage-50 border border-sage-200 text-forest-900 font-mono text-xs font-bold">
                      {b.booking_code}
                    </span>
                  </div>
                </div>

                {/* Stay Dates and Pricing Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-sage-50/70 border border-sage-200/60">
                    <span className="text-[10px] text-sage-500 uppercase font-semibold block">Check-in</span>
                    <strong className="text-forest-950 text-sm">{b.check_in_date}</strong>
                    {b.days_until_checkin !== null && b.days_until_checkin >= 0 && (
                      <span className="text-[10px] text-forest-700 font-medium block mt-0.5">
                        (In {b.days_until_checkin} days)
                      </span>
                    )}
                  </div>

                  <div className="p-3 rounded-2xl bg-sage-50/70 border border-sage-200/60">
                    <span className="text-[10px] text-sage-500 uppercase font-semibold block">Check-out</span>
                    <strong className="text-forest-950 text-sm">{b.check_out_date}</strong>
                  </div>

                  <div className="p-3 rounded-2xl bg-sage-50/70 border border-sage-200/60">
                    <span className="text-[10px] text-sage-500 uppercase font-semibold block">Party Size</span>
                    <strong className="text-forest-950 text-sm">{b.num_guests} Guests</strong>
                    <span className="text-[10px] text-sage-500 block mt-0.5">{b.rooms_booked} Room(s)</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-forest-50/80 border border-forest-100 text-right">
                    <span className="text-[10px] text-forest-700 uppercase font-semibold block">Total Reserved</span>
                    <strong className="text-forest-950 text-base font-black">₹{Math.round(b.total_price).toLocaleString()}</strong>
                    <span className="text-[10px] text-sage-500 block mt-0.5">₹{Math.round(b.price_per_night).toLocaleString()} / night</span>
                  </div>
                </div>

                {/* Special Requests (If provided) */}
                {b.special_requests && (
                  <div className="text-xs text-sage-700 bg-sage-50/50 p-2.5 rounded-xl border border-sage-200/60">
                    <span className="font-semibold text-forest-900">Sanctuary Request:</span> {b.special_requests}
                  </div>
                )}

                {/* Footer Actions & Cancellation Rule */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-sage-500">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-forest-700" />
                    <span>Free cancellation permitted until check-in date. Room inventory automatically restored.</span>
                  </div>

                  {b.is_cancellable && (
                    <button
                      onClick={() => handleCancelBooking(b.id, b.booking_code)}
                      disabled={cancellingId === b.id}
                      className="px-4 py-2 rounded-xl text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 text-xs font-semibold transition-colors disabled:opacity-50 self-end sm:self-auto"
                    >
                      {cancellingId === b.id ? 'Cancelling...' : 'Cancel Reservation'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

export default MyBookingsPage;
