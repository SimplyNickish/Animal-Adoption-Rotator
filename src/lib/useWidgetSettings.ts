import { useState, useEffect } from 'react';
import { createClient } from './supabase/client';

export interface WidgetSettings {
  location: string;
  animalType: string;
  displayDuration: string;
  rotationSize: string;
  autoSwapOnChat: boolean;
  themeColor: string;
  cardStyle: string;
  widgetAlignment: string;
  fontFamily: string;
}

const DEFAULT_SETTINGS: WidgetSettings = {
  location: '',
  animalType: 'both',
  displayDuration: '60',
  rotationSize: '50',
  autoSwapOnChat: false,
  themeColor: 'emerald',
  cardStyle: 'glass',
  widgetAlignment: 'center',
  fontFamily: 'sans'
};

export function useWidgetSettings(widgetId: string | null) {
  const [settings, setSettings] = useState<WidgetSettings>(DEFAULT_SETTINGS);
  const [isReady, setIsReady] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    if (!widgetId) return;

    let isMounted = true;

    const fetchInitial = async () => {
      const { data, error } = await supabase
        .from('remote_settings')
        .select('settings')
        .eq('widget_id', widgetId)
        .single();
        
      if (!error && data?.settings) {
        if (isMounted) setSettings(data.settings as WidgetSettings);
      }
      if (isMounted) setIsReady(true);
    };

    fetchInitial();

    const channel = supabase.channel(`public:remote_settings:widget_id=eq.${widgetId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'remote_settings', filter: `widget_id=eq.${widgetId}` },
        (payload) => {
          const newData = payload.new as any;
          if (newData && newData.settings) {
             setSettings(newData.settings as WidgetSettings);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [widgetId]);

  const updateSettings = async (newSettings: Partial<WidgetSettings>) => {
    const merged = { ...settings, ...newSettings };
    setSettings(merged); // Optimistic UI update

    if (widgetId) {
      await supabase
        .from('remote_settings')
        .upsert({ widget_id: widgetId, settings: merged });
    }
  };

  return { settings, updateSettings, isReady };
}
