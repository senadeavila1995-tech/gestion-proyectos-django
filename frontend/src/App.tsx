import { useCallback, useEffect, useState, type FormEvent } from 'react'
import Swal from 'sweetalert2'
import './App.css'

const API = 'http://127.0.0.1:8001/api/'
const ACCESS_KEY = 'gestion_access'
const REFRESH_KEY = 'gestion_refresh'

type Task = {
  id: string
  project: string
  project_name: string
  title: string
  description: string
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  due_date: string | null
}

type Project = {
  id: string
  name: string
  description: string
  status: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED'
  start_date: string | null
  due_date: string | null
  tasks: Task[]
  task_count: number
}

type AuthData = {
  access: string
  refresh: string
}

async function api<T = unknown>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  const token = localStorage.getItem(ACCESS_KEY)
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(API + path, { ...options, headers })

  if (response.status === 401 && retry && localStorage.getItem(REFRESH_KEY)) {
    const refreshed = await fetch(API + 'auth/token/refresh/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: localStorage.getItem(REFRESH_KEY) }),
    })

    if (refreshed.ok) {
      const data = await refreshed.json()
      localStorage.setItem(ACCESS_KEY, data.access)
      return api(path, options, false)
    }
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = data.detail
      || Object.entries(data).map(([key, value]) =>
        `${key}: ${Array.isArray(value) ? value.join(', ') : typeof value === 'string' ? value : JSON.stringify(value)}`,
      ).join('\n')
      || `Error HTTP ${response.status}`
    throw new Error(message)
  }
  return data as T
}

function saveTokens(data: AuthData) {
  localStorage.setItem(ACCESS_KEY, data.access)
  localStorage.setItem(REFRESH_KEY, data.refresh)
}

function clearTokens() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

const projectStatuses = [
  { value: 'PLANNING', label: 'Planificación' },
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'ON_HOLD', label: 'En pausa' },
  { value: 'COMPLETED', label: 'Completado' },
]

const taskStatuses = [
  { value: 'TODO', label: 'Pendiente' },
  { value: 'IN_PROGRESS', label: 'En progreso' },
  { value: 'REVIEW', label: 'En revisión' },
  { value: 'DONE', label: 'Completada' },
]

