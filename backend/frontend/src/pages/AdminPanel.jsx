import React, { useState, useEffect } from 'react'
import { listUserSpots, createSpot, generateInvite, getUserCompany, createCompany } from '../api'

export default function AdminPanel() {
  const [company, setCompany] = useState(null)
  const [companyLoading, setCompanyLoading] = useState(true)
  const [companyError, setCompanyError] = useState(null)

  // Create company form
  const [companyName, setCompanyName] = useState('')
  const [creatingCompany, setCreatingCompany] = useState(false)
  const [companyCreateError, setCompanyCreateError] = useState(null)

  // Spots
  const [spots, setSpots] = useState([])
  const [spotsLoading, setSpotsLoading] = useState(true)
  const [spotsError, setSpotsError] = useState(null)

  // Create spot form
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [waterPpm, setWaterPpm] = useState(70)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)

  // Invite state per spot
  const [invitingSpotId, setInvitingSpotId] = useState(null)
  const [inviteLinks, setInviteLinks] = useState({})
  const [copiedId, setCopiedId] = useState(null)

  // ── Загрузка компании при монтировании ──
  useEffect(() => {
    const loadCompany = async () => {
      setCompanyLoading(true)
      setCompanyError(null)
      try {
        const data = await getUserCompany()
        setCompany(data) // null или { id, name, ownerId }
      } catch (e) {
        setCompanyError(e.message)
      } finally {
        setCompanyLoading(false)
      }
    }
    loadCompany()
  }, [])

  // ── Загрузка точек (только если компания есть) ──
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

  // ── Создание компании ──
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

  // ── Создание точки ──
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

  // ── Генерация инвайта ──
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
    }).catch(() => {
      // Fallback: select text manually
    })
  }

  // ── Состояние загрузки компании ──
  if (companyLoading) {
    return <div className="text-center py-8 text-coffee-latte">Загрузка...</div>
  }

  // ── Ошибка загрузки компании ──
  if (companyError) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="text-red-400">Ошибка: {companyError}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg bg-coffee-brown text-coffee-cream hover:bg-coffee-gold hover:text-coffee-dark transition"
        >
          Повторить
        </button>
      </div>
    )
  }

  // ── Компания ещё не создана — форма регистрации заведения ──
  if (!company) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-coffee-cream">🏢 Регистрация заведения</h2>

        <div className="bg-coffee-dark rounded-lg p-5 space-y-4">
          <p className="text-coffee-latte text-sm">
            Чтобы начать управлять точками, создайте вашу сеть кофеен.
          </p>

          <form onSubmit={handleCreateCompany} className="space-y-3">
            <input
              type="text"
              placeholder="Название вашей сети кофеен"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-coffee-800/60 border border-coffee-700/50 text-coffee-cream placeholder-coffee-500 focus:outline-none focus:border-coffee-500 text-sm"
              required
            />

            {companyCreateError && (
              <div className="text-red-400 text-sm">{companyCreateError}</div>
            )}

            <button
              type="submit"
              disabled={creatingCompany || !companyName.trim()}
              className="w-full py-2.5 rounded-lg bg-coffee-gold text-coffee-dark font-bold hover:bg-yellow-500 transition disabled:opacity-50 text-sm"
            >
              {creatingCompany ? 'Создание...' : '🏢 Создать компанию'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Компания есть — показываем управление точками ──
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-coffee-cream">⚙️ Управление точками</h2>
        <span className="text-coffee-latte text-xs bg-coffee-800/60 px-2.5 py-1 rounded-full">
          {company.name}
        </span>
      </div>

      {/* ── Форма создания новой точки ── */}
      <div className="bg-coffee-dark rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-semibold text-coffee-cream">Новая точка</h3>
        <form onSubmit={handleCreateSpot} className="space-y-3">
          <input
            type="text"
            placeholder="Название точки *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-coffee-800/60 border border-coffee-700/50 text-coffee-cream placeholder-coffee-500 focus:outline-none focus:border-coffee-500 text-sm"
            required
          />
          <input
            type="text"
            placeholder="Адрес"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-coffee-800/60 border border-coffee-700/50 text-coffee-cream placeholder-coffee-500 focus:outline-none focus:border-coffee-500 text-sm"
          />
          <div>
            <label className="text-coffee-latte text-xs block mb-1">TDS воды (ppm)</label>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*"
              value={waterPpm}
              onChange={(e) => setWaterPpm(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2 rounded-lg bg-coffee-800/60 border border-coffee-700/50 text-coffee-cream focus:outline-none focus:border-coffee-500 text-sm"
            />
          </div>
          {createError && (
            <div className="text-red-400 text-sm">{createError}</div>
          )}
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="w-full py-2.5 rounded-lg bg-coffee-gold text-coffee-dark font-bold hover:bg-yellow-500 transition disabled:opacity-50 text-sm"
          >
            {creating ? 'Создание...' : '➕ Создать спот'}
          </button>
        </form>
      </div>

      {/* ── Список точек ── */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-coffee-cream">
          Точки ({spots.length})
        </h3>

        {spotsLoading ? (
          <div className="text-center py-8 text-coffee-latte">Загрузка точек...</div>
        ) : spotsError ? (
          <div className="text-center py-8 space-y-4">
            <div className="text-red-400">Ошибка: {spotsError}</div>
            <button
              onClick={loadSpots}
              className="px-4 py-2 rounded-lg bg-coffee-brown text-coffee-cream hover:bg-coffee-gold hover:text-coffee-dark transition"
            >
              Повторить
            </button>
          </div>
        ) : spots.length === 0 ? (
          <div className="text-center py-8 text-coffee-latte">
            <p>У вас пока нет созданных точек.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {spots.map((spot) => (
              <div
                key={spot.id}
                className="bg-coffee-dark rounded-lg p-4 border border-coffee-brown space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-coffee-cream font-medium">{spot.name}</div>
                    {spot.address && (
                      <div className="text-coffee-latte text-xs mt-0.5">{spot.address}</div>
                    )}
                  </div>
                  <div className="text-coffee-latte text-xs text-right">
                    <div>{spot.waterPpm} ppm</div>
                    {spot.grinderModel && <div>{spot.grinderModel}</div>}
                  </div>
                </div>

                {/* Инвайт-ссылка */}
                <div className="space-y-2">
                  {!inviteLinks[spot.id] ? (
                    <button
                      onClick={() => handleGenerateInvite(spot.id)}
                      disabled={invitingSpotId === spot.id}
                      className="w-full py-2 rounded-lg border border-coffee-700/50 text-coffee-latte hover:bg-coffee-800/60 transition text-sm disabled:opacity-50"
                    >
                      {invitingSpotId === spot.id
                        ? 'Генерация...'
                        : '🔗 Сгенерировать инвайт для бариста'}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="bg-coffee-800/40 rounded-lg p-2.5 text-xs text-coffee-latte break-all select-all">
                        {inviteLinks[spot.id]}
                      </div>
                      <button
                        onClick={() => handleCopyLink(spot.id, inviteLinks[spot.id])}
                        className="w-full py-2 rounded-lg bg-coffee-gold text-coffee-dark font-bold hover:bg-yellow-500 transition text-sm"
                      >
                        {copiedId === spot.id ? '✓ Скопировано!' : '📋 Скопировать ссылку'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Сотрудники на точке */}
                {spot.staff && (
                  <div className="border-t border-coffee-800/60 pt-3 space-y-2">
                    <div className="text-coffee-latte text-xs font-medium">👥 Сотрудники на точке</div>
                    {spot.staff.length === 0 ? (
                      <div className="text-coffee-500 text-xs">
                        Сотрудников пока нет, сгенерируйте инвайт-ссылку выше
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {spot.staff.map((staff) => (
                          <span
                            key={staff.telegramId}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-coffee-800/60 text-coffee-latte text-xs"
                          >
                            <span>👤</span>
                            <span>{staff.name || staff.username || staff.telegramId}</span>
                            {staff.username && (
                              <span className="text-coffee-500">@{staff.username}</span>
                            )}
                            <span className="text-coffee-500">—</span>
                            <span className={staff.role === 'manager' ? 'text-coffee-gold' : ''}>
                              {staff.role === 'manager' ? 'Менеджер' : 'Бариста'}
                            </span>
                          </span>
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