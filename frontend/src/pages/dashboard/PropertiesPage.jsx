import React, { useState, useEffect } from 'react';
import {
  Home,
  Plus,
  Search,
  Filter,
  DollarSign,
  Users,
  Star,
  MapPin,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  Leaf
} from 'lucide-react';
import DashboardHeader from '../../components/common/DashboardHeader';
import { propertyService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const PropertiesPage = () => {
  const [properties, setProperties] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const { isAdmin } = useAuth();

  // Form State for Add Property
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    state_or_region: '',
    description: '',
    eco_category: 'Forest Eco-Lodge',
    base_price: 3500,
    min_price: 2000,
    max_price: 8500,
    total_capacity: 16,
    sustainability_rating: 4.8
  });
  const [formErrors, setFormErrors] = useState({});

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const res = await propertyService.list({
        search: search.trim() || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined
      });
      if (res.data.success) {
        setProperties(res.data.properties);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [categoryFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProperties();
  };

  const handleOpenDetail = async (propId) => {
    try {
      const res = await propertyService.get(propId);
      if (res.data.success) {
        setSelectedProperty(res.data.property);
        setIsDetailModalOpen(true);
      }
    } catch (err) {
      setToast({ type: 'error', text: 'Failed to load property details.' });
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await propertyService.create(formData);
      if (res.data.success) {
        setToast({ type: 'success', text: `Property "${formData.name}" added successfully!` });
        setIsAddModalOpen(false);
        setFormData({
          name: '',
          location: '',
          state_or_region: '',
          description: '',
          eco_category: 'Forest Eco-Lodge',
          base_price: 3500,
          min_price: 2000,
          max_price: 8500,
          total_capacity: 16,
          sustainability_rating: 4.8
        });
        fetchProperties();
      }
    } catch (err) {
      setToast({ type: 'error', text: err.response?.data?.message || 'Failed to create property.' });
    } finally {
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <div className="flex-1 pb-16 bg-[#F8F6F0]">
      <DashboardHeader
        title="Eco Properties & Room Inventory"
        subtitle="Manage sustainable hospitality accommodations, pricing floors, ceilings, and room types"
        onRefresh={fetchProperties}
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

        {/* Action & Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-sage-200 shadow-card flex flex-wrap items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-charcoal-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search eco lodges, treehouses, regions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-sage-50 border border-sage-200 rounded-xl text-xs text-charcoal-800 placeholder-charcoal-400 focus:ring-2 focus:ring-forest-700 outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-sage-100 hover:bg-sage-200 text-charcoal-800 text-xs font-semibold transition-colors shrink-0"
            >
              Search
            </button>
          </form>

          <div className="flex items-center gap-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs bg-sage-50 border border-sage-200 rounded-xl px-3 py-2 text-charcoal-800 font-medium focus:ring-2 focus:ring-forest-700 outline-none cursor-pointer"
            >
              <option value="all">All Eco Categories</option>
              <option value="Forest Eco-Lodge">Forest Eco-Lodge</option>
              <option value="Backwater Eco-Resort">Backwater Eco-Resort</option>
              <option value="Treehouse Retreat">Treehouse Retreat</option>
              <option value="Tea Plantation Villa">Tea Plantation Villa</option>
              <option value="Wildlife Sanctuary Camp">Wildlife Sanctuary Camp</option>
            </select>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="btn-primary flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Add Eco Property</span>
            </button>
          </div>
        </div>

        {/* Properties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((prop) => (
            <div
              key={prop.id}
              className="premium-card p-6 flex flex-col justify-between space-y-4 hover:border-forest-300 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-forest-50 text-forest-800 border border-forest-100">
                      {prop.eco_category}
                    </span>
                    <h3 className="text-base font-bold text-charcoal-900 mt-1.5 leading-snug">{prop.name}</h3>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/60 text-xs font-bold font-mono-num">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                    <span>{prop.sustainability_rating || '4.8'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-charcoal-500">
                  <MapPin className="w-3.5 h-3.5 text-forest-700 shrink-0" />
                  <span className="truncate">{prop.location} ({prop.state_or_region || 'South India'})</span>
                </div>

                <p className="text-xs text-charcoal-600 line-clamp-2 leading-relaxed">
                  {prop.description || 'Authentic eco-tourism sanctuary integrated with zero-waste natural habitat and local conservation.'}
                </p>

                {/* Price corridor bounds */}
                <div className="p-3 rounded-xl bg-sage-50/80 border border-sage-200/80 space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-charcoal-500">Base Nightly Rate:</span>
                    <strong className="text-charcoal-900 font-mono-num font-bold">₹{prop.base_price?.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-charcoal-500">
                    <span>ML Corridor Range:</span>
                    <span className="font-mono-num font-medium text-emerald-800">
                      ₹{prop.min_price?.toLocaleString()} — ₹{prop.max_price?.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-sage-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-charcoal-500">
                  <Users className="w-3.5 h-3.5 text-sage-400" />
                  <span>Max {prop.total_capacity || 16} guests</span>
                </div>

                <button
                  onClick={() => handleOpenDetail(prop.id)}
                  className="px-3 py-1.5 rounded-lg bg-sage-100 hover:bg-forest-100 hover:text-forest-900 text-charcoal-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inventory Details</span>
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Add Property Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-charcoal-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-sage-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-sage-100">
              <h3 className="text-base font-bold text-charcoal-900">Add New Eco Property</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded-lg text-charcoal-400 hover:bg-sage-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-charcoal-800 mb-1">Property Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Periyar Canopy Eco Lodge"
                  className="w-full bg-sage-50 border border-sage-200 rounded-xl px-3 py-2 text-charcoal-900 focus:ring-2 focus:ring-forest-700 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-charcoal-800 mb-1">Location District</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Thekkady, Kerala"
                    className="w-full bg-sage-50 border border-sage-200 rounded-xl px-3 py-2 text-charcoal-900 focus:ring-2 focus:ring-forest-700 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-charcoal-800 mb-1">State / Region</label>
                  <input
                    type="text"
                    value={formData.state_or_region}
                    onChange={(e) => setFormData({ ...formData, state_or_region: e.target.value })}
                    placeholder="e.g. Kerala"
                    className="w-full bg-sage-50 border border-sage-200 rounded-xl px-3 py-2 text-charcoal-900 focus:ring-2 focus:ring-forest-700 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-charcoal-800 mb-1">Eco Tourism Category</label>
                <select
                  value={formData.eco_category}
                  onChange={(e) => setFormData({ ...formData, eco_category: e.target.value })}
                  className="w-full bg-sage-50 border border-sage-200 rounded-xl px-3 py-2 text-charcoal-900 focus:ring-2 focus:ring-forest-700 outline-none"
                >
                  <option value="Forest Eco-Lodge">Forest Eco-Lodge</option>
                  <option value="Backwater Eco-Resort">Backwater Eco-Resort</option>
                  <option value="Treehouse Retreat">Treehouse Retreat</option>
                  <option value="Tea Plantation Villa">Tea Plantation Villa</option>
                  <option value="Wildlife Sanctuary Camp">Wildlife Sanctuary Camp</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-charcoal-800 mb-1">Base Price (₹)</label>
                  <input
                    type="number"
                    value={formData.base_price}
                    onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) })}
                    className="w-full bg-sage-50 border border-sage-200 rounded-xl px-3 py-2 text-charcoal-900 focus:ring-2 focus:ring-forest-700 outline-none font-mono-num"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-charcoal-800 mb-1">Floor Guardrail (₹)</label>
                  <input
                    type="number"
                    value={formData.min_price}
                    onChange={(e) => setFormData({ ...formData, min_price: parseFloat(e.target.value) })}
                    className="w-full bg-sage-50 border border-sage-200 rounded-xl px-3 py-2 text-charcoal-900 focus:ring-2 focus:ring-forest-700 outline-none font-mono-num"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-charcoal-800 mb-1">Ceiling Guardrail (₹)</label>
                  <input
                    type="number"
                    value={formData.max_price}
                    onChange={(e) => setFormData({ ...formData, max_price: parseFloat(e.target.value) })}
                    className="w-full bg-sage-50 border border-sage-200 rounded-xl px-3 py-2 text-charcoal-900 focus:ring-2 focus:ring-forest-700 outline-none font-mono-num"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-charcoal-800 mb-1">Eco Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="2"
                  className="w-full bg-sage-50 border border-sage-200 rounded-xl p-2.5 text-charcoal-900 focus:ring-2 focus:ring-forest-700 outline-none"
                  placeholder="Describe sustainability features..."
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
                  Create Property
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Property Details Modal */}
      {isDetailModalOpen && selectedProperty && (
        <div className="fixed inset-0 z-50 bg-charcoal-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-sage-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-sage-100">
              <div>
                <h3 className="text-base font-bold text-charcoal-900">{selectedProperty.name}</h3>
                <p className="text-xs text-charcoal-500">{selectedProperty.location} • {selectedProperty.eco_category}</p>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="p-1 rounded-lg text-charcoal-400 hover:bg-sage-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-sage-50 border border-sage-200">
                  <span className="text-charcoal-400 block text-[10px]">Base Rate</span>
                  <strong className="text-charcoal-900 font-mono-num text-sm">₹{selectedProperty.base_price}</strong>
                </div>
                <div className="p-3 rounded-xl bg-sage-50 border border-sage-200">
                  <span className="text-charcoal-400 block text-[10px]">Floor Bound</span>
                  <strong className="text-charcoal-900 font-mono-num text-sm">₹{selectedProperty.min_price}</strong>
                </div>
                <div className="p-3 rounded-xl bg-sage-50 border border-sage-200">
                  <span className="text-charcoal-400 block text-[10px]">Ceiling Bound</span>
                  <strong className="text-charcoal-900 font-mono-num text-sm">₹{selectedProperty.max_price}</strong>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-charcoal-800 mb-2">Room Inventory & Current Selling Rates</h4>
                <div className="space-y-2">
                  {selectedProperty.room_types?.map((rt) => (
                    <div key={rt.id} className="p-3 rounded-xl bg-sage-50/70 border border-sage-200 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-charcoal-900">{rt.name}</div>
                        <div className="text-[10px] text-charcoal-500">{rt.capacity} Guests • {rt.total_rooms} Units</div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold font-mono-num text-forest-900">₹{rt.current_price || rt.base_price}</span>
                        <span className="text-[9px] text-charcoal-400 block">/ night</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-sage-100">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="btn-primary px-5 py-2 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PropertiesPage;
