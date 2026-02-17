'use client'

import { Activity } from '@/lib/types'
import { Clock, User } from 'lucide-react'

interface ActivityLogSidebarProps {
  logs: Activity[]
}

export function ActivityLogSidebar({ logs }: ActivityLogSidebarProps) {
  const formatTime = (timestamp: number | string) => {
    const ts = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp
    const d = Date.now() - ts
    const m = Math.floor(d / 60000)
    if (m < 1) return "now"
    if (m < 60) return `${m}m`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h`
    return `${Math.floor(h / 24)}d`
  }

  return (
    <div className="w-80 bg-white border-l border-neutral-200 flex flex-col h-full">
      <div className="p-4 border-b border-neutral-200">
        <h2 className="font-semibold text-neutral-900 flex items-center gap-2">
          <Clock size={18} />
          Activity Log
        </h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {logs.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-8">No activity yet</p>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                  <div className="w-px flex-1 bg-neutral-200 my-1" />
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-1 text-neutral-900">
                    <User size={12} className="text-neutral-400" />
                    <span className="font-medium">{log.agent}</span>
                  </div>
                  <p className="text-neutral-600 mt-0.5">{log.action}</p>
                  <span className="text-xs text-neutral-400 mt-1">
                    {formatTime(log.ts)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
