import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const widgetId = searchParams.get('widget');
  const cmd = searchParams.get('cmd');
  const numStr = searchParams.get('num');
  const num = numStr ? parseInt(numStr.replace(/[^0-9]/g, ''), 10) : null;

  if (!widgetId) return new NextResponse("Error: SimplyNickish Widget ID missing from URL.", { status: 200 }); 
  if (!cmd || !['adopt', 'dog', 'cat'].includes(cmd)) return new NextResponse("Error: Invalid command. Use cmd=adopt, cmd=dog, or cmd=cat.", { status: 200 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return new NextResponse("SimplyNickish server configuration error.", { status: 200 });

  const supabase = createClient(supabaseUrl, supabaseKey);
  const requestId = Math.random().toString(36).substring(2, 15);

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      supabase.removeChannel(responseChannel);
      resolve(new NextResponse("Widget Error: Make sure your Adoption Rotator is currently active/visible in OBS or Meld Studio!", { status: 200 }));
    }, 4500);

    const responseChannel = supabase.channel(`public:bot_responses:${requestId}`)
      .on('broadcast', { event: 'bot_response' }, (payload) => {
        clearTimeout(timer);
        supabase.removeChannel(responseChannel);
        resolve(new NextResponse(payload.payload.message || "Couldn't find that animal right now.", { status: 200 }));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          const requestChannel = supabase.channel(`public:bot_requests:${widgetId}`);
          requestChannel.subscribe((reqStatus) => {
            if (reqStatus === 'SUBSCRIBED') {
              requestChannel.send({ type: 'broadcast', event: 'bot_request', payload: { requestId, cmd, num } });
              setTimeout(() => { supabase.removeChannel(requestChannel); }, 1000);
            }
          });
        }
      });
  });
}
