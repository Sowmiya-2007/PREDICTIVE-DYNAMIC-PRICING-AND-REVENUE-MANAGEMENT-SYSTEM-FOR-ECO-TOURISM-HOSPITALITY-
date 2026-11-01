import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, MessageSquare } from 'lucide-react';
import PublicNavbar from '../../components/common/PublicNavbar';
import PublicFooter from '../../components/common/PublicFooter';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Full name is required.';
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'Valid email is required.';
    if (!formData.subject.trim()) errs.subject = 'Subject is required.';
    if (!formData.message.trim() || formData.message.length < 10) errs.message = 'Message must be at least 10 characters.';
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] flex flex-col">
      <PublicNavbar />

      <section className="bg-forest-950 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-forest-300 bg-forest-900 px-3 py-1 rounded-full border border-forest-800">
            Get In Touch
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Project Inquiries & Demonstration Feedback</h1>
          <p className="text-sm text-sage-300 max-w-xl mx-auto">
            Contact the project developers for technical review, academic feedback, or code repository inquiries.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          
          {/* Info Side */}
          <div className="md:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-sage-200 shadow-sm space-y-6">
              <h3 className="text-lg font-bold text-forest-950">Academic Project Contact</h3>
              
              <div className="space-y-4 text-xs text-sage-700">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-forest-100 text-forest-800 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-forest-900">Project Email</div>
                    <div>ecorev.project@academic.edu</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-forest-100 text-forest-800 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-forest-900">Project Focus Regions</div>
                    <div>Western Ghats, Wayanad, Nilgiris & Sundarbans Biosphere</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-forest-100 text-forest-800 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-forest-900">Demonstration Credentials</div>
                    <div>Hospitality Manager & Eco Tourist accounts available for immediate evaluation on the sign in page.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Side */}
          <div className="md:col-span-7">
            <div className="bg-white p-8 rounded-3xl border border-sage-200 shadow-sm">
              {submitted ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-forest-950">Message Submitted Successfully</h3>
                  <p className="text-xs text-sage-600 max-w-sm mx-auto">
                    Thank you for your feedback! Your inquiry has been received for the academic demonstration.
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({ name: '', email: '', subject: '', message: '' });
                    }}
                    className="mt-4 px-5 py-2.5 rounded-xl bg-forest-800 text-white text-xs font-semibold"
                  >
                    Send Another Note
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="text-lg font-bold text-forest-950 mb-4">Send a Message</h3>

                  <div>
                    <label className="block text-xs font-semibold text-forest-900 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Dr. Ramesh Kumar"
                      className={`w-full px-4 py-2.5 rounded-xl border text-xs focus:ring-2 focus:ring-forest-800 outline-none transition-all ${
                        errors.name ? 'border-rose-300 bg-rose-50/50' : 'border-sage-200'
                      }`}
                    />
                    {errors.name && <p className="text-[11px] text-rose-600 mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-forest-900 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. reviewer@university.edu"
                      className={`w-full px-4 py-2.5 rounded-xl border text-xs focus:ring-2 focus:ring-forest-800 outline-none transition-all ${
                        errors.email ? 'border-rose-300 bg-rose-50/50' : 'border-sage-200'
                      }`}
                    />
                    {errors.email && <p className="text-[11px] text-rose-600 mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-forest-900 mb-1">Subject</label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="e.g. Model Evaluation & Scraping Pipeline Question"
                      className={`w-full px-4 py-2.5 rounded-xl border text-xs focus:ring-2 focus:ring-forest-800 outline-none transition-all ${
                        errors.subject ? 'border-rose-300 bg-rose-50/50' : 'border-sage-200'
                      }`}
                    />
                    {errors.subject && <p className="text-[11px] text-rose-600 mt-1">{errors.subject}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-forest-900 mb-1">Message</label>
                    <textarea
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Your inquiry or project feedback..."
                      className={`w-full px-4 py-2.5 rounded-xl border text-xs focus:ring-2 focus:ring-forest-800 outline-none transition-all ${
                        errors.message ? 'border-rose-300 bg-rose-50/50' : 'border-sage-200'
                      }`}
                    />
                    {errors.message && <p className="text-[11px] text-rose-600 mt-1">{errors.message}</p>}
                  </div>

                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-semibold text-xs transition-colors shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Inquiry</span>
                  </button>
                </form>
              )}
            </div>
          </div>

        </div>
      </div>

      <PublicFooter />
    </div>
  );
};

export default ContactPage;
