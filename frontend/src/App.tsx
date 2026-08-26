import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import './App.css'

type Project = { id: number; name: string; description?: string }
type Dependency = { id: number; name: string; version: string; riskScore?: number; riskLevel?: string }
type Vulnerability = { id: number; vulnerabilityId: string; summary?: string; severity?: string; cvssScore?: string }

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

const api = async <T,>(path: string, options?: RequestInit): Promise<T> => {
  if (!API_BASE_URL && import.meta.env.PROD) {
    throw new Error('Backend API is not configured. Set VITE_API_URL in Vercel and redeploy.')
  }
  const response = await fetch(`${API_BASE_URL}${path}`, options)
  if (!response.ok) throw new Error(`Request failed (${response.status})`)
  return response.json() as Promise<T>
}

function App() {
  const [project, setProject] = useState<Project | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [projectName, setProjectName] = useState('')
  const [description, setDescription] = useState('')
  const [dependencies, setDependencies] = useState<Dependency[]>([])
  const [vulnerabilities, setVulnerabilities] = useState<Record<number, Vulnerability[]>>({})
  const [busy, setBusy] = useState(false)
  const [scanningProject, setScanningProject] = useState(false)
  const [message, setMessage] = useState('Create a project to begin your first analysis.')

  const loadProject = async (selectedProject: Project) => {
    setBusy(true)
    try {
      const imported = await api<Dependency[]>(`/api/projects/${selectedProject.id}/dependencies`)
      const vulnerabilityEntries = await Promise.all(imported.map(async (dependency) => {
        const results = await api<Vulnerability[]>(`/api/projects/${selectedProject.id}/dependencies/${dependency.id}/vulnerabilities`)
        return [dependency.id, results] as const
      }))
      setProject(selectedProject)
      setProjectName(selectedProject.name)
      setDescription(selectedProject.description || '')
      setDependencies(imported)
      setVulnerabilities(Object.fromEntries(vulnerabilityEntries))
      localStorage.setItem('dependency-risk-selected-project', String(selectedProject.id))
      setMessage(`${selectedProject.name} loaded.`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not load project.') }
    finally { setBusy(false) }
  }

  useEffect(() => {
    api<Project[]>('/api/projects')
      .then((savedProjects) => {
        setProjects(savedProjects)
        const savedProjectId = Number(localStorage.getItem('dependency-risk-selected-project'))
        const savedProject = savedProjects.find((item) => item.id === savedProjectId)
        if (savedProject) void loadProject(savedProject)
      })
      .catch(() => setMessage('Create a project to begin your first analysis.'))
  }, [])

  const createProject = async () => {
    if (!projectName.trim()) return
    setBusy(true)
    try {
      const created = await api<Project>('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: projectName.trim(), description }) })
      setProject(created)
      setProjects((current) => [...current, created])
      localStorage.setItem('dependency-risk-selected-project', String(created.id))
      setDependencies([])
      setVulnerabilities({})
      setMessage('Project ready. Upload a package.json to map its dependency surface.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not create project.') }
    finally { setBusy(false) }
  }

  const uploadPackageJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !project) return
    setBusy(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const imported = await api<Dependency[]>(`/api/projects/${project.id}/dependencies/upload`, { method: 'POST', body: formData })
      setDependencies(imported)
      setVulnerabilities({})
      setMessage(`${imported.length} dependencies imported. Scan a package to check OSV.dev.`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not import package.json.') }
    finally { setBusy(false); event.target.value = '' }
  }

  const scanDependency = async (dependency: Dependency) => {
    setBusy(true)
    try {
      const result = await api<Vulnerability[]>(`/api/projects/${project?.id}/dependencies/${dependency.id}/scan`, { method: 'POST' })
      setVulnerabilities((current) => ({ ...current, [dependency.id]: result }))
      setMessage(`${dependency.name} scan complete.`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Scan failed.') }
    finally { setBusy(false) }
  }

  const scanAllDependencies = async () => {
    if (!project) return
    setBusy(true)
    setScanningProject(true)
    setMessage('Scanning every dependency against OSV.dev...')
    try {
      const scanned = await api<Dependency[]>(`/api/projects/${project.id}/dependencies/scan-all`, { method: 'POST' })
      setDependencies(scanned)
      const vulnerabilityEntries = await Promise.all(scanned.map(async (dependency) => {
        const results = await api<Vulnerability[]>(`/api/projects/${project.id}/dependencies/${dependency.id}/vulnerabilities`)
        return [dependency.id, results] as const
      }))
      setVulnerabilities(Object.fromEntries(vulnerabilityEntries))
      setMessage(`Project scan complete. ${scanned.length} dependencies assessed.`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Project scan failed.') }
    finally { setBusy(false); setScanningProject(false) }
  }

  const totalFindings = Object.values(vulnerabilities).reduce((total, items) => total + items.length, 0)
  const scannedCount = Object.keys(vulnerabilities).length
  const severityCounts = Object.values(vulnerabilities).flat().reduce((counts, vulnerability) => {
    const severity = vulnerability.severity?.toUpperCase() || 'UNKNOWN'
    if (severity.includes('CRITICAL')) counts.critical += 1
    else if (severity.includes('HIGH')) counts.high += 1
    else if (severity.includes('MEDIUM') || severity.includes('MODERATE')) counts.medium += 1
    else if (severity.includes('LOW')) counts.low += 1
    else counts.unknown += 1
    return counts
  }, { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 })
  const overallScore = dependencies.length
    ? Math.round(dependencies.reduce((total, dependency) => total + (dependency.riskScore || 0), 0) / dependencies.length)
    : 0
  const highestRisk = [...dependencies].sort((first, second) => (second.riskScore || 0) - (first.riskScore || 0))[0]
  const overallLevel = overallScore >= 50 ? 'HIGH' : overallScore > 0 ? 'MEDIUM' : 'LOW'

  return (
    <main className="app-shell">
      <header className="topbar"><div className="brand-mark">DR</div><div><strong>Dependency Risk</strong><span>Analyzer</span></div><div className="status"><i /> OSV intelligence online</div></header>
      <section className="intro"><p className="eyebrow">PROJECT SECURITY / 01</p><h1>Know what your<br /><em>dependencies</em> expose.</h1><p className="lede">Import a Node project, inspect its dependency surface, and surface known vulnerabilities before they become your incident.</p></section>
      {project && <section className="summary-dashboard"><div className="summary-title"><div><div className="panel-label">PROJECT OVERVIEW</div><h2>Security posture</h2></div><span className={`overall-level ${overallLevel.toLowerCase()}`}>{overallLevel} RISK</span></div><div className="summary-grid"><div className="summary-stat"><span>Overall score</span><strong>{overallScore}<small>/100</small></strong></div><div className="summary-stat"><span>Scanned</span><strong>{scannedCount}<small>/{dependencies.length}</small></strong></div><div className="summary-stat"><span>Findings</span><strong>{totalFindings}</strong></div><div className="severity-stat"><span>Severity mix</span><div><b className="critical">{severityCounts.critical}</b><b className="high">{severityCounts.high}</b><b className="medium">{severityCounts.medium}</b><b className="low">{severityCounts.low}</b></div><small>critical &nbsp; high &nbsp; medium &nbsp; low</small></div></div>{highestRisk && highestRisk.riskScore ? <p className="risk-callout">Highest exposure <strong>{highestRisk.name}</strong><span>{highestRisk.riskLevel} / {highestRisk.riskScore} points</span></p> : null}</section>}
      <section className="workspace">
        <aside className="setup-panel"><div className="panel-label">01 / PROJECT</div><h2>Start an analysis</h2>{projects.length > 0 && <label>Saved projects<select value={project?.id || ''} onChange={(event) => { const selected = projects.find((item) => item.id === Number(event.target.value)); if (selected) void loadProject(selected) }}><option value="">Choose a project</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}<label>Project name<input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="e.g. storefront-api" /></label><label>Description <span>(optional)</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What are you protecting?" rows={3} /></label><button className="primary-action" type="button" onClick={createProject} disabled={busy || !projectName.trim()}>{project ? 'Create another project' : 'Create project'} <b>-&gt;</b></button>{project && <label className="upload-box"><span className="upload-icon">+</span><strong>Upload package.json</strong><small>Drop your manifest here or browse</small><input type="file" accept="application/json,.json" onChange={uploadPackageJson} /></label>}<p className="message">{message}</p></aside>
        <section className="results-panel"><div className="panel-heading"><div><div className="panel-label">02 / INVENTORY</div><h2>{project?.name || 'Dependency inventory'}</h2></div><div className="metrics"><span><b>{dependencies.length}</b> packages</span><span><b>{totalFindings}</b> findings</span></div></div>{dependencies.length === 0 ? <div className="empty-state"><div className="empty-number">00</div><h3>Your inventory is waiting.</h3><p>Create a project and upload its manifest to see every package here.</p></div> : <><button className="project-scan" type="button" disabled={busy} onClick={scanAllDependencies}>{scanningProject ? 'Scanning project...' : 'Scan entire project'} <span>↗</span></button><div className="dependency-list">{dependencies.map((dependency) => <article className="dependency-row" key={dependency.id}><div className="package-icon">{dependency.name.slice(0, 1).toUpperCase()}</div><div className="dependency-main"><strong>{dependency.name}</strong><span>npm package / v{dependency.version}</span></div><div className="risk-badge">{dependency.riskLevel ? `${dependency.riskLevel} ${dependency.riskScore ?? 0}` : 'UNASSESSED'}</div><div className="finding-count">{vulnerabilities[dependency.id] ? <><b className={vulnerabilities[dependency.id].length ? 'danger' : 'clean'}>{vulnerabilities[dependency.id].length}</b> {vulnerabilities[dependency.id].length ? 'findings' : 'clear'}</> : <span className="not-scanned">Not scanned</span>}</div><button className="scan-button" type="button" disabled={busy} onClick={() => scanDependency(dependency)}>{vulnerabilities[dependency.id] ? 'Rescan' : 'Scan'} <span>↗</span></button>{vulnerabilities[dependency.id]?.length ? <div className="vulnerability-details">{vulnerabilities[dependency.id].map((item) => <div key={item.id}><b>{item.severity || 'ADVISORY'}</b><span>{item.vulnerabilityId}</span><p>{item.summary || 'No summary provided by OSV.dev.'}</p></div>)}</div> : null}</article>)}</div></>}</section>
      </section>
      <footer><span>DATA SOURCE / OSV.DEV</span><span>DEPENDENCY RISK ANALYZER <b>v0.1</b></span></footer>
    </main>
  )
}

export default App
