'use client'

import { useState, useEffect } from 'react'
import { Task, TaskStatus, Agent, AgentKey, COLUMNS, Priority } from '@/lib/types'
import { X, Trash2 } from 'lucide-react'

interface TaskModalProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  onSave: (task: Partial<Task>) => void
  onDelete?: (id: string) => void
  agents: Agent[]
  defaultStatus?: TaskStatus
}

export function TaskModal({
  task,
  isOpen,
  onClose,
  onSave,
  onDelete,
  agents,
  defaultStatus = 'backlog',
}: TaskModalProps) {
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [assignee, setAssignee] = useState<AgentKey>('Linus')
  const [priority, setPriority] = useState<Priority>('medium')
  const [status, setStatus] = useState<TaskStatus>(defaultStatus)
  const [tags, setTags] = useState('')

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDesc(task.desc || '')
      setAssignee(task.assignee)
      setPriority(task.priority)
      setStatus(task.status)
      setTags(task.tags?.join(', ') || '')
    } else {
      setTitle('')
      setDesc('')
      setAssignee('Linus')
      setPriority('medium')
      setStatus(defaultStatus)
      setTags('')
    }
  }, [task, defaultStatus, isOpen])

  const handleSave = () => {
    if (!title.trim()) return
    
    onSave({
      id: task?.id,
      title: title.trim(),
      desc: desc.trim(),
      assignee,
      priority,
      status,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    })
    onClose()
  }

  const handleDelete = () => {
    if (task && onDelete && confirm('Are you sure you want to delete this task?')) {
      onDelete(task.id)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200">
          <h2 className="text-lg font-semibold text-neutral-900">
            {task ? 'Edit Task' : 'New Task'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-neutral-500" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter task title"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Description
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
              placeholder="Add a description..."
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Assignee
              </label>
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value as AgentKey)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.name}>
                    {agent.name} ({agent.role})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {COLUMNS.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="frontend, bug, urgent"
              />
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between p-4 border-t border-neutral-200">
          {task && onDelete ? (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={16} />
              Delete
            </button>
          ) : (
            <div />
          )}
          
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {task ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
