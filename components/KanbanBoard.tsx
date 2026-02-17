'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects,
  DropAnimation,
} from '@dnd-kit/core'
import { Task, TaskStatus, Agent, Activity, COLUMNS, DEFAULT_AGENTS } from '@/lib/types'
import { getTasks, createTask, updateTask, deleteTask, subscribeToTasks } from '@/lib/supabase'
import { Column } from './Column'
import { TaskCard } from './TaskCard'
import { TaskModal } from './TaskModal'
import { ActivityLogSidebar } from './ActivityLog'
import { Layout, Plus, WifiOff } from 'lucide-react'

// Demo data for when Supabase is not configured
const DEMO_TASKS: Task[] = [
  { id: 't1', title: 'Setup Supabase project', desc: 'Create database and configure realtime', assignee: 'Linus', priority: 'high', status: 'done', tags: ['setup', 'infrastructure'] },
  { id: 't2', title: 'Build Kanban board UI', desc: 'Create drag-and-drop interface', assignee: 'Linus', priority: 'high', status: 'in_progress', tags: ['ui', 'frontend'] },
  { id: 't3', title: 'Add real-time sync', desc: 'Implement Supabase realtime subscriptions', assignee: 'Oracle', priority: 'medium', status: 'todo', tags: ['realtime', 'supabase'] },
  { id: 't4', title: 'Write test cases', desc: 'Create E2E tests for board functionality', assignee: 'Oracle', priority: 'medium', status: 'backlog', tags: ['testing', 'qa'] },
  { id: 't5', title: 'Review UI design', desc: 'Check accessibility and responsiveness', assignee: 'Sage', priority: 'low', status: 'review', tags: ['design', 'review'] },
  { id: 't6', title: 'Research competitors', desc: 'Analyze competitor kanban tools', assignee: 'Sage', priority: 'medium', status: 'in_progress', tags: ['research', 'competitors'] },
  { id: 't7', title: 'Create documentation', desc: 'Write user guide for the board', assignee: 'Chadimous', priority: 'low', status: 'backlog', tags: ['docs', 'content'] },
  { id: 't8', title: 'Deploy to Vercel', desc: 'Configure CI/CD pipeline', assignee: 'Pilot', priority: 'critical', status: 'todo', tags: ['deployment', 'vercel'] },
  { id: 't9', title: 'Fix authentication bug', desc: 'Users unable to login with SSO', assignee: 'Oracle', priority: 'critical', status: 'blocked', tags: ['bug', 'auth'] },
]

const DEMO_LOGS: Activity[] = [
  { agent: 'Linus', action: 'Created task "Build Kanban board UI"', ts: Date.now() - 3600000 },
  { agent: 'Oracle', action: 'Moved "Review UI design" to Review', ts: Date.now() - 7200000 },
  { agent: 'Linus', action: 'Completed "Setup Supabase project"', ts: Date.now() - 10800000 },
]

