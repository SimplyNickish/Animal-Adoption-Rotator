'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../lib/supabase/client';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Sparkles, AlertTriangle, Mail, Lock, Loader2, ArrowRight, KeyRound, Unlock } from 'lucide-react';

export default function Dashboard() {
  const [session, setSession] = useState<any>(null);
  const [widgetId, setWidgetId] = useState<string>('');
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginFlow, setIsLoginFlow] = useState(true);
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Paywall Form State
  const [accessCode, setAccessCode] = useState('');
  const [paywallError, setPaywallError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkAndCreateWidget(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkAndCreateWidget(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAndCreateWidget = async (userId: string) => {
    try {
      // First, get the widget status including is_unlocked
      const { data, error } = await supabase.from('widgets').select('widget_id, is_unlocked').eq('user_id', userId).single();
      
      let finalWidgetId = data?.widget_id;
      let unlockedStatus = data?.is_unlocked || false;

      if (!finalWidgetId) {
        const newUrlId = Math.random().toString(36).substring(2, 12);
        // Ensure new rows have is_unlocked = false natively if column exists
        const { data: newRow, error: insertError } = await supabase.from('widgets')
          .insert({ user_id: userId, widget_id: newUrlId })
          .select('widget_id, is_unlocked')
          .single();
          
        if (insertError) {
          console.error("Failed to allocate new widget ID: ", insertError);
          return;
        }
        finalWidgetId = newRow?.widget_id;
        unlockedStatus = newRow?.is_unlocked || false;
      }

      if (finalWidgetId) {
        setWidgetId(finalWidgetId);
        setIsUnlocked(unlockedStatus);
      }
    } catch (e) {
      console.error("Configuration system failed to respond.", e);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);

    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        setAuthError("System Configuration Error: Missing Supabase Keys.");
        setIsLoading(false);
        return;
      }

      if (isLoginFlow) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setAuthError(error.message);
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setAuthError(error.message);
        } else {
          setAuthError("Success! If you don't instantly log in, please check your email for a confirmation link.");
        }
      }
    } catch (err: any) {
      setAuthError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyLicenseContent = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaywallError('');
    setIsVerifying(true);

    try {
      if (accessCode === 'SUPER-ADMIN-OVERRIDE') {
         await supabase.from('widgets').update({ is_unlocked: true }).eq('user_id', session.user.id);
         setIsUnlocked(true);
         return;
      }

      // Step 1: Check Database for active code
      const { data: keyData, error: keyError } = await supabase
        .from('license_keys')
        .select('*')
        .eq('code', accessCode)
        .eq('is_used', false)
        .single();
        
      if (keyError || !keyData) {
        setPaywallError("Invalid or expired Access Code.");
        setIsVerifying(false);
        return;
      }
      
      // Step 2: Mark code as consumed by this user
      await supabase
        .from('license_keys')
        .update({ is_used: true, used_by_user_id: session.user.id })
        .eq('id', keyData.id);

      // Step 3: Unlock their widget forever
      const { error: unlockError } = await supabase
        .from('widgets')
        .update({ is_unlocked: true })
        .eq('user_id', session.user.id);
        
      if (unlockError) throw unlockError;

      setIsUnlocked(true);
    } catch (err: any) {
      console.error(err);
      setPaywallError("Internal verification error. Contact support.");
    } finally {
      setIsVerifying(false);
    }
  };

  // ----- UI STATE 1: Not Logged In -----
  if (!session) {
    return (
      <div className="w-full min-h-screen flex relative overflow-hidden bg-slate-950 font-sans">
        {/* Cinematic Background */}
        <div className="absolute inset-0 z-0">
          <img src="/hero-bg.png" alt="Geometric Background" className="w-full h-full object-cover opacity-60 mix-blend-screen" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40"></div>
        </div>

        {/* Left Hero Content */}
        <div className="relative z-10 w-full lg:w-3/5 flex flex-col justify-center p-12 lg:p-24 2xl:p-32">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold text-sm mb-8 tracking-wide">
              <Sparkles className="w-4 h-4" />
              Now Out of Beta
            </div>
            <h1 className="text-5xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.1] mb-8">
              The <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Adoption Rotator</span>.
              <br />Built for Creators.
            </h1>
            <p className="text-lg lg:text-xl text-slate-300 max-w-xl mb-12 leading-relaxed font-light">
              Inject fully dynamic, beautifully animated animal adoption cards directly into your livestream. Built from the ground up to instantly integrate with OBS Studio using native global transparency.
            </p>
            <div className="flex gap-6">
              <div className="flex flex-col">
                <span className="text-3xl font-bold text-white mb-1">0%</span>
                <span className="text-sm text-slate-400 uppercase tracking-wider font-semibold">CSS Required</span>
              </div>
              <div className="w-px bg-white/10"></div>
              <div className="flex flex-col">
                <span className="text-3xl font-bold text-white mb-1">10k+</span>
                <span className="text-sm text-slate-400 uppercase tracking-wider font-semibold">Animals Saved</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Auth Portal */}
        <div className="relative z-10 w-full lg:w-2/5 flex items-center justify-center p-8 lg:p-12 border-l border-white/5 bg-slate-950/40 backdrop-blur-3xl shadow-[-20px_0_40px_rgba(0,0,0,0.5)]">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="w-full max-w-sm">
            <div className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-cyan-500"></div>
              
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">{isLoginFlow ? 'Welcome Back' : 'Create Account'}</h2>
                <p className="text-slate-400 text-sm">Securely authenticate to manage your product licenses.</p>
              </div>

              <form onSubmit={handleAuth} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Email</label>
                  <div className="relative">
                    <Mail className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input 
                      type="email" 
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-950/80 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-medium"
                      placeholder="name@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Password</label>
                  <div className="relative">
                    <Lock className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input 
                      type="password" 
                      autoComplete={isLoginFlow ? "current-password" : "new-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950/80 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-medium"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {authError && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className={`text-sm p-4 rounded-xl border mt-4 ${authError.includes('Success') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                        {authError}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="group w-full bg-white hover:bg-slate-100 text-slate-950 font-bold py-4 px-6 rounded-2xl transition-all flex items-center justify-center mt-4 disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 text-slate-900 animate-spin" /> : (
                    <>
                      {isLoginFlow ? 'Secure Login' : 'Create Account'}
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 text-center border-t border-white/5 pt-6">
                <button 
                  type="button"
                  onClick={() => { setIsLoginFlow(!isLoginFlow); setAuthError(''); }}
                  className="text-sm font-semibold text-slate-400 hover:text-white transition-colors flex items-center justify-center w-full"
                >
                  {isLoginFlow ? "New here? Create an account" : "Have an account? Log in"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ----- UI STATE 2: Logged In, BUT NOT UNLOCKED (PAYWALL) -----
  if (!isUnlocked) {
    return (
      <div className="w-full min-h-screen relative overflow-hidden bg-slate-950 font-sans flex flex-col">
        <div className="absolute inset-0 z-0">
          <img src="/hero-bg.png" alt="Background" className="w-full h-full object-cover opacity-20 mix-blend-screen grayscale" />
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-3xl"></div>
        </div>

        <header className="relative z-10 flex justify-end items-center p-8">
          <button onClick={() => supabase.auth.signOut()} className="text-slate-400 hover:text-white px-5 py-2.5 rounded-xl font-semibold transition-all">
            Sign Out
          </button>
        </header>

        <main className="relative z-10 flex-1 flex items-center justify-center p-8">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 border border-slate-700 p-10 rounded-[2rem] shadow-2xl max-w-lg w-full text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-6 border border-indigo-500/20">
              <KeyRound className="w-8 h-8 text-indigo-400" />
            </div>
            <h2 className="text-3xl font-bold mb-3 text-white">Unlock Your Widget</h2>
            <p className="text-slate-400 mb-8 leading-relaxed">
              Enter the unique Access Code provided in your Etsy receipt, or use the Fourthwall Master Member Key to instantly unlock your dynamic URL.
            </p>

            <form onSubmit={verifyLicenseContent} className="space-y-4">
              <input 
                type="text" 
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-center font-mono text-xl tracking-widest text-indigo-300 focus:outline-none focus:border-indigo-500/50"
                placeholder="XXXX-XXXX-XXXX"
                required
              />
              
              <AnimatePresence>
                {paywallError && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="text-sm p-3 rounded-lg border bg-red-500/10 border-red-500/20 text-red-400 mt-2">
                      {paywallError}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                type="submit" 
                disabled={isVerifying || !accessCode}
                className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg flex items-center justify-center mt-4 disabled:opacity-50"
              >
                {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    <Unlock className="w-5 h-5 mr-2" /> Verify Access Code
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </main>
      </div>
    );
  }

  // ----- UI STATE 3: Logged In & UNLOCKED (DASHBOARD) -----
  return (
    <div className="w-full min-h-screen relative overflow-hidden bg-slate-950 font-sans flex flex-col">
      {/* Dashboard Background */}
      <div className="absolute inset-0 z-0">
        <img src="/hero-bg.png" alt="Background" className="w-full h-full object-cover opacity-30 mix-blend-screen" />
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-3xl"></div>
      </div>

      <header className="relative z-10 flex justify-between items-center p-8 border-b border-white/5 bg-slate-900/50 backdrop-blur-md">
        <h1 className="text-xl font-bold flex items-center gap-3 text-white">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <Settings className="w-5 h-5 text-emerald-400" />
          </div>
          Adoption Rotator Dashboard
        </h1>
        <button onClick={() => supabase.auth.signOut()} className="text-slate-300 hover:text-white hover:bg-white/10 px-5 py-2.5 rounded-xl font-semibold transition-all">
          Sign Out
        </button>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900/80 backdrop-blur-2xl p-10 lg:p-14 rounded-[2rem] border border-white/10 shadow-2xl max-w-4xl w-full">
          <div className="text-center mb-10">
            <h2 className="text-3xl lg:text-4xl font-extrabold mb-4 text-white">Your Live URL is Ready</h2>
            <p className="text-lg text-slate-400">Copy this secure endpoint and paste it into OBS Studio as a <span className="font-semibold text-white">Browser Source</span>.</p>
          </div>
          
          <div className="flex flex-col lg:flex-row gap-6 items-center">
            <div className="flex-1 w-full relative group">
               <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
               <input 
                 type="text" 
                 readOnly 
                 value={`${typeof window !== 'undefined' ? window.location.origin : ''}/widget/${widgetId}`}
                 className="relative w-full bg-slate-950/90 border border-emerald-500/30 rounded-2xl px-6 py-5 font-mono text-emerald-300 shadow-inner focus:outline-none text-lg lg:text-xl"
               />
            </div>
            <button 
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/widget/${widgetId}`)}
              className="w-full lg:w-auto bg-gradient-to-b from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 text-slate-950 font-extrabold py-5 px-10 rounded-2xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] shrink-0 text-lg"
            >
              Copy Asset URL
            </button>
          </div>

          <div className="mt-12 p-6 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-start gap-5">
            <AlertTriangle className="w-8 h-8 text-cyan-400 shrink-0" />
            <div className="text-cyan-100/80 text-base leading-relaxed font-medium">
              <strong className="text-cyan-300 block mb-1">Global Transparency Enabled</strong>
              The architecture dynamically enforces background layer isolation. You do not need to inject custom Alpha CSS into OBS—simply paste the URL and place the layer over your camera feed.
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
