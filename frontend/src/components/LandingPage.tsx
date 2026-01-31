import React from 'react';
import { Link } from 'react-router-dom';

const features = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    ),
    title: 'Telegram Integration',
    description: 'Full bot support with media, replies, reactions, editing, and inline keyboards.',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
    ),
    title: 'Email Support',
    description: 'IMAP/SMTP email with subject threading, auto-detection of Gmail, Outlook, Yahoo.',
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
    ),
    title: 'Ticketing System',
    description: 'Create tickets from conversations with priority, SLA tracking, and assignment.',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    ),
    title: 'Team Management',
    description: 'Multi-agent support with role-based access, ticket routing, and workload balancing.',
    color: 'from-violet-500 to-purple-600',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
    ),
    title: 'Analytics Dashboard',
    description: 'Real-time KPIs, agent performance metrics, response times, and SLA compliance.',
    color: 'from-pink-500 to-rose-500',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    ),
    title: 'Secure & Self-hosted',
    description: 'Deploy on your own infrastructure. Full data ownership with encrypted credentials.',
    color: 'from-slate-600 to-slate-800',
  },
];

const steps = [
  { num: '1', title: 'Connect Channels', desc: 'Add your Telegram bot token and email credentials in seconds.' },
  { num: '2', title: 'Receive Messages', desc: 'All customer messages flow into a unified inbox in real-time.' },
  { num: '3', title: 'Resolve & Track', desc: 'Reply, create tickets, assign to agents, and track performance.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-surface-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent flex items-center justify-center text-white font-bold text-lg shadow-sm">
              T
            </div>
            <span className="text-xl font-bold text-surface-900">TeleDash</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 text-sm font-medium text-surface-600 hover:text-surface-900 transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors shadow-sm">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-50/50 to-transparent" />
        <div className="max-w-6xl mx-auto px-6 pt-20 pb-24 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-50 border border-brand-200 rounded-full text-sm text-brand-600 font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
              Unified Customer Support Platform
            </div>
            <h1 className="text-5xl font-extrabold text-surface-900 leading-tight mb-6">
              All your customer
              <br />
              conversations in
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-accent">one place</span>
            </h1>
            <p className="text-lg text-surface-500 mb-10 max-w-xl mx-auto leading-relaxed">
              Manage Telegram, Email, and more from a single dashboard.
              Ticketing, team collaboration, and analytics built in.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link to="/register" className="px-8 py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-all shadow-glow hover:shadow-lg text-base">
                Start Free
              </Link>
              <Link to="/login" className="px-8 py-3.5 bg-white border border-surface-200 text-surface-700 font-semibold rounded-xl transition-all hover:bg-surface-50 hover:border-surface-300 text-base">
                Sign In
              </Link>
            </div>
          </div>

          {/* Platform preview mockup */}
          <div className="mt-16 max-w-4xl mx-auto">
            <div className="bg-surface-900 rounded-2xl p-1.5 shadow-2xl">
              <div className="bg-surface-800 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-surface-700/50">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 text-center text-xs text-surface-400">teledash.app</div>
                </div>
                <div className="h-64 bg-gradient-to-br from-surface-50 to-surface-100 flex items-center justify-center">
                  <div className="flex gap-4 items-start">
                    <div className="w-16 bg-surface-800 rounded-lg h-48" />
                    <div className="w-56 bg-white rounded-lg h-48 shadow-sm border border-surface-100 p-3">
                      <div className="h-3 w-16 bg-surface-200 rounded mb-4" />
                      <div className="space-y-3">
                        {[1,2,3,4].map(i => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-accent" />
                            <div className="flex-1">
                              <div className="h-2.5 w-20 bg-surface-200 rounded" />
                              <div className="h-2 w-32 bg-surface-100 rounded mt-1" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="w-80 bg-white rounded-lg h-48 shadow-sm border border-surface-100 p-3">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600" />
                        <div className="h-3 w-24 bg-surface-200 rounded" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-start"><div className="h-8 w-40 bg-surface-100 rounded-xl rounded-bl-md" /></div>
                        <div className="flex justify-end"><div className="h-8 w-32 bg-brand-500 rounded-xl rounded-br-md" /></div>
                        <div className="flex justify-start"><div className="h-8 w-48 bg-surface-100 rounded-xl rounded-bl-md" /></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-surface-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-surface-900 mb-3">Everything you need</h2>
            <p className="text-surface-500 text-lg">A complete platform for customer communication and support</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-surface-100 hover:border-surface-200 hover:shadow-md transition-all">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-surface-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-surface-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-surface-900 mb-3">How it works</h2>
            <p className="text-surface-500 text-lg">Get up and running in minutes</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-brand-50 border-2 border-brand-200 flex items-center justify-center text-brand-600 font-bold text-xl mx-auto mb-4">
                  {step.num}
                </div>
                <h3 className="text-lg font-semibold text-surface-900 mb-2">{step.title}</h3>
                <p className="text-sm text-surface-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-brand-500 to-accent">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to unify your support?</h2>
          <p className="text-brand-100 text-lg mb-8">Start managing all your customer conversations from one place.</p>
          <Link to="/register" className="inline-block px-8 py-3.5 bg-white text-brand-600 font-semibold rounded-xl hover:bg-brand-50 transition-colors shadow-lg text-base">
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent flex items-center justify-center text-white font-bold text-sm">
              T
            </div>
            <span className="text-sm font-semibold text-surface-900">TeleDash</span>
          </div>
          <p className="text-sm text-surface-400">&copy; {new Date().getFullYear()} TeleDash. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
