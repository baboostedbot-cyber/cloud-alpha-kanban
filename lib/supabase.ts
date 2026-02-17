import { createClient } from '@supabase/supabase-js'
import { Task, TaskStatus, Priority, AgentKey } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database row type (what Supabase returns)
interface TaskRow {
  id: string
  title: string
  desc: string | null
  assignee: string
  priority: string
  status: string
  tags: string[] | null
  created_at: string
  updated_at: string
}

// Convert database row to Task type
function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    desc: row.desc || '',
    assignee: row.assignee as AgentKey,
    priority: row.priority as Priority,
    status: row.status as TaskStatus,
    tags: row.tags || [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

// Fetch all tasks
export async function getTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching tasks:', error)
    throw error
  }
  
  return (data as TaskRow[] || []).map(rowToTask)
}

// Create a new task
export async function createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert([{
      title: task.title,
      desc: task.desc,
      assignee: task.assignee,
      priority: task.priority,
      status: task.status,
      tags: task.tags,
    }])
    .select()
    .single()
  
  if (error) {
    console.error('Error creating task:', error)
    throw error
  }
  
  return rowToTask(data as TaskRow)
}

// Update a task
export async function updateTask(id: string, updates: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>>): Promise<Task> {
  const updateData: Record<string, unknown> = {}
  if (updates.title !== undefined) updateData.title = updates.title
  if (updates.desc !== undefined) updateData.desc = updates.desc
  if (updates.assignee !== undefined) updateData.assignee = updates.assignee
  if (updates.priority !== undefined) updateData.priority = updates.priority
  if (updates.status !== undefined) updateData.status = updates.status
  if (updates.tags !== undefined) updateData.tags = updates.tags

  const { data, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating task:', error)
    throw error
  }
  
  return rowToTask(data as TaskRow)
}

// Delete a task
export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting task:', error)
    throw error
  }
}

// Subscribe to task changes
type TaskChangeCallback = (payload: { 
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Task | null
  old: Task | null 
}) => void

export function subscribeToTasks(callback: TaskChangeCallback) {
  return supabase
    .channel('tasks-channel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tasks' },
      (payload) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new ? rowToTask(payload.new as TaskRow) : null,
          old: payload.old ? rowToTask(payload.old as TaskRow) : null,
        })
      }
    )
    .subscribe()
}
