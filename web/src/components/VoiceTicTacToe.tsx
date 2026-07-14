'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useVocalBridge, useTranscript, useAgentActions } from '@vocalbridgeai/react';
import { ConnectionState } from '@vocalbridgeai/sdk';

// ── Tic-tac-toe pure helpers ─────────────────────────────────────────
const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

function detectWin(cells: string[]) {
  for (const [a,b,c] of WIN_LINES) {
    if (cells[a] && cells[a] === cells[b] && cells[b] === cells[c]) {
      return { winner: cells[a], line: [a,b,c] };
    }
  }
  return { winner: null, line: null };
}

function gameStatus(cells: string[], userSym: string, agentSym: string) {
  const { winner } = detectWin(cells);
  if (winner === userSym) return 'user_wins';
  if (winner === agentSym) return 'agent_wins';
  if (cells.every((c) => c)) return 'draw';
  return 'playing';
}

function statusBanner(status: string, userSym: string, agentSym: string) {
  if (status === 'user_wins')  return ['🏆 You won! ('+userSym+')', 'banner-success'];
  if (status === 'agent_wins') return ['🤖 Agent wins ('+agentSym+')', 'banner-danger'];
  if (status === 'draw')       return ['🤝 Draw', 'banner-neutral'];
  return [null, null];
}

export default function VoiceTicTacToe() {
  const { state, connect, disconnect, error } = useVocalBridge();
  const { transcript } = useTranscript();
  const { onAction, sendAction } = useAgentActions();

  const [boardVisible, setBoardVisible] = useState(false);
  const [cells, setCells] = useState<string[]>(Array(9).fill(''));
  const [userSym, setUserSym] = useState('X');
  const [status, setStatus] = useState('idle');

  const cellsRef = useRef(cells);
  const userSymRef = useRef(userSym);
  useEffect(() => { cellsRef.current = cells; }, [cells]);
  useEffect(() => { userSymRef.current = userSym; }, [userSym]);

  const agentSym = userSym === 'X' ? 'O' : 'X';

  const applyMark = useCallback((index: number, mark: string, syncKind: string) => {
    const prev = cellsRef.current;
    if (prev[index]) return null;
    const next = [...prev];
    next[index] = mark;
    cellsRef.current = next;
    setCells(next);

    const us = userSymRef.current;
    const as = us === 'X' ? 'O' : 'X';
    const newStatus = gameStatus(next, us, as);
    setStatus(newStatus);

    const turn = mark === us ? 'agent' : 'user';
    const payload = {
      board: next,
      status: newStatus,
      turn,
      moveCount: next.filter((c) => c).length,
      userSymbol: us,
      agentSymbol: as,
    };
    if (syncKind === 'board_sync') {
      sendAction('board_sync', payload);
    } else if (syncKind === 'user_placed_mark') {
      sendAction('user_placed_mark', { ...payload, position: index, row: Math.floor(index / 3), col: index % 3, mark });
    }
    return next;
  }, [sendAction]);

  useEffect(() => {
    const offs = [
      onAction('show_tic_tac_toe', (p: any) => {
        const us = (p && p.userSymbol) || 'X';
        cellsRef.current = Array(9).fill('');
        userSymRef.current = us;
        setUserSym(us);
        setCells(Array(9).fill(''));
        setStatus('playing');
        setBoardVisible(true);
        sendAction('board_sync', {
          board: Array(9).fill(''),
          status: 'playing',
          turn: (p && p.firstTurn) || 'user',
          moveCount: 0,
          userSymbol: us,
          agentSymbol: us === 'X' ? 'O' : 'X',
        });
      }),
      onAction('place_mark', (p: any) => {
        if (!p || p.row === undefined || p.col === undefined) return;
        const as = userSymRef.current === 'X' ? 'O' : 'X';
        applyMark(p.row * 3 + p.col, as, 'board_sync');
      }),
      onAction('user_move', (p: any) => {
        if (!p || p.row === undefined || p.col === undefined) return;
        applyMark(p.row * 3 + p.col, userSymRef.current, 'board_sync');
      }),
      onAction('clear_ui', () => {
        cellsRef.current = Array(9).fill('');
        setBoardVisible(false);
        setCells(Array(9).fill(''));
        setStatus('idle');
      }),
    ];
    return () => offs.forEach((off) => off && off());
  }, [onAction, sendAction, applyMark]);

  const handleCellClick = useCallback((i: number) => {
    if (status !== 'playing') return;
    if (cellsRef.current[i]) return;
    applyMark(i, userSymRef.current, 'user_placed_mark');
  }, [applyMark, status]);

  const isDisconnected = state === ConnectionState.Disconnected;
  const busy = state === ConnectionState.Connecting || state === ConnectionState.WaitingForAgent;

  const winInfo = detectWin(cells);
  const [bannerText, bannerClass] = statusBanner(status, userSym, agentSym);

  return (
    <div className="tic-tac-toe-container">
      <div className="controls-row">
        <button 
          className={`btn-connect ${!isDisconnected ? 'btn-danger' : ''}`}
          onClick={isDisconnected ? connect : disconnect}
          disabled={busy}
        >
          {isDisconnected ? 'Connect' : 'Disconnect'}
        </button>
        <span className="connection-state">
          {state}
          {busy && <span className="pulsing-dot"></span>}
        </span>
      </div>

      {error && <div className="error-message">{error.message}</div>}

      {bannerText && (
        <div className={`status-banner ${bannerClass}`}>
          {bannerText}
        </div>
      )}

      {boardVisible && (
        <div className="board">
          {cells.map((c, i) => {
            const isWinningCell = winInfo.line && winInfo.line.includes(i);
            return (
              <button
                key={i}
                className={`cell ${c ? 'filled' : ''} ${isWinningCell ? 'winning' : ''}`}
                onClick={() => handleCellClick(i)}
                disabled={!!c || status !== 'playing'}
              >
                <span className="cell-content" data-mark={c}>{c}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="transcript-box">
        {transcript.length === 0 ? (
          <div className="transcript-empty">Transcript will appear here...</div>
        ) : (
          transcript.map((t, i) => (
            <div key={i} className={`transcript-entry role-${t.role}`}>
              <span className="role-tag">{t.role}</span>
              <span className="transcript-text">{t.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
