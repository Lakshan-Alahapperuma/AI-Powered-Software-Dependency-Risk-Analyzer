import { useState } from 'react'
import type { ChangeEvent } from 'react'
import './App.css'

type Project = { id: number; name: string; description?: string }
type Dependency = { id: number; name: string; version: string }
type Vulnerability = { id: number; vulnerabilityId: string; summary?: string; severity?: string; cvssScore?: string }

const api = async <T,>(path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(path, options)
  if (!response.ok) throw new Error(`Request failed (${response.status})`)
  return response.json() as Promise<T>
}

function App() {
  const [project, setProject] = useState<Project | null>(null)
  const [projectName, setProjectName] = useState('')
  const [description, setDescription] = useState('')
  const [dependencies, setDependencies] = useState<Dependency[]>([])
  const [vulnerabilities, setVulnerabilities] = useState<Record<number, Vulnerability[]>>({})
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('Create a project to begin your first analysis.')

  const createProject = async () => {
    if (!projectName.trim()) return
    setBusy(true)
    try {
      const created = await api<Project>('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: projectName.trim(), description }) })
      setProject(created)
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

  const totalFindings = Object.values(vulnerabilities).reduce((total, items) => total + items.length, 0)

  return (
    <main className="app-shell">
      <header className="topbar"><div className="brand-mark">DR</div><div><strong>Dependency Risk</strong><span>Analyzer</span></div><div className="status"><i /> OSV intelligence online</div></header>
      <section className="intro"><p className="eyebrow">PROJECT SECURITY / 01</p><h1>Know what your<br /><em>dependencies</em> expose.</h1><p className="lede">Import a Node project, inspect its dependency surface, and surface known vulnerabilities before they become your incident.</p></section>
      <section className="workspace">
        <aside className="setup-panel"><div className="panel-label">01 / PROJECT</div><h2>Start an analysis</h2><label>Project name<input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="e.g. storefront-api" /></label><label>Description <span>(optional)</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What are you protecting?" rows={3} /></label><button className="primary-action" type="button" onClick={createProject} disabled={busy || !projectName.trim()}>{project ? 'Project created' : 'Create project'} <b>-&gt;</b></button>{project && <label className="upload-box"><span className="upload-icon">+</span><strong>Upload package.json</strong><small>Drop your manifest here or browse</small><input type="file" accept="application/json,.json" onChange={uploadPackageJson} /></label>}<p className="message">{message}</p></aside>
        <section className="results-panel"><div className="panel-heading"><div><div className="panel-label">02 / INVENTORY</div><h2>{project?.name || 'Dependency inventory'}</h2></div><div className="metrics"><span><b>{dependencies.length}</b> packages</span><span><b>{totalFindings}</b> findings</span></div></div>{dependencies.length === 0 ? <div className="empty-state"><div className="empty-number">00</div><h3>Your inventory is waiting.</h3><p>Create a project and upload its manifest to see every package here.</p></div> : <div className="dependency-list">{dependencies.map((dependency) => <article className="dependency-row" key={dependency.id}><div className="package-icon">{dependency.name.slice(0, 1).toUpperCase()}</div><div className="dependency-main"><strong>{dependency.name}</strong><span>npm package / v{dependency.version}</span></div><div className="finding-count">{vulnerabilities[dependency.id] ? <><b className={vulnerabilities[dependency.id].length ? 'danger' : 'clean'}>{vulnerabilities[dependency.id].length}</b> {vulnerabilities[dependency.id].length ? 'findings' : 'clear'}</> : <span className="not-scanned">Not scanned</span>}</div><button className="scan-button" type="button" disabled={busy} onClick={() => scanDependency(dependency)}>{vulnerabilities[dependency.id] ? 'Rescan' : 'Scan'} <span>↗</span></button>{vulnerabilities[dependency.id]?.length ? <div className="vulnerability-details">{vulnerabilities[dependency.id].map((item) => <div key={item.id}><b>{item.severity || 'ADVISORY'}</b><span>{item.vulnerabilityId}</span><p>{item.summary || 'No summary provided by OSV.dev.'}</p></div>)}</div> : null}</article>)}</div>}</section>
      </section>
      <footer><span>DATA SOURCE / OSV.DEV</span><span>DEPENDENCY RISK ANALYZER <b>v0.1</b></span></footer>
    </main>
  )
}

export default App
