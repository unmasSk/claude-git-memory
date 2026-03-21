import {
  User,
  Brain,
  Compass,
  Terminal,
  ShieldCheck,
  FlaskConical,
  Radar,
  Crosshair,
  Activity,
  Scale,
  BookOpen,
  GitBranch,
  Hash,
  Send,
  LogIn,
  LogOut,
  AlertCircle,
  FileSearch,
  Search,
  FolderSearch,
  Pencil,
  SquareTerminal,
  FilePlus,
  GitCommitHorizontal,
  Clock,
  Users,
  Cpu,
  Gauge,
  Globe,
  type LucideIcon,
} from 'lucide-react';

/**
 * Maps agent name to Lucide icon component.
 * Icons match the agent registry definitions.
 */
export const AGENT_ICON: Record<string, LucideIcon> = {
  user:       User,
  claude:     Brain,
  bilbo:      Compass,
  ultron:     Terminal,
  cerberus:   Radar,
  dante:      FlaskConical,
  argus:      ShieldCheck,
  moriarty:   Crosshair,
  house:      Activity,
  yoda:       Scale,
  alexandria: BookOpen,
  gitto:      GitBranch,
};

/**
 * Maps tool names (from stream-json tool_use events) to Lucide icon components.
 */
export const TOOL_ICON: Record<string, LucideIcon> = {
  Read:     FileSearch,
  Grep:     Search,
  Glob:     FolderSearch,
  Edit:     Pencil,
  Write:    FilePlus,
  Bash:     SquareTerminal,
  WebFetch: Globe,
  WebSearch: Globe,
  default:  GitCommitHorizontal,
};

export function getAgentIcon(name: string): LucideIcon {
  return AGENT_ICON[name.toLowerCase()] ?? User;
}

export function getToolIcon(tool: string): LucideIcon {
  return TOOL_ICON[tool] ?? TOOL_ICON.default;
}

// Re-export commonly used icons for convenience
export {
  Hash,
  Send,
  LogIn,
  LogOut,
  AlertCircle,
  Clock,
  Users,
  Cpu,
  Gauge,
  Globe,
  GitBranch,
  GitCommitHorizontal,
};
