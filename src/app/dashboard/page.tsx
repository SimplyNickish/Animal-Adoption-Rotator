'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase/client';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Sparkles, AlertTriangle, Loader2, KeyRound, Unlock, Copy } from 'lucide-react';

export default function EmbeddedDashboard() {
  const [widgetId, setWidgetId] = useState<string>('');
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [accessType, setAccessType] = useState<string>('');
  
  // Paywall Form State
  const [accessCode, setAccessCode] = useState('');
  const [paywallError, setPaywallError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    // Check Local Browser Memory for an already established widget session
    const savedWidgetId = localStorage.getItem('ar_embedded_widget_id');
    const savedUnlockState = localStorage.getItem('ar_embedded_unlocked') === 'true';
    const savedType = localStorage.getItem('ar_embedded_type') || '';
    
    if (savedWidgetId && savedUnlockState) {
      setWidgetId(savedWidgetId);
      setIsUnlocked(true);
      setAccessType(savedType);
    }
  }, []);

  const verifyLicenseContent = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaywallError('');
    setIsVerifying(true);

    try {
      // Create a master override for Fourthwall Members unconditionally
      if (accessCode === 'SUPER-ADMIN-OVERRIDE') {
         // Because members share this URL, their individual settings are handled purely by their OBS LocalStorage isolation natively
         const tempWidgetId = 'MEMBERS-MASTER';
         setWidgetId(tempWidgetId);
         setIsUnlocked(true);
         setAccessType('Active Fourthwall Membership');
         
         localStorage.setItem('ar_embedded_widget_id', tempWidgetId);
         localStorage.setItem('ar_embedded_unlocked', 'true');
         localStorage.setItem('ar_embedded_type', 'Active Fourthwall Membership');
         return;
      }

      // Step 1: Check Database for active Etsy Lifetime Code
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
      
      // Step 2: Mark code as consumed by this random allocation
      await supabase
        .from('license_keys')
        .update({ is_used: true })
        .eq('id', keyData.id);

      // Give them a lifetime URL based directly off their Etsy transaction code
      const tempWidgetId = 'LIFETIME-' + accessCode;
      
      setWidgetId(tempWidgetId);
      setIsUnlocked(true);
      setAccessType('Lifetime Etsy Voucher');
      
      localStorage.setItem('ar_embedded_widget_id', tempWidgetId);
      localStorage.setItem('ar_embedded_unlocked', 'true');
      localStorage.setItem('ar_embedded_type', 'Lifetime Etsy Voucher');

    } catch (err: any) {
      console.error(err);
      setPaywallError("Internal verification error. Contact support.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ar_embedded_widget_id');
    localStorage.removeItem('ar_embedded_unlocked');
    localStorage.removeItem('ar_embedded_type');
    setIsUnlocked(false);
    setWidgetId('');
    setAccessCode('');
  };

  // ----- UI STATE: NO ACCESS CODE PROVIDED -----
  if (!isUnlocked) {
    return (
      <div className="w-full h-full min-h-[400px] bg-transparent font-sans flex flex-col justify-center items-center px-4 sm:p-2">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          whileHover={{ y: -5, scale: 1.01 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative overflow-hidden bg-gradient-to-b from-slate-900/95 to-slate-900/80 backdrop-blur-3xl border border-emerald-500/20 p-8 rounded-3xl shadow-[0_10px_40px_-10px_rgba(16,185,129,0.15)] hover:shadow-[0_20px_50px_-10px_rgba(16,185,129,0.3)] max-w-md w-full text-center group transition-shadow duration-500"
        >
          {/* Animated top edge reflection */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
          {/* Subtle inner animated glow */}
          <div className="absolute -inset-20 bg-emerald-500/10 rounded-full blur-[80px] opacity-0 group-hover:opacity-50 transition-opacity duration-700 pointer-events-none"></div>

          <div className="relative z-10">
            <motion.div 
              whileHover={{ rotate: 180, scale: 1.1 }}
              transition={{ duration: 0.5 }}
              className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center mb-6 border border-emerald-500/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"
            >
              <KeyRound className="w-8 h-8 text-emerald-400" />
            </motion.div>
            <h2 className="text-2xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">Unlock Rotator Asset</h2>
            <p className="text-emerald-100/60 mb-6 text-sm leading-relaxed font-medium">
              Enter your Etsy Voucher Code, or use the Fourthwall Master Member Key to securely authenticate.
            </p>

            <form onSubmit={verifyLicenseContent} className="space-y-4">
              <div className="relative group/input">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 rounded-2xl blur opacity-0 group-focus-within/input:opacity-100 transition duration-500"></div>
                <input 
                  type="text" 
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  className="relative w-full bg-slate-950/80 border border-white/10 rounded-2xl px-6 py-4 text-center font-mono text-xl tracking-widest text-emerald-300 focus:outline-none focus:border-emerald-400/50 shadow-inner transition-colors"
                  placeholder="XXXX-XXXX-XXXX"
                  required
                />
              </div>
              
              <AnimatePresence>
                {paywallError && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="text-sm p-3 rounded-xl border bg-red-950/50 border-red-500/30 text-red-400 mt-2 font-medium backdrop-blur-md">
                      {paywallError}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit" 
                disabled={isVerifying || !accessCode}
                className="w-full relative overflow-hidden group/btn bg-gradient-to-b from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 text-slate-950 font-extrabold py-4 px-6 rounded-2xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] flex items-center justify-center mt-2 disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-400/50"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-out"></div>
                <div className="relative flex items-center">
                  {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      <Unlock className="w-5 h-5 mr-2 group-hover/btn:-translate-y-0.5 transition-transform" /> Verify Code
                    </>
                  )}
                </div>
              </motion.button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  // ----- UI STATE: UNLOCKED DASHBOARD -----
  return (
    <div className="w-full h-full min-h-[400px] bg-transparent font-sans flex flex-col items-center justify-center px-4 sm:p-2">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        whileHover={{ y: -5, boxShadow: "0 25px 50px -12px rgba(255, 255, 255, 0.1)" }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative overflow-hidden bg-gradient-to-br from-slate-900/95 to-slate-900/80 backdrop-blur-3xl border border-white/10 p-8 rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] max-w-2xl w-full group transition-all duration-500"
      >
        {/* Animated edge reflection */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="absolute left-0 inset-y-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent opacity-50"></div>

        <header className="relative z-10 flex justify-between items-start mb-6 pb-6 border-b border-white/5">
          <div>
            <h1 className="text-2xl font-extrabold flex items-center gap-3 text-transparent bg-clip-text bg-gradient-to-r from-white to-white/80 mb-1">
              <motion.div 
                whileHover={{ rotate: 90 }} 
                transition={{ duration: 0.3 }}
                className="p-2 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 rounded-xl border border-emerald-500/20 shadow-inner"
              >
                <Settings className="w-5 h-5 text-emerald-400" />
              </motion.div>
              Control Panel
            </h1>
            <p className="text-emerald-400/80 font-semibold text-xs flex items-center gap-1.5 uppercase tracking-wider pl-1"><Sparkles className="w-3.5 h-3.5"/> Access: {accessType}</p>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout} 
            className="text-slate-400 hover:text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors border border-transparent hover:border-white/10 shadow-sm"
          >
            Disconnect
          </motion.button>
        </header>

        <main className="relative z-10">
          <div className="mb-4">
            <h2 className="text-lg font-bold mb-1 text-white">Your Streaming URL</h2>
            <p className="text-slate-400 text-sm font-medium">Paste this endpoint into OBS Studio as a Browser Source.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 items-stretch">
            <div className="flex-1 relative group/url">
               <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 rounded-2xl blur opacity-0 group-hover/url:opacity-100 transition duration-500"></div>
               <input 
                 type="text" 
                 readOnly 
                 value={`${typeof window !== 'undefined' ? window.location.origin : ''}/widget/${widgetId}`}
                 className="relative w-full bg-slate-950/80 border border-white/10 rounded-2xl px-5 py-3.5 font-mono text-emerald-300 shadow-inner focus:outline-none h-full text-sm"
               />
            </div>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/widget/${widgetId}`)}
              className="relative overflow-hidden group/btn bg-gradient-to-b from-white to-slate-200 hover:from-white hover:to-white text-slate-950 font-extrabold py-3.5 px-6 rounded-2xl transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] flex items-center justify-center shrink-0 border border-white"
            >
              <div className="absolute inset-0 bg-emerald-400/10 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-out"></div>
              <span className="relative flex items-center"><Copy className="w-4 h-4 mr-2 group-hover/btn:-translate-y-0.5 transition-transform" /> Copy Link</span>
            </motion.button>
          </div>

          <motion.div 
            whileHover={{ scale: 1.01 }}
            className="mt-6 p-4 bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/20 rounded-2xl flex items-start gap-4 shadow-inner"
          >
            <AlertTriangle className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-cyan-100/70 text-xs leading-relaxed font-medium">
              <strong className="text-cyan-300 block mb-1 tracking-wide uppercase">Architecture Note</strong>
              Because you are accessing this directly inside your Member Dashboard, you do not need to configure CSS or Alpha layers in OBS.
            </div>
          </motion.div>
        </main>
      </motion.div>
    </div>
  );
}
