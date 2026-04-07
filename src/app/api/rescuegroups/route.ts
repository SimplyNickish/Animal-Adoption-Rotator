import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESCUE_GROUPS_API_KEY;
    
    if (!apiKey) {
      console.error("[API/RescueGroups] Error: Environment variable RESCUE_GROUPS_API_KEY is missing. Add it to Vercel config.");
      return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    }

    const body = await request.json();
    const { endpoint, rotationSize, filters } = body;

    if (!endpoint || !rotationSize) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const apiUrl = `https://api.rescuegroups.org/v5/public/animals/search/available/${endpoint}?include=pictures,orgs,locations,breeds&limit=${rotationSize}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/vnd.api+json'
      },
      body: JSON.stringify({ data: { filters: filters || [] } })
    });

    if (!response.ok) {
      console.error(`[API/RescueGroups] Upstream failed with status: ${response.status}`);
      return NextResponse.json({ error: "Upstream API error" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("[API/RescueGroups] Internal error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
