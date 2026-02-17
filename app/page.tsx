'use client';

import { useState, useEffect, useCallback } from "react";
import { getTasks, createTask, updateTask, deleteTask, subscribeToTasks } from "@/lib/supabase";
import { Task, Activity, AgentKey, Priority, TaskStatus, AGENTS, COLUMNS, PRIORITY_STYLES } from "@/lib/types";

const STORAGE_KEY = "cloud-alpha-board-activity";

const DEFAULT_ACTIVITY: Activity[] = [
  { agent: "Pilot", action: "Onboarded as Cloud Alpha PM — reviewing backlog and setting sprint", ts: Date.now() - 3600000 },
  { agent: "Pilot", action: "Flagged BAB-12 blocked — depends on BAB-1 + BAB-6, escalating priority", ts: Date.now() - 3000000 },
  { agent: "Linus", action: "Started BAB-9 — scaffolding WebSocket gateway", ts: Date.now() - 1800000 },
  { agent: "Sage", action: "Queued competitor research: Pterodactyl + Shockbyte", ts: Date.now() - 2400000 },
  { agent: "Chadimous", action: "Completed BAB-10 (AI chat widget) → Done", ts: Date.now() - 3600000 },
  { agent: "Linus", action: "Moved BAB-11 (Auth) to Review — ready for Oracle", ts: Date.now() - 900000 },
  { agent: "Oracle", action: "Picking up BAB-11 for QA review", ts: Date.now() - 600000 },
  { agent: "Pilot", action: "Daily standup: 1 done, 1 in progress, 1 in review, 1 blocked", ts: Date.now() - 300000 },
];

