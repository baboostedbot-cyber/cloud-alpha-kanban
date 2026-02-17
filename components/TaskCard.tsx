'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Task, Agent, PRIORITY_COLORS, AgentKey } from '@/lib/types'
import { Calendar, Tag, GripVertical } from 'lucide-react'

interface TaskCardProps {
  task: Task
  agent: Agent | undefined
  onClick: () => void
}

export function TaskCard({ task, agent, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { task } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-lg border border-neutral-200 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <div
          {...attributes}
          {...listeners}
          className="mt-0.5 text-neutral-400 hover:text-neutral-600 cursor-grab active:cursor-grabbing"
        >
          <GripVertical size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-neutral-900 line-clamp-2 mb-2">
            {task.title}
          </h4>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${PRIORITY_COLORS[task.priority]}`}>
                {task.priority}
              </span>
              
              {task.tags && task.tags.length > 0 && (
                <div className="flex items-center gap-1 text-neutral-400">
                  <Tag size={10} />
                  <span className="text-[10px]">{task.tags.length}</span>
                </div>
              )}
            </div>
            
            {agent && (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: agent.color }}
                title={agent.name}
              >
                {agent.initials}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
