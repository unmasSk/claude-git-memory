import '../styles/components/AgentCard.css';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { AgentState, getModelBadge } from '@agent-chatroom/shared';
import type { AgentStatusUI } from '../stores/agent-store';
import { agentColorClass } from '../lib/colors';
import { getAgentIcon } from '../lib/icons';
import { useWsStore } from '../stores/ws-store';

interface ParticipantItemProps {
  agent: AgentStatusUI;
}

function fmtTok(n: number | undefined): string {
  if (n === undefined || n === 0) return '\u2014';
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function fmtSecs(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m${s % 60}s`;
}

export const ParticipantItem = memo(function ParticipantItem({ agent }: ParticipantItemProps) {
  const modelBadge = getModelBadge(agent.model);
  const Icon = getAgentIcon(agent.agentName);
  // 4 visual states: active (running now), paused (server-confirmed), invoked (worked before), never (idle/out)
  const isActive = agent.status === AgentState.Thinking || agent.status === AgentState.ToolUse;
  const isPausedFromServer = agent.status === AgentState.Paused;
  const neverInvoked = agent.status === AgentState.Idle || agent.status === AgentState.Out;
  // Paused: use active-card (tinted background) but NO animation — agent has color but is frozen.
  const cardClass = (isActive || isPausedFromServer) ? 'card active-card' : 'card off-card';
  const agentNameLower = agent.agentName.toLowerCase();

  // Live elapsed timer — ticks every second while agent is active.
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!isActive || !agent.invocationStartTime) {
      setElapsedMs(null);
      return;
    }
    // Tick immediately, then every second
    setElapsedMs(Date.now() - agent.invocationStartTime);
    intervalRef.current = setInterval(() => {
      setElapsedMs(Date.now() - agent.invocationStartTime!);
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, agent.invocationStartTime]);

  // Context % — accumulated across invocations.
  // During active: completedInputTokens (past) + lastInputTokens (current progress).
  // During done/idle: completedInputTokens alone (last invocation already folded in).
  const displayInputTokens = isActive
    ? agent.completedInputTokens + (agent.lastInputTokens ?? 0)
    : agent.completedInputTokens || agent.lastInputTokens;
  const ctxPct = (displayInputTokens && agent.lastContextWindow && agent.lastContextWindow > 0)
    ? Math.min(100, Math.max(1, Math.round((displayInputTokens / agent.lastContextWindow) * 100)))
    : null;

  // Duration display: live timer while active, lastDurationMs when done.
  const durationDisplay = isActive && elapsedMs !== null
    ? fmtSecs(elapsedMs)
    : agent.lastDurationMs
      ? `${(agent.lastDurationMs / 1000).toFixed(1)}s`
      : '\u2014';

  const send = useWsStore((s) => s.send);

  // Optimistic local pause state — set on pause click, cleared when server confirms running/done.
  const [isPaused, setIsPaused] = useState(false);

  // Sync local pause state with server state.
  // - Server confirms paused → set isPaused true (catches pauses from other clients).
  // - Server confirms running/done → clear isPaused so Pause re-enables.
  useEffect(() => {
    if (agent.status === AgentState.Paused) {
      setIsPaused(true);
    } else if (agent.status === AgentState.Thinking || agent.status === AgentState.ToolUse || agent.status === AgentState.Done) {
      setIsPaused(false);
    }
  }, [agent.status]);

  const handleResume = useCallback(() => {
    send({ type: 'resume_agent', agentName: agent.agentName });
    setIsPaused(false);
  }, [send, agent.agentName]);

  const handlePause = useCallback(() => {
    send({ type: 'pause_agent', agentName: agent.agentName });
    setIsPaused(true);
  }, [send, agent.agentName]);

  const handleStop = useCallback(() => {
    send({ type: 'kill_agent', agentName: agent.agentName });
  }, [send, agent.agentName]);

  const handleReadChat = useCallback(() => {
    send({ type: 'read_chat', agentName: agent.agentName });
  }, [send, agent.agentName]);

  // Button enabled states
  const playEnabled = isPaused || isPausedFromServer;
  const pauseEnabled = isActive && !isPaused;
  const stopEnabled = isActive || isPaused || isPausedFromServer;
  const chatEnabled = !isActive && !isPaused && !isPausedFromServer;

  return (
    <div className={`card-wrap ${neverInvoked ? '' : `agent-${agentNameLower}`}${isPausedFromServer ? ' agent-paused' : ''}`}>
      {/* Action buttons layer — revealed on hover via CSS shrink-reveal */}
      <div className="card-buttons">
        <div className="btn-panel">
          {/* Play — resume a paused agent */}
          <button className="act-btn" type="button" aria-label="Play" onClick={handleResume} disabled={!playEnabled}>
            <svg viewBox="0 0 12 12">
              <polygon points="3,1 11,6 3,11" className="filled" />
            </svg>
          </button>
          {/* Pause — pause an active agent */}
          <button className="act-btn" type="button" aria-label="Pause" onClick={handlePause} disabled={!pauseEnabled}>
            <svg viewBox="0 0 12 12">
              <rect x="2" y="1" width="3" height="10" rx="1" className="filled" />
              <rect x="7" y="1" width="3" height="10" rx="1" className="filled" />
            </svg>
          </button>
          {/* Stop — kill running subprocess */}
          <button className="act-btn" type="button" aria-label="Stop" onClick={handleStop} disabled={!stopEnabled}>
            <svg viewBox="0 0 12 12">
              <rect x="1.5" y="1.5" width="9" height="9" rx="2" className="filled" />
            </svg>
          </button>
          {/* Chat — feed recent messages to agent */}
          <button className="act-btn" type="button" aria-label="Chat" onClick={handleReadChat} disabled={!chatEnabled}>
            <svg viewBox="0 0 12 12">
              <path d="M10 1H2a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2l2 2 2-2h2a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main card — CSS grid: [info cols] [status icon col] */}
      <div className={cardClass}>
        {/* Cell 1: name + model badge + context percentage */}
        <div className="cell-name">
          <span className={`name ${neverInvoked ? '' : agentColorClass(agent.agentName)}`} style={neverInvoked ? { color: 'var(--text-3)' } : isPausedFromServer ? { opacity: 0.6 } : undefined}>
            {agentNameLower}
          </span>
          <span className="model">{modelBadge}</span>
          <span className="pct">
            {ctxPct !== null ? `${ctxPct}%` : '\u2014'}
          </span>
        </div>

        {/* Cell 2: context bar */}
        <div className="cell-bar">
          <div className="bar-track">
            <div className={`bar-fill${isActive ? ' bar-fill-animated' : ''}`} style={{ width: ctxPct !== null ? `${ctxPct}%` : '0%' }} />
          </div>
        </div>

        {/* Cell 3: 4 metrics — output tokens, input tokens, turns, time */}
        <div className="cell-metrics">
          <span className="metric">
            <svg className="icon-tiny" viewBox="0 0 10 10">
              <polygon points="5,1 9,7 1,7" fill="var(--text-3)" stroke="none" />
            </svg>
            {fmtTok(agent.lastOutputTokens)}
          </span>
          <span className="metric">
            <svg className="icon-tiny" viewBox="0 0 10 10">
              <polygon points="5,9 9,3 1,3" fill="var(--text-3)" stroke="none" />
            </svg>
            {fmtTok(agent.lastInputTokens)}
          </span>
          <span className="metric">
            <svg className="icon-tiny" viewBox="0 0 10 10">
              <path d="M8 2.5A4 4 0 1 0 8.5 7" />
              <path d="M9 1v2.5H6.5" />
            </svg>
            {agent.lastNumTurns ?? '\u2014'}
          </span>
          <span className="metric">
            <svg className="icon-tiny" viewBox="0 0 10 10">
              <path d="M2 1h6M2 9h6M2 1l3 4-3 4M8 1L5 5l3 4" />
            </svg>
            {durationDisplay}
          </span>
        </div>

        {/* Cell 4: large status icon spanning all rows */}
        <div className="cell-status">
          {isActive ? (
            <div className="neon-active" style={{ color: 'var(--ac)' }}>
              <Icon className="icon-status" />
            </div>
          ) : isPausedFromServer ? (
            /* Paused: agent color, no animation — distinct from active and off states */
            <Icon className="icon-status" style={{ color: 'var(--ac)', stroke: 'var(--ac)', opacity: 0.55 }} />
          ) : (
            <Icon className="icon-status" style={{ opacity: neverInvoked ? 0.3 : 0.5 }} />
          )}
        </div>
      </div>
    </div>
  );
});