function timeAgo(ts: number) {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function MissionControl() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [filter, setFilter] = useState<AgentKey | null>(null);
  const [modal, setModal] = useState<string | null>(null);
  const [panel, setPanel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{ title: string; desc: string; assignee: AgentKey; priority: Priority; status: TaskStatus; tags: string }>({ 
    title: "", 
    desc: "", 
    assignee: "Linus", 
    priority: "medium", 
    status: "todo", 
    tags: "" 
  });
  const [dragTask, setDragTask] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load tasks from Supabase
  useEffect(() => {
    loadTasks();
    loadActivity();
    
    // Set up real-time subscription
    const subscription = subscribeToTasks((payload) => {
      if (payload.eventType === 'INSERT' && payload.new) {
        setTasks(prev => [payload.new!, ...prev]);
        addActivity(payload.new.assignee, `Created task: ${payload.new.title}`);
      } else if (payload.eventType === 'UPDATE' && payload.new) {
        setTasks(prev => prev.map(t => t.id === payload.new!.id ? payload.new! : t));
        if (payload.old && payload.old.status !== payload.new.status) {
          addActivity(payload.new.assignee, `Moved "${payload.new.title}" → ${payload.new.status.replace("_", " ")}`);
        }
      } else if (payload.eventType === 'DELETE' && payload.old) {
        setTasks(prev => prev.filter(t => t.id !== payload.old!.id));
        addActivity("Babu", `Deleted: ${payload.old.title}`);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await getTasks();
      setTasks(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load tasks:', err);
      setError('Failed to load tasks from database');
    } finally {
      setLoading(false);
    }
  };

  const loadActivity = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setActivity(data.activity || DEFAULT_ACTIVITY);
      } catch {
        setActivity(DEFAULT_ACTIVITY);
      }
    } else {
      setActivity(DEFAULT_ACTIVITY);
    }
  };

  const saveActivity = (a: Activity[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ activity: a }));
    } catch (e) {
      console.error("Save failed:", e);
    }
  };

  const addActivity = useCallback((agent: AgentKey | string, action: string) => {
    setActivity(prev => {
      const newActivity = [{ agent, action, ts: Date.now() }, ...prev];
      saveActivity(newActivity);
      return newActivity;
    });
  }, []);

  const filtered = filter ? tasks.filter((t) => t.assignee === filter) : tasks;

  function openNew(status: TaskStatus = "todo") {
    setForm({ title: "", desc: "", assignee: "Linus", priority: "medium", status, tags: "" });
    setModal("new");
  }

  function openEdit(id: string) {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    setForm({ 
      title: t.title, 
      desc: t.desc || "", 
      assignee: t.assignee, 
      priority: t.priority, 
      status: t.status,
      tags: t.tags?.join(", ") || ""
    });
    setModal(id);
  }

  async function saveTask() {
    if (!form.title?.trim()) return;
    setIsSaving(true);
    
    try {
      const tags = form.tags.split(",").map((s) => s.trim()).filter(Boolean);

      if (modal === "new") {
        const newTask = await createTask({
          title: form.title,
          desc: form.desc,
          assignee: form.assignee,
          priority: form.priority,
          status: form.status,
          tags,
        });
        setTasks(prev => [newTask, ...prev]);
        addActivity(form.assignee, `Created: ${form.title}`);
      } else {
        const old = tasks.find((t) => t.id === modal);
        const updated = await updateTask(modal!, {
          title: form.title,
          desc: form.desc,
          assignee: form.assignee,
          priority: form.priority,
          status: form.status,
          tags,
        });
        setTasks(prev => prev.map(t => t.id === modal ? updated : t));
        
        if (old?.status !== form.status) {
          addActivity(form.assignee, `Moved "${form.title}" → ${form.status.replace("_", " ")}`);
        } else {
          addActivity(form.assignee, `Updated: ${form.title}`);
        }
      }
      setModal(null);
    } catch (err) {
      console.error('Failed to save task:', err);
      setError('Failed to save task');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteTask() {
    const t = tasks.find((x) => x.id === modal);
    if (!t) return;
    
    setIsSaving(true);
    try {
      await deleteTask(modal!);
      setTasks(prev => prev.filter(x => x.id !== modal));
      addActivity("Babu", `Deleted: ${t.title}`);
      setModal(null);
    } catch (err) {
      console.error('Failed to delete task:', err);
      setError('Failed to delete task');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDrop(colId: TaskStatus) {
    if (!dragTask) return;
    const t = tasks.find((x) => x.id === dragTask);
    if (!t || t.status === colId) {
      setDragTask(null);
      return;
    }
    
    // Optimistic update
    setTasks(prev => prev.map(x => x.id === dragTask ? { ...x, status: colId } : x));
    
    try {
      await updateTask(dragTask, { status: colId });
      addActivity(t.assignee, `Moved "${t.title}" → ${colId.replace("_", " ")}`);
    } catch (err) {
      console.error('Failed to move task:', err);
      // Revert on error
      setTasks(prev => prev.map(x => x.id === dragTask ? { ...x, status: t.status } : x));
    }
    setDragTask(null);
  }

  const stats = {
    total: tasks.length,
    progress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
    blocked: tasks.filter((t) => t.status === "blocked").length,
  };

  if (loading) {
    return (
      <div style={{ background: "#0a0a0f", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#4d7cff", flexDirection: "column", gap: 16 }}>
        <div style={{ width: 40, height: 40, border: "3px solid #1e1e2e", borderTop: "3px solid #4d7cff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <span>Loading Mission Control...</span>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ background: "#0a0a0f", minHeight: "100vh", color: "#e8e8ef", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Error Banner */}
      {error && (
        <div style={{ background: "#7f1d1d", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "#ef4444" }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}>×</button>
        </div>
      )}

      {/* Top Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderBottom: "1px solid #1e1e2e", background: "#12121a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 30, height: 30, background: "linear-gradient(135deg, #4d7cff, #22d3ee)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, color: "#000" }}>CA</div>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Cloud Alpha</span>
          <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "#3d5cb8", color: "#4d7cff" }}>MISSION CONTROL</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setPanel(panel === "activity" ? null : "activity")} style={{ padding: "6px 12px", background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 6, color: "#a0a0b0", fontSize: 12, cursor: "pointer" }}>Activity</button>
          <button onClick={() => openNew("todo")} style={{ padding: "6px 14px", background: "#4d7cff", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ New Task</button>
          <div style={{ width: 7, height: 7, background: "#34d399", borderRadius: "50%" }} />
          <span style={{ fontSize: 11, color: "#34d399" }}>LIVE</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", padding: "0 24px", background: "#12121a", borderBottom: "1px solid #1e1e2e" }}>
        {[
          { label: "TOTAL", val: stats.total, color: "#4d7cff" },
          { label: "IN PROGRESS", val: stats.progress, color: "#f59e0b" },
          { label: "DONE", val: stats.done, color: "#34d399" },
          { label: "BLOCKED", val: stats.blocked, color: "#ef4444" },
        ].map((s) => (
          <div key={s.label} style={{ flex: 1, padding: "16px 0", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#6c6c80", letterSpacing: 0.5 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", borderBottom: "1px solid #1e1e2e", overflowX: "auto" }}>
        <button onClick={() => setFilter(null)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: filter === null ? "#3d5cb8" : "#1e1e2e", color: filter === null ? "#4d7cff" : "#a0a0b0", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>All ({tasks.length})</button>
        {(Object.keys(AGENTS) as AgentKey[]).map((name) => {
          const info = AGENTS[name];
          return (
            <button key={name} onClick={() => setFilter(name)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: filter === name ? info.bg : "#1e1e2e", color: filter === name ? info.color : "#a0a0b0", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
              <span style={{ marginRight: 6 }}>{info.initials}</span>{name}
            </button>
          );
        })}
      </div>

      {/* Board */}
      <div style={{ display: "flex", gap: 16, padding: 20, overflowX: "auto", height: "calc(100vh - 200px)" }}>
        {COLUMNS.map((col) => (
          <div key={col.id} style={{ minWidth: 280, maxWidth: 320, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: col.color }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#a0a0b0", textTransform: "uppercase", letterSpacing: 0.5 }}>{col.label}</span>
              </div>
              <span style={{ fontSize: 11, color: "#6c6c80", background: "#1e1e2e", padding: "2px 8px", borderRadius: 10 }}>
                {filtered.filter((t) => t.status === col.id).length}
              </span>
            </div>
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(col.id)}
              style={{ minHeight: 400, background: "#12121a", borderRadius: 8, padding: 10, border: "1px solid #1e1e2e" }}
            >
              {filtered.filter((t) => t.status === col.id).map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => setDragTask(task.id)}
                  onClick={() => openEdit(task.id)}
                  style={{ 
                    background: "#1a1a24", 
                    borderRadius: 6, 
                    padding: 12, 
                    marginBottom: 8, 
                    cursor: "pointer",
                    borderLeft: `3px solid ${AGENTS[task.assignee]?.color || "#666"}`,
                    transition: "transform 0.1s"
                  }}
                >
                  <div style={{ fontSize: 10, color: "#6c6c80", marginBottom: 4 }}>{task.id.slice(0, 8)}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, color: "#e8e8ef" }}>{task.title}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 16, height: 16, borderRadius: 4, background: AGENTS[task.assignee]?.bg, color: AGENTS[task.assignee]?.color, fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}>
                        {AGENTS[task.assignee]?.initials}
                      </div>
                      <span style={{ fontSize: 11, color: "#6c6c80" }}>{task.assignee}</span>
                    </div>
                    <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 4, background: PRIORITY_STYLES[task.priority]?.bg, color: PRIORITY_STYLES[task.priority]?.color, fontWeight: 600, textTransform: "uppercase" }}>
                      {task.priority}
                    </span>
                  </div>
                </div>
              ))}
              <button onClick={() => openNew(col.id)} style={{ width: "100%", padding: "8px", background: "transparent", border: "1px dashed #2a2a3e", borderRadius: 6, color: "#6c6c80", fontSize: 12, cursor: "pointer", marginTop: 8 }}>+ Add task</button>
            </div>
          </div>
        ))}
      </div>

      {/* Activity Panel */}
      {panel === "activity" && (
        <div style={{ position: "fixed", top: 0, right: 0, width: 320, height: "100vh", background: "#12121a", borderLeft: "1px solid #1e1e2e", padding: 20, overflowY: "auto", zIndex: 100 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Activity Log</span>
            <button onClick={() => setPanel(null)} style={{ background: "none", border: "none", color: "#6c6c80", cursor: "pointer", fontSize: 18 }}>×</button>
          </div>
          {activity.slice(0, 20).map((a, i) => (
            <div key={i} style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: AGENTS[a.agent as AgentKey]?.color || "#666", marginTop: 4, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 12, color: "#e8e8ef" }}><span style={{ color: AGENTS[a.agent as AgentKey]?.color }}>{a.agent}</span></div>
                <div style={{ fontSize: 12, color: "#a0a0b0", marginTop: 2 }}>{a.action}</div>
                <div style={{ fontSize: 10, color: "#6c6c80", marginTop: 4 }}>{timeAgo(a.ts)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div style={{ background: "#1a1a24", borderRadius: 12, padding: 24, width: 440, maxHeight: "90vh", overflowY: "auto", border: "1px solid #2a2a3e" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{modal === "new" ? "New Task" : "Edit Task"}</span>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", color: "#6c6c80", cursor: "pointer", fontSize: 20 }}>×</button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, color: "#6c6c80", marginBottom: 6 }}>Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ width: "100%", padding: "10px 12px", background: "#12121a", border: "1px solid #2a2a3e", borderRadius: 6, color: "#e8e8ef", fontSize: 13 }} placeholder="Task title..." />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, color: "#6c6c80", marginBottom: 6 }}>Description</label>
              <textarea value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} style={{ width: "100%", padding: "10px 12px", background: "#12121a", border: "1px solid #2a2a3e", borderRadius: 6, color: "#e8e8ef", fontSize: 13, minHeight: 80, resize: "vertical" }} placeholder="Description..." />
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 12, color: "#6c6c80", marginBottom: 6 }}>Assignee</label>
                <select value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value as AgentKey })} style={{ width: "100%", padding: "10px 12px", background: "#12121a", border: "1px solid #2a2a3e", borderRadius: 6, color: "#e8e8ef", fontSize: 13 }}>
                  {(Object.keys(AGENTS) as AgentKey[]).map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 12, color: "#6c6c80", marginBottom: 6 }}>Priority</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })} style={{ width: "100%", padding: "10px 12px", background: "#12121a", border: "1px solid #2a2a3e", borderRadius: 6, color: "#e8e8ef", fontSize: 13 }}>
                  {(Object.keys(PRIORITY_STYLES) as Priority[]).map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, color: "#6c6c80", marginBottom: 6 }}>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })} style={{ width: "100%", padding: "10px 12px", background: "#12121a", border: "1px solid #2a2a3e", borderRadius: 6, color: "#e8e8ef", fontSize: 13 }}>
                {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, color: "#6c6c80", marginBottom: 6 }}>Tags (comma separated)</label>
              <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} style={{ width: "100%", padding: "10px 12px", background: "#12121a", border: "1px solid #2a2a3e", borderRadius: 6, color: "#e8e8ef", fontSize: 13 }} placeholder="infrastructure, backend..." />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              {modal !== "new" && (
                <button onClick={handleDeleteTask} disabled={isSaving} style={{ padding: "10px 16px", background: "#7f1d1d", border: "none", borderRadius: 6, color: "#ef4444", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: isSaving ? 0.5 : 1 }}>Delete</button>
              )}
              <button onClick={() => setModal(null)} disabled={isSaving} style={{ padding: "10px 16px", background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 6, color: "#a0a0b0", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={saveTask} disabled={isSaving || !form.title?.trim()} style={{ flex: 1, padding: "10px 16px", background: "#4d7cff", border: "none", borderRadius: 6, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: isSaving || !form.title?.trim() ? 0.5 : 1 }}>{isSaving ? 'Saving...' : 'Save Task'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
