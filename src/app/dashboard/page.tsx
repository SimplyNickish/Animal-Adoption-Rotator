'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase/client';
import { motion } from 'motion/react';
import { Settings as SettingsIcon, Sparkles, Loader2, Copy, Save, MessageSquare, CheckCircle2, LayoutTemplate } from 'lucide-react';
import { useWidgetSettings, WidgetSettings } from '../../lib/useWidgetSettings';

const WIDGET_BASE = process.env.NEXT_PUBLIC_WIDGET_BASE_URL || 'https://app.simplynickish.com';

export default function EmbeddedDashboard() {
  const [widgetId, setWidgetId] = useState<string | null>(null);
  
  // UX State
  const [copySuccess, setCopySuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { settings, updateSettings, isReady } = useWidgetSettings(widgetId);

  // Local form state
  const [localSettings, setLocalSettings] = useState<WidgetSettings>(settings);

  useEffect(() => {
    if (isReady) {
      setLocalSettings(settings);
    }
  }, [settings, isReady]);

  // Generate or retrieve persistent browser Widget ID
  useEffect(() => {
    let savedWidgetId = localStorage.getItem('ar_embedded_widget_id');
    
    if (!savedWidgetId) {
      // Must use MEMBERS- prefix to bypass the Overlay killswitch
      savedWidgetId = 'MEMBERS-' + Math.random().toString(36).substring(2, 12);
      localStorage.setItem('ar_embedded_widget_id', savedWidgetId);
    }
    
    setWidgetId(savedWidgetId);
  }, []);

  // Tell Fourthwall parent frame how tall we are so it doesn't clip
  useEffect(() => {
    const sendHeight = () => {
      try {
        const height = document.documentElement.scrollHeight;
        window.parent.postMessage({ type: 'RESIZE', data: { height } }, '*');
      } catch (_) {}
    };
    sendHeight();
    const observer = new MutationObserver(sendHeight);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    const interval = setInterval(sendHeight, 1000);
    return () => { observer.disconnect(); clearInterval(interval); };
  }, [widgetId, isReady]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await updateSettings(localSettings);
    
    // Slight artificial delay for UX feedback
    setTimeout(() => setIsSaving(false), 600);
  };

  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Fallback copy fails', err);
    } finally {
      document.body.removeChild(textArea);
    }
  };

  const executeCopy = () => {
    const url = `${WIDGET_BASE}/widget/${widgetId}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url)
        .then(() => { setCopySuccess(true); })
        .catch(() => {
          fallbackCopyTextToClipboard(url);
          setCopySuccess(true);
        });
    } else {
      fallbackCopyTextToClipboard(url);
      setCopySuccess(true);
    }
    setTimeout(() => setCopySuccess(false), 2000);
  };

  if (!isReady || !widgetId) {
    return <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-transparent"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>;
  }

  return (
    <div className="w-full h-full min-h-screen bg-slate-950 font-sans flex flex-col items-center py-6 px-4 sm:px-6 lg:px-8 overflow-y-auto">
      
      {/* Header Banner */}
      <div className="w-full max-w-6xl mb-6 bg-gradient-to-r from-emerald-900/40 via-emerald-800/10 to-transparent border border-emerald-500/20 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-center gap-6 shadow-lg shadow-emerald-500/5">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-100 to-emerald-300 mb-2 drop-shadow-sm flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-emerald-400" />
            Adoption Rotator Pro
          </h1>
          <p className="text-emerald-100/80 text-sm sm:text-base font-medium max-w-2xl leading-relaxed">
            Configure your rotating adoption widget below. The preview window shows exactly what your stream will look like in real time. Grab your Browser Source URL and paste it into OBS or Meld Studio to instantly go live!
          </p>
        </div>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: PREVIEW & URL (Spans 7 columns on desktop) */}
        <div className="xl:col-span-7 flex flex-col gap-6">
          
          <section className="bg-slate-900/90 backdrop-blur-3xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[500px]">
            <div className="bg-slate-950/80 px-5 py-4 border-b border-white/10 flex items-center justify-between shadow-inner">
               <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                 <LayoutTemplate className="w-4 h-4 text-emerald-400" /> Live Canvas Preview
               </h2>
               <div className="flex gap-2">
                 <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                 <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                 <div className="w-3 h-3 rounded-full bg-emerald-500/50"></div>
               </div>
            </div>
            
            {/* Iframe Preview Container */}
            <div className="relative flex-grow bg-[url('https://transparenttextures.com/patterns/cubes.png')] bg-slate-950/50 overflow-hidden group">
               {/* Loading indicator that hides once iframe loads (managed automatically by iframe visually usually, but we keep it simple here) */}
               <div className="absolute inset-0 flex items-center justify-center opacity-50 z-0 text-slate-500 font-medium">Loading preview...</div>
               <iframe 
                 src={`${WIDGET_BASE}/widget/${widgetId}?preview=true`}
                 className="absolute inset-0 w-[1920px] h-[1080px] origin-top-left border-0 z-10"
                 style={{
                   transform: 'scale(0.35)', 
                   width: '1920px', 
                   height: '1080px' 
                 }}
                 sandbox="allow-scripts allow-same-origin"
                 scrolling="no"
               />
               
               <div className="absolute bottom-4 left-4 z-20 bg-black/60 backdrop-blur px-3 py-1.5 border border-white/10 rounded-lg shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-emerald-400 font-mono tracking-wider">1920x1080 Scaled Canvas</span>
               </div>
            </div>
          </section>

          <section className="bg-gradient-to-br from-slate-900/90 to-slate-900/95 backdrop-blur-3xl p-6 rounded-3xl border border-emerald-500/20 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            
            <h2 className="text-sm font-bold mb-2 text-emerald-300 uppercase tracking-wider relative z-10">Browser Source URL</h2>
            <p className="text-slate-400 text-xs font-medium mb-4 relative z-10">Paste this URL into OBS Studio. Set width to 1920 and height to 1080.</p>
            
            <div className="flex flex-col sm:flex-row gap-3 items-stretch relative z-10">
              <input 
                 type="text" 
                 readOnly 
                 value={`${WIDGET_BASE}/widget/${widgetId}`}
                 className="relative w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 font-mono text-emerald-300 focus:outline-none text-xs sm:text-sm shadow-inner cursor-text"
                 onClick={(e) => (e.target as HTMLInputElement).select()}
               />
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={executeCopy}
                className={`relative shrink-0 border py-3 px-8 rounded-xl transition-all font-bold tracking-wide flex items-center justify-center ${copySuccess ? 'bg-emerald-500 border-emerald-500 text-black shadow-lg shadow-emerald-500/25' : 'bg-white border-white text-slate-900 hover:bg-slate-200'}`}
              >
                {copySuccess ? (
                  <><CheckCircle2 className="w-4 h-4 mr-2" /> Copied!</>
                ) : (
                  <><Copy className="w-4 h-4 mr-2" /> Copy Link</>
                )}
              </motion.button>
            </div>
          </section>

        </div>

        {/* RIGHT COLUMN: SETTINGS (Spans 5 columns on desktop) */}
        <div className="xl:col-span-5">
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            className="bg-slate-900/80 backdrop-blur-3xl border border-white/10 p-6 sm:p-8 rounded-3xl shadow-xl h-full flex flex-col"
          >
            <h2 className="text-lg font-extrabold flex items-center gap-3 text-white mb-6 border-b border-white/5 pb-4">
              <SettingsIcon className="w-5 h-5 text-emerald-400" />
              Widget Configuration
            </h2>

            <form onSubmit={handleSaveSettings} className="space-y-6 flex-grow flex flex-col">
              <div className="grid grid-cols-1 gap-5 z-20">
                
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wide">Location Filter</label>
                  <input
                    type="text"
                    value={localSettings.location}
                    onChange={(e) => setLocalSettings({...localSettings, location: e.target.value})}
                    placeholder="Zip, City, or State..."
                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-emerald-500/50 transition-colors shadow-inner text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wide">Animal Type</label>
                  <select
                    value={localSettings.animalType}
                    onChange={(e) => setLocalSettings({...localSettings, animalType: e.target.value})}
                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white focus:border-emerald-500/50 transition-colors shadow-inner text-sm"
                  >
                    <option value="dogs">Dogs Only</option>
                    <option value="cats">Cats Only</option>
                    <option value="both">Dogs & Cats</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-300 mb-2 uppercase tracking-wide">Display Duration (s)</label>
                    <input
                      type="number" min="10"
                      value={localSettings.displayDuration}
                      onChange={(e) => setLocalSettings({...localSettings, displayDuration: e.target.value})}
                      className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white focus:border-emerald-500/50 transition-colors shadow-inner text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-300 mb-2 uppercase tracking-wide">Card Rotation Limit</label>
                    <input
                      type="number" min="1" max="200"
                      value={localSettings.rotationSize}
                      onChange={(e) => setLocalSettings({...localSettings, rotationSize: e.target.value})}
                      className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white focus:border-emerald-500/50 transition-colors shadow-inner text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 mt-2">
                  <label className="block text-xs font-bold text-emerald-400 mb-3 uppercase tracking-wide flex items-center gap-2">
                     <Sparkles className="w-3.5 h-3.5" /> Visual Overrides
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] sm:text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Widget Color Theme</label>
                      <select
                        value={localSettings.themeColor}
                        onChange={(e) => setLocalSettings({...localSettings, themeColor: e.target.value})}
                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white focus:border-emerald-500/50 transition-colors shadow-inner text-sm"
                      >
                        <option value="emerald">🟢 Emerald Green</option>
                        <option value="rose">🔴 Rose Pink</option>
                        <option value="cyan">🔵 Cyber Cyan</option>
                        <option value="purple">🟣 Amethyst Purple</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] sm:text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Card Style</label>
                      <select
                        value={localSettings.cardStyle}
                        onChange={(e) => setLocalSettings({...localSettings, cardStyle: e.target.value})}
                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white focus:border-emerald-500/50 transition-colors shadow-inner text-sm"
                      >
                        <option value="glass">Glass Box</option>
                        <option value="naked">Naked (No Box)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/50 border border-white/5 rounded-xl p-4 mt-2">
                  <label className="text-sm font-bold text-white mb-1 flex items-center justify-between cursor-pointer">
                    <span className="flex items-center gap-2"><MessageSquare className="w-4 h-4 text-emerald-400" /> Auto-Swap on Chat Command</span>
                    <div className="relative inline-flex items-center">
                        <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={localSettings.autoSwapOnChat}
                            onChange={(e) => setLocalSettings({...localSettings, autoSwapOnChat: e.target.checked})}
                        />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </div>
                  </label>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Instantly interrupt the visual rotation when your chat uses a triggering interactive command (via external webhook).
                  </p>
                </div>

                {/* Sub-accordion or compact Webhooks view */}
                <div className="pt-4 border-t border-white/5 mt-2">
                  <label className="block text-xs font-bold text-slate-300 mb-3 uppercase tracking-wide flex items-center gap-2">
                     Bot Webhook Integrations
                  </label>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5 p-3 sm:p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/10 transition-colors group">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-emerald-400">StreamElements</span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded uppercase font-bold tracking-widest">!adopt</span>
                      </div>
                      <code className="bg-black/60 px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-mono text-emerald-200 select-all border border-emerald-500/10 overflow-x-auto whitespace-nowrap scrollbar-none">
                        {"${customapi." + (typeof window !== 'undefined' ? window.location.origin : 'https://app.simplynickish.com') + "/api/bot?widget=" + widgetId + "&cmd=adopt&num=${1}}"}
                      </code>
                    </div>
                    
                    <div className="flex flex-col gap-1.5 p-3 sm:p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl hover:bg-purple-500/10 transition-colors group">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-purple-400">Nightbot</span>
                        <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded uppercase font-bold tracking-widest">!dog</span>
                      </div>
                      <code className="bg-black/60 px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-mono text-purple-200 select-all border border-purple-500/10 overflow-x-auto whitespace-nowrap scrollbar-none">
                        {"$(urlfetch " + (typeof window !== 'undefined' ? window.location.origin : 'https://app.simplynickish.com') + "/api/bot?widget=" + widgetId + "&cmd=dog&num=$(1))"}
                      </code>
                    </div>

                    <div className="flex flex-col gap-1.5 p-3 sm:p-4 bg-slate-800/50 border border-white/5 rounded-xl hover:bg-slate-800 transition-colors group">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-300">Streamer.bot / MixItUp</span>
                        <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded uppercase font-bold tracking-widest">HTTP GET</span>
                      </div>
                      <code className="bg-black/60 px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-mono text-slate-200 select-all border border-white/5 overflow-x-auto whitespace-nowrap scrollbar-none">
                        {(typeof window !== 'undefined' ? window.location.origin : 'https://app.simplynickish.com') + "/api/bot?widget=" + widgetId + "&cmd=adopt"}
                      </code>
                    </div>
                  </div>
                </div>

              </div>

              <div className="mt-auto pt-6">
                <motion.button 
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  disabled={isSaving || !widgetId}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] flex items-center justify-center text-sm"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5 mr-2" /> Save & Update Preview</>}
                </motion.button>
              </div>
            </form>

          </motion.div>
        </div>
      </div>
    </div>
  );
}
