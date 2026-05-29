import React, { useState, useEffect } from 'react'
import { listUserSpots, createSpot, generateInvite, getUserCompany, createCompany, changeUserRole } from '../api'

export default function AdminPanel() {
  const [company, setCompany] = useState(null)
  const [companyLoading, setCompanyLoading] = useState(true)
  const [companyError, setCompanyError] = useState(null)

  const [companyName, setCompanyName] = useState('')
  const [creatingCompany, setCreatingCompany] = useState(false)
  const [companyCreateError, setCompanyCreateError] = useState(null)

  const [spots, setSpots] = useState([])
  const [spotsLoading, setSpotsLoading] = useState(true)
  const [spotsError, setSpotsError] = useState(null)

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [waterPpm, setWaterPpm] = useState(70)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)

  const [invitingSpotId, setInvitingSpotId] = useState(null)
  const [inviteLinks, setInviteLinks] = useState({})
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => {
    const loadCompany = async () => {
      setCompanyLoading(true)
      setCompanyError(null)
      try {
        const data = await getUserCompany()
        setCompany(data)
      } catch (e) {
        setCompanyError(e.message)
      } finally {
        setCompanyLoading(false)
      }
    }
    loadCompany()
  }, [])

  useEffect(() => {
    if (!company) return
    loadSpots()
  }, [company])

  const loadSpots = async () => {
    setSpotsLoading(true)
    setSpotsError(null)
    try {
      const data = await listUserSpots()
      setSpots(data)
    } catch (e) {
      setSpotsError(e.message)
    } finally {
      setSpotsLoading(false)
    }
  }

  const handleCreateCompany = async (e) => {
    e.preventDefault()
    if (!companyName.trim()) return

    setCreatingCompany(true)
    setCompanyCreateError(null)
    try {
      const result = await createCompany(companyName.trim())
      setCompany({ id: result.id, name: result.name, ownerId: result.ownerId })
      setCompanyName('')
    } catch (e) {
      setCompanyCreateError(e.message)
    } finally {
      setCreatingCompany(false)
    }
  }

  const handleCreateSpot = async (e) => {
    e.preventDefault()
    if (!name.trim()) return

    setCreating(true)
    setCreateError(null)
    try {
      await createSpot({
        name: name.trim(),
        address: address.trim() || undefined,
        waterPpm: waterPpm,
      })
      setName('')
      setAddress('')
      setWaterPpm(70)
      await loadSpots()
    } catch (e) {
      setCreateError(e.message)
    } finally {
      setCreating(false)
    }
  }

  const handleGenerateInvite = async (spotId) => {
    setInvitingSpotId(spotId)
    try {
      const result = await generateInvite(spotId)
      setInviteLinks((prev) => ({
        ...prev,
        [spotId]: result.inviteLink,
      }))
    } catch (e) {
      setInviteLinks((prev) => ({
        ...prev,
        [spotId]: `Ошибка: ${e.message}`,
      }))
    } finally {
      setInvitingSpotId(null)
    }
  }

  const handleCopyLink = (spotId, link) => {
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(spotId)
      setTimeout(() => setCopiedId(null), 2000)
    }).catch(() => {})
  }

  if (companyLoading) {
    return <div className="text-center py-8 text-tech-secondary">Загрузка...</div>
  }

  if (companyError) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="text-red-400">Ошибка: {companyError}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-xl bg-tech-surface border border-tech-border text-tech-primary hover:brightness-125 transition"
        >
          Повторить
        </button>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-heading font-semibold text-tech-primary">🏢 Регистрация заведения</h2>

        <div className="card p-5 space-y-4">
          <p className="text-tech-secondary text-sm">
            Чтобы начать управлять точками, создайте вашу сеть кофеен.
          </p>

          <form onSubmit={handleCreateCompany} className="space-y-3">
            <input
              type="text"
              placeholder="Название вашей сети кофеен"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full"
              required
            />

            {companyCreateError && (
              <div className="text-red-400 text-sm">{companyCreateError}</div>
            )}

            <button
              type="submit"
              disabled={creatingCompany || !companyName.trim()}
              className="w-full py-2.5 rounded-xl bg-tech-accent text-black font-bold hover:brightness-110 transition disabled:opacity-50 text-sm"
            >
              {creatingCompany ? 'Создание...' : '🏢 Создать компанию'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading font-semibold text-tech-primary">⚙️ Управление точками</h2>
        <span className="text-tech-secondary text-xs bg-tech-surface border border-tech-border px-2.5 py-1 rounded-full">
          {company.name}
        </span>
      </div>

      <div className="card p-4 space-y-4">
        <h3 className="text-lg font-heading font-semibold text-tech-primary">Новая точка</h3>
        <form onSubmit={handleCreateSpot} className="space-y-3">
          <input
            type="text"
            placeholder="Название точки *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Адрес"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <div>
            <label className="text-tech-secondary text-xs block mb-1">TDS воды (ppm)</label>
            <input
              type="text"
              inputMode="decimal"
              pattern="\d*\.?\d*"
              value={waterPpm}
              onChange={(e) => setWaterPpm(parseInt(e.target.value, 10) || 0)}
            />
          </div>
          {createError && (
            <div className="text-red-400 text-sm">{createError}</div>
          )}
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="w-full py-2.5 rounded-xl bg-tech-accent text-black font-bold hover:brightness-110 transition disabled:opacity-50 text-sm"
          >
            {creating ? 'Создание...' : '➕ Создать спот'}
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-heading font-semibold text-tech-primary">
          Точки ({spots.length})
        </h3>

        {spotsLoading ? (
          <div className="text-center py-8 text-tech-secondary">Загрузка точек...</div>
        ) : spotsError ? (
          <div className="text-center py-8 space-y-4">
            <div className="text-red-400">Ошибка: {spotsError}</div>
            <button
              onClick={loadSpots}
              className="px-4 py-2 rounded-xl bg-tech-surface border border-tech-border text-tech-primary hover:brightness-125 transition"
            >
              Повторить
            </button>
          </div>
        ) : spots.length === 0 ? (
          <div className="text-center py-8 text-tech-secondary">
            <p>У вас пока нет созданных точек.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {spots.map((spot) => (
              <div
                key={spot.id}
                className="card p-4 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-tech-primary font-medium">{spot.name}</div>
                    {spot.address && (
                      <div className="text-tech-secondary text-xs mt-0.5">{spot.address}</div>
                    )}
                  </div>
                  <div className="text-tech-secondary text-xs text-right">
                    <div>{spot.waterPpm} ppm</div>
                    {spot.grinderModel && <div>{spot.grinderModel}</div>}
                  </div>
                </div>

                <div className="space-y-2">
                  {!inviteLinks[spot.id] ? (
                    <button
                      onClick={() => handleGenerateInvite(spot.id)}
                      disabled={invitingSpotId === spot.id}
                      className="w-full py-2 rounded-xl border border-tech-border text-tech-secondary hover:brightness-125 transition text-sm disabled:opacity-50"
                    >
                      {invitingSpotId === spot.id
                        ? 'Генерация...'
                        : '🔗 Сгенерировать инвайт для бариста'}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="bg-tech-surface rounded-lg p-2.5 text-xs text-tech-secondary break-all select-all">
                        {inviteLinks[spot.id]}
                      </div>
                      <button
                        onClick={() => handleCopyLink(spot.id, inviteLinks[spot.id])}
                        className="w-full py-2 rounded-xl bg-tech-accent text-black font-bold hover:brightness-110 transition text-sm"
                      >
                        {copiedId === spot.id ? '✓ Скопировано!' : '📋 Скопировать ссылку'}
                      </button>
                    </div>
                  )}
                </div>

                {spot.staff && (
                  <div className="border-t border-tech-border pt-3 space-y-2">
                    <div className="text-tech-secondary text-xs font-medium">👥 Сотрудники на точке</div>
                    {spot.staff.length === 0 ? (
                      <div className="text-tech-secondary/50 text-xs">
                        Сотрудников пока нет, сгенерируйте инвайт-ссылку выше
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {spot.staff.map((staff) => (
                          <StaffRow
                            key={staff.id || staff.telegramId}
                            staff={staff}
                            spotId={spot.id}
                            onRoleChanged={loadSpots}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StaffRow({ staff, spotId, onRoleChanged }) {
  const [changing, setChanging] = useState(false)
  const [changeError, setChangeError] = useState(null)

  const handleToggleRole = async () => {
    setChanging(true)
    setChangeError(null)
    try {
      const newRole = staff.role === 'manager' ? 'barista' : 'manager'
      await changeUserRole(staff.id, spotId, newRole)
      onRoleChanged()
    } catch (e) {
      setChangeError(e.message)
    } finally {
      setChanging(false)
    }
  }

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-tech-surface border border-tech-border">
      <div className="flex items-center gap-1.5 min-w-0">
        <span>👤</span>
        <span className="text-tech-secondary text-xs truncate">
          {staff.name || staff.username || staff.telegramId}
        </span>
        {staff.username && (
          <span className="text-tech-secondary/50 text-xs shrink-0">@{staff.username}</span>
        )}
        <span className={`text-xs font-medium shrink-0 ${staff.role === 'manager' ? 'text-tech-accent' : 'text-tech-secondary'}`}>
          {staff.role === 'manager' ? 'Менеджер' : 'Бариста'}
        </span>
      </div>
      <button
        onClick={handleToggleRole}
        disabled={changing}
        className={`shrink-0 text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
          staff.role === 'manager'
            ? 'bg-tech-surface text-tech-secondary hover:text-tech-primary border border-tech-border'
            : 'bg-tech-accent/20 text-tech-accent hover:bg-tech-accent/30 border border-tech-accent/30'
        } disabled:opacity-50`}
      >
        {changing
          ? '...'
          : staff.role === 'manager'
            ? 'Сделать бариста'
            : 'Назначить старшим'}
      </button>
      {changeError && (
        <div className="text-red-400 text-xs">{changeError}</div>
      )}
    </div>
  )
}