export function KanbanBoard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [agents, setAgents] = useState<Agent[]>(DEFAULT_AGENTS)
  const [activityLogs, setActivityLogs] = useState<Activity[]>([])
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('backlog')
  const [loading, setLoading] = useState(true)
  const [isDemoMode, setIsDemoMode] = useState(false)

  // Load initial data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Check if Supabase is properly configured
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const isConfigured = supabaseUrl && !supabaseUrl.includes('placeholder')
      
      if (!isConfigured) {
        console.log('Supabase not configured, using demo mode')
        setIsDemoMode(true)
        setTasks(DEMO_TASKS)
        setActivityLogs(DEMO_LOGS)
        setLoading(false)
        return
      }
      
      // Load tasks from Supabase
      const tasksData = await getTasks()
      if (tasksData.length > 0) {
        setTasks(tasksData)
      } else {
        setTasks(DEMO_TASKS)
        setIsDemoMode(true)
      }
      
      // Setup realtime
      setupRealtime()
    } catch (error) {
      console.error('Error loading data, falling back to demo mode:', error)
      setIsDemoMode(true)
      setTasks(DEMO_TASKS)
      setActivityLogs(DEMO_LOGS)
    } finally {
      setLoading(false)
    }
  }

  const setupRealtime = () => {
    // Subscribe to tasks changes
    const subscription = subscribeToTasks((payload) => {
      if (payload.eventType === 'INSERT' && payload.new) {
        setTasks((prev) => [payload.new!, ...prev])
        addActivityLog(payload.new.assignee, `Created "${payload.new.title}"`)
      } else if (payload.eventType === 'UPDATE' && payload.new) {
        setTasks((prev) => prev.map((t) => (t.id === payload.new!.id ? payload.new! : t)))
        if (payload.old && payload.old.status !== payload.new.status) {
          addActivityLog(payload.new.assignee, `Moved "${payload.new.title}" → ${payload.new.status}`)
        }
      } else if (payload.eventType === 'DELETE' && payload.old) {
        setTasks((prev) => prev.filter((t) => t.id !== payload.old!.id))
        addActivityLog('System', `Deleted "${payload.old.title}"`)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }

  const addActivityLog = (agent: string, action: string) => {
    setActivityLogs(prev => [{ agent, action, ts: Date.now() }, ...prev].slice(0, 50))
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id)
    if (task) setActiveTask(task)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id as string
    const overId = over.id as string
    
    // Check if dropped on a column
    const isColumn = COLUMNS.some((c) => c.id === overId)
    
    if (isColumn) {
      const newStatus = overId as TaskStatus
      const task = tasks.find((t) => t.id === taskId)
      
      if (task && task.status !== newStatus) {
        // Optimistic update
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)))
        
        if (!isDemoMode) {
          try {
            await updateTask(taskId, { status: newStatus })
            addActivityLog(task.assignee, `Moved "${task.title}" → ${newStatus}`)
          } catch (err) {
            // Revert on error
            setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: task.status } : t)))
          }
        } else {
          addActivityLog(task.assignee, `Moved "${task.title}" → ${newStatus}`)
        }
      }
    }
  }

  const handleSaveTask = async (taskData: Partial<Task>) => {
    try {
      if (isDemoMode) {
        if (taskData.id) {
          setTasks(prev => prev.map(t => t.id === taskData.id ? { ...t, ...taskData } as Task : t))
          addActivityLog(taskData.assignee || 'System', `Updated "${taskData.title}"`)
        } else {
          const newTask: Task = {
            id: `t${Date.now()}`,
            title: taskData.title!,
            desc: taskData.desc || '',
            assignee: taskData.assignee || 'Linus',
            priority: taskData.priority || 'medium',
            status: taskData.status || 'backlog',
            tags: taskData.tags || [],
          }
          setTasks(prev => [newTask, ...prev])
          addActivityLog(newTask.assignee, `Created "${newTask.title}"`)
        }
        return
      }

      if (taskData.id) {
        const updated = await updateTask(taskData.id, taskData)
        setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
        addActivityLog(updated.assignee, `Updated "${updated.title}"`)
      } else {
        const created = await createTask({
          title: taskData.title!,
          desc: taskData.desc || '',
          assignee: taskData.assignee || 'Linus',
          priority: taskData.priority || 'medium',
          status: taskData.status || 'backlog',
          tags: taskData.tags || [],
        })
        setTasks(prev => [created, ...prev])
        addActivityLog(created.assignee, `Created "${created.title}"`)
      }
    } catch (error) {
      console.error('Error saving task:', error)
    }
  }

  const handleDeleteTask = async (id: string) => {
    try {
      if (isDemoMode) {
        setTasks(prev => prev.filter(t => t.id !== id))
        addActivityLog('System', 'Deleted a task')
        return
      }

      await deleteTask(id)
      setTasks(prev => prev.filter(t => t.id !== id))
      addActivityLog('System', 'Deleted a task')
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const openNewTaskModal = (status: TaskStatus = 'backlog') => {
    setSelectedTask(null)
    setDefaultStatus(status)
    setIsModalOpen(true)
  }

  const openEditTaskModal = (task: Task) => {
    setSelectedTask(task)
    setIsModalOpen(true)
  }

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: { active: { opacity: '0.5' } },
    }),
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-neutral-50"
    >
      <div className="flex-1 flex flex-col min-w-0"
      >
        <header className="bg-white border-b border-neutral-200 px-6 py-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Layout className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-neutral-900">Cloud Alpha</h1>
                <p className="text-sm text-neutral-500">Team Kanban Board</p>
              </div>
              {isDemoMode && (
                <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                  <WifiOff size={12} />
                  Demo Mode
                </div>
              )}
            </div>
            <button
              onClick={() => openNewTaskModal('backlog')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} />
              New Task
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-x-auto overflow-y-hidden"
        >
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 p-6 h-full min-w-max"
            >
              {COLUMNS.map((column) => (
                <Column
                  key={column.id}
                  id={column.id}
                  title={column.title || column.label}
                  tasks={tasks.filter((t) => t.status === column.id)}
                  agents={agents}
                  onTaskClick={openEditTaskModal}
                  onAddTask={openNewTaskModal}
                />
              ))}
            </div>
          </DndContext>
        </div>
      </div>

      <ActivityLogSidebar logs={activityLogs} />

      <TaskModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        onDelete={selectedTask ? handleDeleteTask : undefined}
        agents={agents}
        defaultStatus={defaultStatus}
      />
    </div>
  )
}
