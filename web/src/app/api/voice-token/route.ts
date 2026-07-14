import { NextRequest, NextResponse } from 'next/server';

const VOCAL_BRIDGE_API_KEY = process.env.VOCAL_BRIDGE_API_KEY!;
const VOCAL_BRIDGE_AGENT_ID = process.env.VOCAL_BRIDGE_AGENT_ID;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const headers: Record<string, string> = {
      'X-API-Key': VOCAL_BRIDGE_API_KEY,
      'Content-Type': 'application/json',
    };
    
    // Include the Agent ID if present (required for account-level API keys)
    if (VOCAL_BRIDGE_AGENT_ID) {
      headers['X-Agent-Id'] = VOCAL_BRIDGE_AGENT_ID;
    }

    const response = await fetch('https://vocalbridgeai.com/api/v1/token', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        participant_name: body.participant_name || 'Tic Tac Toe Player',
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Vocal Bridge API error:', text);
      throw new Error(`Failed to get token: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error generating token:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get voice token' },
      { status: 500 }
    );
  }
}
