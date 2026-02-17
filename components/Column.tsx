'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Task, TaskStatus, Agent, AgentKey } from '@/lib/types'
import { TaskCard } from './TaskCard'
import { Plus } from 'lucide-react'

interface ColumnProps {
  id: TaskStatus
  title: string
  tasks: Task[]
  agents: Agent[]
  onTaskClick: (task: Task) => void
  onAddTask: (status: TaskStatus) => void
}

const COLUMN_COLORS: Record<TaskStatus, string> = {
  backlog: 'bg-neutral-100 border-neutral-200',
  todo: 'bg-blue-50 border-blue-200',
  'in_progress': 'bg-amber-50 border-amber-200',
  review: 'bg-purple-50 border-purple-200',
  done: 'bg-green-50 border-green-200',
  blocked: 'bg-red-50 border-red-200',
}

export function Column({ id, title, tasks, agents, onTaskClick, onAddTask }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { columnId: id } })

  // Find agent by name (AgentKey) since that's what task.assignee now is
  const findAgent = (assignee: AgentKey): Agent | undefined => {
    return agents.find(a => a.name === assignee)
  }

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-72 min-w-72 rounded-lg border ${COLUMN_COLORS[id]} ${isOver ? 'ring-2 ring-blue-400' : ''}`}
    >
      <div className="flex items-center justify-between p-3 border-b border-inherit">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-neutral-700">{title}</h3>
          <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs font-medium text-neutral-600">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(id)}
          className="p-1 hover:bg-white/50 rounded transition-colors text-neutral-500 hover:text-neutral-700"
        >
          <Plus size={16} />
        </button>
      </div>
      
      <div className="flex-1 p-2 min-h-[100px]">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                agent={findAgent(task.assignee)}
                onClick={() => onTaskClick(task)}
              />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}
