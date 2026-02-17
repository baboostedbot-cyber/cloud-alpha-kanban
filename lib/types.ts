export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'blocked'
export type Priority = 'low' | 'medium' | 'high' | 'critical'
export type AgentKey = 'Linus' | 'Oracle' | 'Sage' | 'Chadimous' | 'Pilot'

export interface Task {
  id: string
  title: string
  desc: string
  assignee: AgentKey
  priority: Priority
  status: TaskStatus
  tags: string[]
  created_at?: string
  updated_at?: string
}

export interface Agent {
  id: string
  name: AgentKey
  role: string
  color: string
  initials: string
}

export interface Activity {
  agent: AgentKey | string
  action: string
  ts: number
}

// Legacy type aliases for backward compatibility
export type ActivityLog = Activity

export const COLUMNS: { id: TaskStatus; label: string; color: string; title?: string }[] = [
  { id: 'backlog', label: 'Backlog', color: '#6366f1', title: 'Backlog' },
  { id: 'todo', label: 'To Do', color: '#f59e0b', title: 'To Do' },
  { id: 'in_progress', label: 'In Progress', color: '#3b82f6', title: 'In Progress' },
  { id: 'review', label: 'Review', color: '#a78bfa', title: 'Review' },
  { id: 'done', label: 'Done', color: '#34d399', title: 'Done' },
  { id: 'blocked', label: 'Blocked', color: '#ef4444', title: 'Blocked' },
]

export const AGENTS: Record<AgentKey, { color: string; role: string; initials: string; bg: string }> = {
  Pilot: { color: '#f59e0b', role: 'Project Manager', initials: 'PI', bg: '#f59e0b18' },
  Linus: { color: '#3b82f6', role: 'Lead Builder', initials: 'LI', bg: '#3b82f618' },
  Sage: { color: '#8b5cf6', role: 'Research', initials: 'SA', bg: '#8b5cf618' },
  Chadimous: { color: '#ec4899', role: 'UI/Content', initials: 'CH', bg: '#ec489918' },
  Oracle: { color: '#22d3ee', role: 'QA/DevOps', initials: 'OR', bg: '#22d3ee18' },
}

export const PRIORITY_STYLES: Record<Priority, { bg: string; color: string }> = {
  critical: { bg: '#7f1d1d', color: '#ef4444' },
  high: { bg: '#78350f', color: '#f59e0b' },
  medium: { bg: '#1e3a5f', color: '#4d7cff' },
  low: { bg: '#4c1d95', color: '#a78bfa' },
}

// Legacy priority colors for backward compatibility  
export const PRIORITY_COLORS: Record<Priority, string> = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-blue-100 text-blue-800 border-blue-200',
}

// Legacy default agents for backward compatibility
export const DEFAULT_AGENTS: Agent[] = [
  { id: '1', name: 'Linus', role: 'Builder', color: '#3b82f6', initials: 'LI' },
  { id: '2', name: 'Oracle', role: 'QA', color: '#22d3ee', initials: 'OR' },
  { id: '3', name: 'Sage', role: 'Research', color: '#8b5cf6', initials: 'SA' },
  { id: '4', name: 'Chadimous', role: 'Content', color: '#ec4899', initials: 'CH' },
  { id: '5', name: 'Pilot', role: 'Coordinator', color: '#f59e0b', initials: 'PI' },
]
