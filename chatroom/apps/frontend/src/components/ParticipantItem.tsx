import '../styles/components/AgentCard.css';
import { memo, useCallback, useEffect, useState } from 'react';
import type { AgentStatus } from '@agent-chatroom/shared';
import { AgentState, getModelBadge } from '@agent-chatroom/shared';
import { agentColorClass } from '../lib/colors';
import { getAgentIcon } from '../lib/icons';
import { useWsStore } from '../stores/ws-store';

interface ParticipantItemProps {
  agent: AgentStatus;
}

function fmtTok(n: number | undefined): string {
  if (n === undefined || n === 0) return '\u2014';
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export const ParticipantItem = memo(function ParticipantItem({ agent }: ParticipantItemProps) {
  const modelBadge = getModelBadge(agent.model);
  const Icon = getAgentIcon(agent.agentName);
  // 3 visual states: active (running now), invoked (worked before), never (idle/out)
  const isActive = agent.status === AgentState.Thinking || agent.status === AgentState.ToolUse;
  const wasInvoked = agent.status === AgentState.Done || agent.status === AgentState.Error;
  const neverInvoked = agent.status === AgentState.Idle || agent.status === AgentState.Out;
  const cardClass = isActive ? 'card active-card' : 'card off-card';
  const isAnimating = isActive;
  const agentNameLower = agent.agentName.toLowerCase();

  const ctxPct = (agent.lastInputTokens && agent.lastContextWindow && agent.lastContextWindow > 0)
    ? Math.round((agent.lastInputTokens / agent.lastContextWindow) * 100)
    : null;

  const send = useWsStore((s) => s.send);

  // T1: Local toggle so the same button acts as Pause or Resume depending on current state.
  // Optimistic local state — reset when server confirms the agent is running again.
  const [isPaused, setIsPaused] = useState(false);

  // Sync: if another client resumes the agent, the server broadcasts Thinking/ToolUse/Done.
  // Reset isPaused so the button correctly shows "Pause" instead of "Resume".
  useEffect(() => {
    if (agent.status === AgentState.Thinking || agent.status === AgentState.ToolUse || agent.status === AgentState.Done) {
      setIsPaused(false);
    }
  }, [agent.status]);

  const handlePlay = useCallback(() => {
    send({ type: 'invoke_agent', agent: agent.agentName, prompt: `@${agent.agentName} please continue.` });
  }, [send, agent.agentName]);

  const handlePauseOrResume = useCallback(() => {
    if (isPaused) {
      send({ type: 'resume_agent', agentName: agent.agentName });
      setIsPaused(false);
    } else {
      send({ type: 'pause_agent', agentName: agent.agentName });
      setIsPaused(true);
    }
  }, [send, agent.agentName, isPaused]);

  const handleStop = useCallback(() => {
    send({ type: 'kill_agent', agentName: agent.agentName });
  }, [send, agent.agentName]);

  const handleReadChat = useCallback(() => {
    send({ type: 'read_chat', agentName: agent.agentName });
  }, [send, agent.agentName]);

  return (
    <div className={`card-wrap ${neverInvoked ? '' : `agent-${agentNameLower}`}`}>
      {/* Action buttons layer — revealed on hover via CSS shrink-reveal */}
      <div className="card-buttons">
        <div className="btn-panel">
          {/* Play — invoke agent */}
          <button className="act-btn" type="button" aria-label="Play" onClick={handlePlay}>
            <svg viewBox="0 0 12 12">
              <polygon points="3,1 11,6 3,11" className="filled" />
            </svg>
          </button>
          {/* Pause/Resume — toggles between pause_agent and resume_agent */}
          <button className="act-btn" type="button" aria-label={isPaused ? 'Resume' : 'Pause'} onClick={handlePauseOrResume}>
            {isPaused ? (
              /* Resume icon: right-pointing triangle */
              <svg viewBox="0 0 12 12">
                <polygon points="2,1 10,6 2,11" className="filled" />
              </svg>
            ) : (
              /* Pause icon: two vertical bars */
              <svg viewBox="0 0 12 12">
                <rect x="2" y="1" width="3" height="10" rx="1" className="filled" />
                <rect x="7" y="1" width="3" height="10" rx="1" className="filled" />
              </svg>
            )}
          </button>
          {/* Stop — kill running subprocess */}
          <button className="act-btn" type="button" aria-label="Stop" onClick={handleStop}>
            <svg viewBox="0 0 12 12">
              <rect x="1.5" y="1.5" width="9" height="9" rx="2" className="filled" />
            </svg>
          </button>
          {/* Chat — feed recent messages to agent */}
          <button className="act-btn" type="button" aria-label="Chat" onClick={handleReadChat}>
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
          <span className={`name ${neverInvoked ? '' : agentColorClass(agent.agentName)}`} style={neverInvoked ? { color: 'var(--text-3)' } : undefined}>
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
            {agent.lastDurationMs ? `${(agent.lastDurationMs / 1000).toFixed(1)}s` : '\u2014'}
          </span>
        </div>

        {/* Cell 4: large status icon spanning all rows */}
        <div className="cell-status">
          {isAnimating ? (
            <div className="neon-active" style={{ color: 'var(--ac)' }}>
              <Icon className="icon-status" />
            </div>
          ) : (
            <Icon className="icon-status" style={neverInvoked ? { opacity: 0.3 } : undefined} />
          )}
        </div>
      </div>
    </div>
  );
});
