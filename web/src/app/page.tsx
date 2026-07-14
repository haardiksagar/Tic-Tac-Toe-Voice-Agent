'use client';

import { VocalBridgeProvider } from '@vocalbridgeai/react';
import VoiceTicTacToe from '@/components/VoiceTicTacToe';

export default function Home() {
  return (
    <main className="main-layout">
      <div className="glass-panel">
        <header className="header">
          <h1>Vocal Tic-Tac-Toe</h1>
          <p>Connect with the agent and say "let's play tic-tac-toe" to start!</p>
        </header>

        <VocalBridgeProvider options={{ auth: { tokenUrl: '/api/voice-token' }, debug: false }}>
          <VoiceTicTacToe />
        </VocalBridgeProvider>
      </div>
    </main>
  );
}