const priorities = [
  { value: 'LOW', label: 'Baja' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
]

const labelFor = (items: { value: string; label: string }[], value: string) =>
  items.find(item => item.value === value)?.label ?? value

function dateLabel(value: string | null) {
  if (!value) return 'Sin fecha'
  return new Date(`${value}T12:00:00`).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function App() {
  const [access, setAccess] = useState(() => localStorage.getItem(ACCESS_KEY))
  const [username, setUsername] = useState(() => localStorage.getItem('gestion_username') || '')
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [auth, setAuth] = useState({ username: '', email: '', password: '' })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [taskProject, setTaskProject] = useState<string | null>(null)
  const [projectForm, setProjectForm] = useState({
    name: '', description: '', status: 'PLANNING', start_date: '', due_date: '',
  })
  const [taskForm, setTaskForm] = useState({
    title: '', description: '', priority: 'MEDIUM', due_date: '',
  })

  const loadProjects = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<Project[] | { results?: Project[] }>('projects/')
      setProjects(Array.isArray(data) ? data : data.results ?? [])
    } catch (error) {
      await Swal.fire('No se pudieron cargar los proyectos', (error as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (access) window.setTimeout(() => { void loadProjects() }, 0)
  }, [access, loadProjects])

  async function handleAuth(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    try {
      if (authMode === 'register') {
        await api('auth/register/', {
          method: 'POST',
          body: JSON.stringify({
            username: auth.username.trim(),
            email: auth.email.trim(),
            password: auth.password,
          }),
        })
      }

      const tokens = await api<AuthData>('auth/token/', {
        method: 'POST',
        body: JSON.stringify({
          username: auth.username.trim(),
          password: auth.password,
        }),
      })

      saveTokens(tokens)
      localStorage.setItem('gestion_username', auth.username.trim())
      setUsername(auth.username.trim())
      setAccess(tokens.access)
      setAuth({ username: '', email: '', password: '' })
      await Swal.fire({
        icon: 'success',
        title: authMode === 'register' ? 'Cuenta creada' : 'Bienvenido',
        text: 'Sesión iniciada correctamente.',
        timer: 1300,
        showConfirmButton: false,
      })
    } catch (error) {
      await Swal.fire('No fue posible iniciar sesión', (error as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    clearTokens()
    localStorage.removeItem('gestion_username')
    setAccess(null)
    setUsername('')
    setProjects([])
  }

  function openNewProject() {
    setEditingProject(null)
    setProjectForm({
      name: '', description: '', status: 'PLANNING', start_date: '', due_date: '',
    })
    setShowProjectForm(true)
  }

  function openEditProject(project: Project) {
    setEditingProject(project)
    setProjectForm({
      name: project.name,
      description: project.description || '',
      status: project.status,
      start_date: project.start_date || '',
      due_date: project.due_date || '',
    })
    setShowProjectForm(true)
  }

  async function saveProject(event: FormEvent) {
    event.preventDefault()
    try {
      await api(
        editingProject ? `projects/${editingProject.id}/` : 'projects/',
        {
          method: editingProject ? 'PATCH' : 'POST',
          body: JSON.stringify({
            ...projectForm,
            start_date: projectForm.start_date || null,
            due_date: projectForm.due_date || null,
          }),
        },
      )
      setShowProjectForm(false)
      await loadProjects()
      await Swal.fire('Guardado', 'El proyecto se guardó correctamente.', 'success')
    } catch (error) {
      await Swal.fire('No se pudo guardar', (error as Error).message, 'error')
    }
  }

  async function deleteProject(project: Project) {
    const result = await Swal.fire({
      title: '¿Eliminar proyecto?',
      text: `Se eliminarán también las tareas de "${project.name}".`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545',
    })
    if (!result.isConfirmed) return

    try {
      await api(`projects/${project.id}/`, { method: 'DELETE' })
      await loadProjects()
      await Swal.fire('Eliminado', 'El proyecto fue eliminado.', 'success')
    } catch (error) {
      await Swal.fire('Error', (error as Error).message, 'error')
    }
  }

  async function saveTask(event: FormEvent) {
    event.preventDefault()
    if (!taskProject) return
    try {
      await api('tasks/', {
        method: 'POST',
        body: JSON.stringify({
          project: taskProject,
          ...taskForm,
          due_date: taskForm.due_date || null,
        }),
      })
      setTaskProject(null)
      setTaskForm({ title: '', description: '', priority: 'MEDIUM', due_date: '' })
      await loadProjects()
      await Swal.fire('Tarea creada', 'La tarea se agregó al proyecto.', 'success')
    } catch (error) {
      await Swal.fire('No se pudo crear la tarea', (error as Error).message, 'error')
    }
  }

  async function updateTask(task: Task, changes: Partial<Task>) {
    try {
      await api(`tasks/${task.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(changes),
      })
      await loadProjects()
    } catch (error) {
      await Swal.fire('No se pudo actualizar la tarea', (error as Error).message, 'error')
    }
  }

  async function deleteTask(task: Task) {
    const result = await Swal.fire({
      title: '¿Eliminar tarea?',
      text: task.title,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545',
    })
    if (!result.isConfirmed) return
    try {
      await api(`tasks/${task.id}/`, { method: 'DELETE' })
      await loadProjects()
      await Swal.fire('Eliminada', 'La tarea fue eliminada.', 'success')
    } catch (error) {
      await Swal.fire('Error', (error as Error).message, 'error')
    }
  }

  if (!access) {
    return (
      <main className="auth-screen">
        <section className="auth-brand">
          <div className="brand-mark">G</div>
          <span className="brand-name">GestiónPro</span>
          <h1>Todo tu trabajo.<br /><span>En un solo lugar.</span></h1>
          <p>Organiza proyectos, prioriza tareas y avanza con claridad.</p>
          <div className="auth-decoration"><span>✓</span> Planifica <span>✓</span> Colabora <span>✓</span> Cumple</div>
        </section>
        <section className="auth-panel">
          <div className="auth-card">
            <div className="small-label">PLATAFORMA DE GESTIÓN</div>
            <h2>{authMode === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}</h2>
            <p className="text-secondary mb-4">
              {authMode === 'login' ? 'Ingresa tus datos para continuar.' : 'Regístrate para comenzar a organizar tu trabajo.'}
            </p>
            <form onSubmit={handleAuth}>
              <label className="form-label">Nombre de usuario</label>
              <input className="form-control form-control-lg mb-3" required autoComplete="username"
                value={auth.username} onChange={e => setAuth({ ...auth, username: e.target.value })}
                placeholder="Tu usuario" />
              {authMode === 'register' && <>
                <label className="form-label">Correo electrónico</label>
                <input className="form-control form-control-lg mb-3" type="email" required autoComplete="email"
                  value={auth.email} onChange={e => setAuth({ ...auth, email: e.target.value })}
                  placeholder="nombre@empresa.com" />
              </>}
              <label className="form-label">Contraseña</label>
              <input className="form-control form-control-lg mb-4" type="password" required minLength={8}
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                value={auth.password} onChange={e => setAuth({ ...auth, password: e.target.value })}
                placeholder="Mínimo 8 caracteres" />
              <button className="btn btn-primary btn-lg w-100" disabled={loading}>
                {loading ? 'Procesando…' : authMode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              </button>
            </form>
            <div className="auth-switch">
              {authMode === 'login' ? '¿Aún no tienes cuenta?' : '¿Ya tienes una cuenta?'}{' '}
              <button className="btn btn-link p-0" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
                {authMode === 'login' ? 'Regístrate' : 'Inicia sesión'}
              </button>
            </div>
            <div className="auth-security"><span>●</span> Sesión protegida mediante JWT</div>
          </div>
        </section>
      </main>
    )
  }

  const allTasks = projects.flatMap(project => project.tasks ?? [])
  const completedTasks = allTasks.filter(task => task.status === 'DONE').length
  const pendingTasks = allTasks.filter(task => task.status !== 'DONE').length
  const filteredProjects = projects.filter(project => {
    const matchesSearch = `${project.name} ${project.description}`.toLowerCase().includes(search.toLowerCase())
    return matchesSearch && (statusFilter === 'ALL' || project.status === statusFilter)
  })

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand"><div className="brand-mark">G</div><span>GestiónPro</span></div>
        <div className="nav-caption">ESPACIO DE TRABAJO</div>
        <div className="side-link active"><span>▦</span> Panel general</div>
        <div className="side-link"><span>▤</span> Mis proyectos <span className="side-count">{projects.length}</span></div>
        <div className="sidebar-bottom">
          <div className="user-avatar">{username.slice(0, 1).toUpperCase()}</div>
          <div className="user-info"><strong>{username}</strong><small>Cuenta personal</small></div>
          <button className="logout-btn" title="Cerrar sesión" onClick={logout}>↪</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div><span className="breadcrumb-muted">Espacio de trabajo</span><span className="breadcrumb-sep">/</span> Panel general</div>
          <div className="topbar-right"><span className="connection-dot"></span> API conectada <span className="topbar-avatar">{username.slice(0, 1).toUpperCase()}</span></div>
        </header>

        <div className="page-content">
          <section className="welcome-row">
            <div><div className="small-label">TU RESUMEN</div><h1>Hola, {username} <span className="wave">✦</span></h1>
              <p>Este es el estado actual de tus proyectos. Vamos a avanzar.</p></div>
            <button className="btn btn-primary" onClick={openNewProject}>＋ Nuevo proyecto</button>
          </section>

          <section className="stats-grid">
            <div className="stat-card"><div className="stat-icon icon-blue">▤</div><div className="stat-title">Total de proyectos</div><div className="stat-number">{projects.length}</div><div className="stat-note">En tu espacio de trabajo</div></div>
            <div className="stat-card"><div className="stat-icon icon-amber">◷</div><div className="stat-title">Tareas pendientes</div><div className="stat-number">{pendingTasks}</div><div className="stat-note">Por completar</div></div>
            <div className="stat-card"><div className="stat-icon icon-green">✓</div><div className="stat-title">Tareas completadas</div><div className="stat-number">{completedTasks}</div><div className="stat-note">{allTasks.length ? Math.round(completedTasks / allTasks.length * 100) : 0}% de las tareas</div></div>
            <div className="stat-card"><div className="stat-icon icon-purple">◫</div><div className="stat-title">Proyectos activos</div><div className="stat-number">{projects.filter(p => p.status === 'ACTIVE').length}</div><div className="stat-note">En ejecución</div></div>
          </section>

          <section className="projects-section">
            <div className="section-heading"><div><h2>Mis proyectos</h2><p>Administra tus proyectos y sus tareas.</p></div>
              <button className="btn btn-outline-secondary btn-sm" onClick={() => void loadProjects()}>↻ Actualizar</button></div>
            <div className="filter-row">
              <div className="search-box"><span>⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar proyectos…" /></div>
              <select className="form-select filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="ALL">Todos los estados</option>
                {projectStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            {loading && projects.length === 0 ? <div className="empty-state"><div className="spinner-border text-primary" /><p>Cargando proyectos…</p></div>
              : filteredProjects.length === 0 ? <div className="empty-state"><div className="empty-icon">▤</div><h3>{projects.length ? 'No hay resultados' : 'Tu próximo proyecto empieza aquí'}</h3><p>{projects.length ? 'Prueba con otro término o estado.' : 'Crea un proyecto para organizar tus objetivos y tareas.'}</p>{!projects.length && <button className="btn btn-primary" onClick={openNewProject}>Crear primer proyecto</button>}</div>
              : <div className="project-grid">
                {filteredProjects.map(project => {
                  const tasks = project.tasks ?? []
                  const done = tasks.filter(t => t.status === 'DONE').length
                  const progress = tasks.length ? Math.round(done / tasks.length * 100) : 0
                  return <article className="project-card" key={project.id}>
                    <div className="project-card-top"><div className="project-symbol">▤</div><span className={`status-badge status-${project.status.toLowerCase()}`}>{labelFor(projectStatuses, project.status)}</span></div>
                    <h3>{project.name}</h3><p className="project-description">{project.description || 'Sin descripción para este proyecto.'}</p>
                    <div className="project-dates"><span>Inicio <strong>{dateLabel(project.start_date)}</strong></span><span>Vencimiento <strong>{dateLabel(project.due_date)}</strong></span></div>
                    <div className="progress-heading"><span>Progreso de tareas</span><strong>{progress}%</strong></div>
                    <div className="progress project-progress"><div className="progress-bar" style={{ width: `${progress}%` }} /></div>
                    <div className="project-footer"><span>{done} de {tasks.length} tareas</span><div className="project-actions">
                      <button title="Editar proyecto" onClick={() => openEditProject(project)}>✎</button>
                      <button title="Agregar tarea" onClick={() => setTaskProject(project.id)}>＋</button>
                      <button title="Eliminar proyecto" className="danger-action" onClick={() => void deleteProject(project)}>⌫</button>
                    </div></div>
                    {tasks.length > 0 && <div className="task-list">
                      <div className="task-list-heading">TAREAS DEL PROYECTO</div>
                      {tasks.map(task => <div className="task-row" key={task.id}>
                        <div className="task-main"><span className={`task-check ${task.status === 'DONE' ? 'checked' : ''}`}>{task.status === 'DONE' ? '✓' : ''}</span><div><div className={`task-title ${task.status === 'DONE' ? 'task-done' : ''}`}>{task.title}</div><small>{dateLabel(task.due_date)}</small></div></div>
                        <div className="task-controls"><select aria-label="Estado de tarea" value={task.status} onChange={e => void updateTask(task, { status: e.target.value as Task['status'] })}>{taskStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select><span className={`priority priority-${task.priority.toLowerCase()}`}>{labelFor(priorities, task.priority)}</span><button className="task-delete" title="Eliminar tarea" onClick={() => void deleteTask(task)}>×</button></div>
                      </div>)}
                    </div>}
                  </article>
                })}
              </div>}
          </section>
          <footer className="app-footer">GestiónPro · Gestión de proyectos y tareas <span>Conectado a Django REST Framework</span></footer>
        </div>
      </main>

      {showProjectForm && <div className="modal-backdrop-custom" onMouseDown={e => { if (e.target === e.currentTarget) setShowProjectForm(false) }}>
        <section className="app-modal"><div className="modal-heading"><div><h2>{editingProject ? 'Editar proyecto' : 'Nuevo proyecto'}</h2><p>Completa la información del proyecto.</p></div><button onClick={() => setShowProjectForm(false)}>×</button></div>
          <form onSubmit={saveProject}>
            <label className="form-label">Nombre del proyecto *</label><input className="form-control mb-3" required maxLength={150} value={projectForm.name} onChange={e => setProjectForm({ ...projectForm, name: e.target.value })} />
            <label className="form-label">Descripción</label><textarea className="form-control mb-3" rows={3} value={projectForm.description} onChange={e => setProjectForm({ ...projectForm, description: e.target.value })} />
            <label className="form-label">Estado</label><select className="form-select mb-3" value={projectForm.status} onChange={e => setProjectForm({ ...projectForm, status: e.target.value })}>{projectStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
            <div className="row"><div className="col"><label className="form-label">Fecha de inicio</label><input className="form-control mb-3" type="date" value={projectForm.start_date} onChange={e => setProjectForm({ ...projectForm, start_date: e.target.value })} /></div><div className="col"><label className="form-label">Fecha límite</label><input className="form-control mb-3" type="date" min={projectForm.start_date || undefined} value={projectForm.due_date} onChange={e => setProjectForm({ ...projectForm, due_date: e.target.value })} /></div></div>
            <div className="modal-actions"><button type="button" className="btn btn-light" onClick={() => setShowProjectForm(false)}>Cancelar</button><button className="btn btn-primary">{editingProject ? 'Guardar cambios' : 'Crear proyecto'}</button></div>
          </form>
        </section>
      </div>}

      {taskProject && <div className="modal-backdrop-custom" onMouseDown={e => { if (e.target === e.currentTarget) setTaskProject(null) }}>
        <section className="app-modal"><div className="modal-heading"><div><h2>Nueva tarea</h2><p>Agrega una tarea al proyecto seleccionado.</p></div><button onClick={() => setTaskProject(null)}>×</button></div>
          <form onSubmit={saveTask}>
            <label className="form-label">Título de la tarea *</label><input className="form-control mb-3" required maxLength={200} value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} />
            <label className="form-label">Descripción</label><textarea className="form-control mb-3" rows={3} value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} />
            <label className="form-label">Prioridad</label><select className="form-select mb-3" value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}>{priorities.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select>
            <label className="form-label">Fecha límite</label><input className="form-control mb-3" type="date" value={taskForm.due_date} onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })} />
            <div className="modal-actions"><button type="button" className="btn btn-light" onClick={() => setTaskProject(null)}>Cancelar</button><button className="btn btn-primary">Crear tarea</button></div>
          </form>
        </section>
      </div>}
    </div>
  )
}

export default App
