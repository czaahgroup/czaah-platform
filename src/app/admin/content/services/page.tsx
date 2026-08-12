'use client'
// @ts-nocheck

import { useEffect, useState, useCallback } from 'react'


interface Service {
  id: string
  name: string
  slug: string
  description: string | null
  icon_url: string | null
  image_url: string | null
  display_order: number
  is_active: boolean
  created_at: string
}

const empty: Omit<Service, 'id' | 'created_at'> = {
  name: '',
  slug: '',
  description: '',
  icon_url: '',
  image_url: '',
  display_order: 0,
  is_active: true,
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(empty)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [autoSlug, setAutoSlug] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/services')
      if (!res.ok) throw new Error('Failed to load services')
      const data = await res.json()
      setServices(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openAdd() {
    setEditId(null)
    setForm({ ...empty, display_order: services.length })
    setAutoSlug(true)
    setShowForm(true)
    setError(null)
  }

  function openEdit(service: Service) {
    setEditId(service.id)
    setForm({
      name: service.name,
      slug: service.slug,
      description: service.description || '',
      icon_url: service.icon_url || '',
      image_url: service.image_url || '',
      display_order: service.display_order,
      is_active: service.is_active,
    })
    setAutoSlug(false)
    setShowForm(true)
    setError(null)
  }

  function closeForm() {
    setShowForm(false)
    setEditId(null)
    setError(null)
  }

  function handleNameChange(name: string) {
    setForm((f) => ({
      ...f,
      name,
      slug: autoSlug ? slugify(name) : f.slug,
    }))
  }

  async function handleSave() {
    if (!form.name.trim() || !form.slug.trim()) {
      setError('Name and slug are required')
      return
    }
    setSaving(true)
    setError(null)

    try {
      const url = editId ? `/api/admin/services/${editId}` : '/api/admin/services'
      const method = editId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Save failed')
      }

      closeForm()
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(service: Service) {
    try {
      const res = await fetch(`/api/admin/services/${service.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !service.is_active }),
      })
      if (!res.ok) throw new Error('Toggle failed')
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Toggle failed')
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/services/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Delete failed')
      }
      setDeleteConfirm(null)
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed')
      setDeleteConfirm(null)
    }
  }

  async function handleReorder(id: string, direction: 'up' | 'down') {
    const idx = services.findIndex((s) => s.id === id)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= services.length) return

    const current = services[idx]
    const swap = services[swapIdx]

    try {
      await Promise.all([
        fetch(`/api/admin/services/${current.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ display_order: swap.display_order }),
        }),
        fetch(`/api/admin/services/${swap.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ display_order: current.display_order }),
        }),
      ])
      await load()
    } catch {
      setError('Reorder failed')
    }
  }

  if (loading) {
    return <div className="text-on-surface-variant py-12 text-center">Loading services...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface">Services</h1>
        <button
          onClick={openAdd}
          className="bg-primary text-on-primary font-semibold px-5 py-2 rounded-nonetext-sm hover:bg-primary/90 transition-colors"
        >
          + Add Service
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-none px-4 py-3 mb-6">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-surface-container-low border border-outline-variant/10 rounded-none w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center justify-between">
              <h2 className="font-[family-name:var(--font-heading)] text-lg text-on-surface">
                {editId ? 'Edit Service' : 'Add Service'}
              </h2>
              <button onClick={closeForm} className="text-on-surface-variant hover:text-on-surface text-xl leading-none">&times;</button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-nonepx-3 py-2">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm text-on-surface-variant mb-1.5">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-nonepx-4 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 text-sm"
                  placeholder="e.g. Wealth Management"
                />
              </div>

              <div>
                <label className="block text-sm text-on-surface-variant mb-1.5">Slug *</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => { setAutoSlug(false); setForm((f) => ({ ...f, slug: e.target.value })) }}
                  className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-nonepx-4 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 text-sm"
                  placeholder="wealth-management"
                />
              </div>

              <div>
                <label className="block text-sm text-on-surface-variant mb-1.5">Description</label>
                <textarea
                  value={form.description || ''}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-nonepx-4 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 text-sm resize-none h-20"
                  placeholder="Brief description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-on-surface-variant mb-1.5">Icon URL</label>
                  <input
                    type="text"
                    value={form.icon_url || ''}
                    onChange={(e) => setForm((f) => ({ ...f, icon_url: e.target.value }))}
                    className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-nonepx-4 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 text-sm"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-on-surface-variant mb-1.5">Image URL</label>
                  <input
                    type="text"
                    value={form.image_url || ''}
                    onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                    className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-nonepx-4 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 text-sm"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-on-surface-variant mb-1.5">Display Order</label>
                  <input
                    type="number"
                    value={form.display_order}
                    onChange={(e) => setForm((f) => ({ ...f, display_order: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-nonepx-4 py-2.5 text-on-surface text-sm"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                      className="w-4 h-4 rounded-noneborder-outline-variant/10 accent-primary"
                    />
                    <span className="text-sm text-on-surface-variant">Active</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-outline-variant/10 flex gap-3 justify-end">
              <button
                onClick={closeForm}
                className="px-4 py-2 rounded-nonetext-sm text-on-surface-variant hover:text-on-surface border border-outline-variant/10 hover:border-primary/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-primary text-on-primary font-semibold px-5 py-2 rounded-nonetext-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : editId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-surface-container-low border border-outline-variant/10 rounded-none w-full max-w-sm mx-4 p-6">
            <h3 className="font-[family-name:var(--font-heading)] text-lg text-on-surface mb-2">Confirm Delete</h3>
            <p className="text-sm text-on-surface-variant mb-6">
              Are you sure you want to delete this service? Products linked to it will have their service reference removed.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-nonetext-sm text-on-surface-variant hover:text-on-surface border border-outline-variant/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="bg-error text-white font-semibold px-5 py-2 rounded-nonetext-sm hover:bg-error/80 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {services.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant/10 rounded-none px-6 py-16 text-center">
          <p className="text-on-surface-variant">No services yet. Add your first service to get started.</p>
        </div>
      ) : (
        <div className="bg-surface-container-low border border-outline-variant/10 rounded-none overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/10">
                  <th className="text-left px-5 py-3 text-on-surface-variant font-medium text-xs uppercase tracking-wider">Order</th>
                  <th className="text-left px-5 py-3 text-on-surface-variant font-medium text-xs uppercase tracking-wider">Name</th>
                  <th className="text-left px-5 py-3 text-on-surface-variant font-medium text-xs uppercase tracking-wider">Slug</th>
                  <th className="text-left px-5 py-3 text-on-surface-variant font-medium text-xs uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3 text-on-surface-variant font-medium text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service, idx) => (
                  <tr key={service.id} className="border-b border-outline-variant/10/50 hover:bg-surface-container-lowest/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleReorder(service.id, 'up')}
                          disabled={idx === 0}
                          className="text-on-surface-variant hover:text-on-surface disabled:opacity-20 transition-colors p-0.5"
                          title="Move up"
                        >
                          &#9650;
                        </button>
                        <button
                          onClick={() => handleReorder(service.id, 'down')}
                          disabled={idx === services.length - 1}
                          className="text-on-surface-variant hover:text-on-surface disabled:opacity-20 transition-colors p-0.5"
                          title="Move down"
                        >
                          &#9660;
                        </button>
                        <span className="text-on-surface-variant/50 ml-1">{service.display_order}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-on-surface font-medium">{service.name}</td>
                    <td className="px-5 py-3 text-on-surface-variant/50 font-mono text-xs">{service.slug}</td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => handleToggle(service)}
                        className={`text-xs px-2.5 py-1 rounded-nonetransition-colors ${
                          service.is_active
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            : 'bg-neutral-500/20 text-neutral-400 hover:bg-neutral-500/30'
                        }`}
                      >
                        {service.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(service)}
                          className="text-xs text-primary hover:text-primary/80 transition-colors px-2 py-1"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(service.id)}
                          className="text-xs text-error/70 hover:text-error transition-colors px-2 py-1"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
