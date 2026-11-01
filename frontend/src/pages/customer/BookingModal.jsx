import React, { useState } from 'react';
import {
  X,
  Calendar,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  TreePine,
  ShieldCheck,
  CreditCard,
  ArrowRight,
  Info
} from 'lucide-react';
import { bookingService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const BookingModal = ({
  property,
  roomType,
  checkIn,
  checkOut,
  guests = 2,
  rooms = 1,
  quote,
  onClose,
  onBookingComplete
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [guestName, setGuestName] = useState(user?.full_name || '');
  const [guestEmail, setGuestEmail] = useState(user?.email || '');
  const [specialRequests, setSpecialRequests] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  const nightsCount = quote?.nights_count || Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)));
  const pricePerNight = quote?.price_per_night || roomType?.base_price || property?.base_price;
  const totalPrice = quote?.total_stay_cost || (pricePerNight * nightsCount * rooms);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        property_id: property.id,
        room_type_id: roomType.id,
        check_in_date: checkIn,
        check_out_date: checkOut,
        num_guests: Number(guests),
        rooms_booked: Number(rooms),
        special_requests: specialRequests.trim()
      };

      const res = await bookingService.create(payload);
      if (res.data.success) {
        setConfirmedBooking(res.data.booking);
        if (onBookingComplete) onBookingComplete(res.data.booking);
      } else {
        setError(res.data.message || 'Booking could not be confirmed.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to complete reservation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-forest-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-sage-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-forest-900 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest-800 text-forest-200 flex items-center justify-center">
              <TreePine className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {confirmedBooking ? 'Reservation Confirmed!' : 'Confirm Eco-Tourism Reservation'}
              </h2>
              <p className="text-xs text-sage-300">
                {property?.name} • {property?.location}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-forest-800/80 hover:bg-forest-800 text-sage-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        {confirmedBooking ? (
          /* Confirmation Success State */
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                Confirmed & Guaranteed
              </span>
              <h3 className="text-2xl font-black text-forest-950">Pack your bags for Nature!</h3>
              <p className="text-xs text-sage-600 max-w-md mx-auto">
                Your reservation at <strong className="text-forest-900">{property?.name}</strong> has been saved directly to the conservation registry.
              </p>
            </div>

            {/* Booking Code Card */}
            <div className="bg-sage-50 border border-sage-200 rounded-2xl p-4 max-w-md mx-auto space-y-2">
              <div className="text-[11px] font-semibold text-sage-500 uppercase tracking-wider">
                Unique Booking Reference
              </div>
              <div className="text-2xl font-black text-forest-900 font-mono tracking-widest">
                {confirmedBooking.booking_code}
              </div>
              <p className="text-[11px] text-sage-500">
                A confirmation has been linked to <span className="font-semibold text-forest-900">{confirmedBooking.guest_email}</span>.
              </p>
            </div>

            {/* Stay Summary Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left max-w-md mx-auto text-xs bg-white border border-sage-200 rounded-xl p-3">
              <div>
                <span className="text-sage-500 text-[10px] block">Check-in</span>
                <strong className="text-forest-950">{confirmedBooking.check_in_date}</strong>
              </div>
              <div>
                <span className="text-sage-500 text-[10px] block">Check-out</span>
                <strong className="text-forest-950">{confirmedBooking.check_out_date}</strong>
              </div>
              <div>
                <span className="text-sage-500 text-[10px] block">Guests</span>
                <strong className="text-forest-950">{confirmedBooking.num_guests} Guest(s)</strong>
              </div>
              <div>
                <span className="text-sage-500 text-[10px] block">Total Amount</span>
                <strong className="text-forest-900">₹{confirmedBooking.total_price?.toLocaleString()}</strong>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  onClose();
                  navigate('/user/bookings');
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Go to My Bookings</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-sage-100 hover:bg-sage-200 text-forest-900 font-semibold text-xs transition-colors"
              >
                Explore More Lodges
              </button>
            </div>
          </div>
        ) : (
          /* Booking Confirmation Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Selected Room & Stay Overview */}
            <div className="bg-sage-50/80 rounded-2xl p-4 border border-sage-200/80 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-sage-200">
                <div>
                  <h4 className="text-sm font-bold text-forest-950">{roomType?.name}</h4>
                  <p className="text-xs text-sage-600">{roomType?.amenities || 'Eco-Sanctuary Room'}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-sage-500">Live Approved Rate</span>
                  <div className="text-base font-black text-forest-900">₹{Math.round(pricePerNight).toLocaleString()} <span className="text-[11px] font-normal text-sage-600">/ night</span></div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-sage-200/70">
                  <Calendar className="w-3.5 h-3.5 text-forest-700 shrink-0" />
                  <div>
                    <span className="text-[10px] text-sage-500 block">Check-in</span>
                    <strong className="text-forest-950">{checkIn}</strong>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-sage-200/70">
                  <Calendar className="w-3.5 h-3.5 text-forest-700 shrink-0" />
                  <div>
                    <span className="text-[10px] text-sage-500 block">Check-out</span>
                    <strong className="text-forest-950">{checkOut}</strong>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-sage-200/70">
                  <Users className="w-3.5 h-3.5 text-forest-700 shrink-0" />
                  <div>
                    <span className="text-[10px] text-sage-500 block">Stay Details</span>
                    <strong className="text-forest-950">{nightsCount} night(s)</strong>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-sage-200/70">
                  <Users className="w-3.5 h-3.5 text-forest-700 shrink-0" />
                  <div>
                    <span className="text-[10px] text-sage-500 block">Guests</span>
                    <strong className="text-forest-950">{guests} Guest(s)</strong>
                  </div>
                </div>
              </div>

              {/* Night-by-night breakdown preview if available */}
              {quote?.nightly_breakdown && quote.nightly_breakdown.length > 0 && (
                <div className="pt-2 text-xs border-t border-sage-200">
                  <div className="text-[11px] font-semibold text-sage-600 mb-1.5 flex items-center gap-1">
                    <Info className="w-3 h-3 text-forest-700" />
                    <span>Night-by-Night Dynamic Price Breakdown:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {quote.nightly_breakdown.map((n) => (
                      <div key={n.date} className="px-2 py-1 rounded-lg bg-white border border-sage-200 text-[11px] flex items-center gap-1.5">
                        <span className="text-sage-600">{n.date.slice(5)}:</span>
                        <strong className="text-forest-900">₹{Math.round(n.night_rate)}</strong>
                        {n.event_notice && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-800" title={n.event_notice}>
                            Festival
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Guest Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-forest-950 uppercase tracking-wide">
                Guest Contact Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-sage-700 mb-1">Primary Guest Name</label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-sage-200 text-xs focus:ring-2 focus:ring-forest-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-sage-700 mb-1">Confirmation Email</label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-sage-200 text-xs focus:ring-2 focus:ring-forest-800 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-sage-700 mb-1">
                  Special Sanctuary Requests <span className="text-sage-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="e.g., Organic vegan meals, ground-floor access, birdwatching guide"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-sage-200 text-xs focus:ring-2 focus:ring-forest-800 outline-none"
                />
              </div>
            </div>

            {/* Price Itemization & Demonstration Guarantee Notice */}
            <div className="bg-forest-50/70 rounded-2xl p-4 border border-forest-100 space-y-2">
              <div className="flex items-center justify-between text-xs text-sage-700">
                <span>Room Subtotal ({nightsCount} night{nightsCount > 1 ? 's' : ''} × {rooms} room{rooms > 1 ? 's' : ''})</span>
                <span className="font-semibold text-forest-950">₹{Math.round(totalPrice).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-sage-700">
                <span>Ecological Sanctuary Conservation Levy</span>
                <span className="font-semibold text-emerald-800">Included (100% Direct)</span>
              </div>
              <div className="pt-2 border-t border-forest-200/60 flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-forest-950">Estimated Total Amount</span>
                  <p className="text-[10px] text-sage-500">Pay at property during check-in</p>
                </div>
                <span className="text-xl font-black text-forest-900">₹{Math.round(totalPrice).toLocaleString()}</span>
              </div>
            </div>

            {/* Demonstration Reservation Banner */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/80 border border-amber-200/70 text-[11px] text-amber-900">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong>Demonstration Eco-Reservation Mode:</strong> No credit card or actual payment is required. This reservation will be immediately validated against live room inventory and registered in the database.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-sage-700 hover:bg-sage-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-semibold text-xs shadow-md shadow-forest-950/10 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{loading ? 'Confirming with Sanctuary...' : 'Confirm Demonstration Reservation'}</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};

export default BookingModal;
