import React, { useState, useEffect, useMemo } from 'react'
import { listBrewHistory, listRecipes, toggleFavorite } from '../api'

const TABS = [
  { key: 'history', label: 'История', icon: '📜' },
  { key: 'library', label: 'Библиотека', icon: '📚' },
]

function formatTime(seconds) {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusLabel(status) {
  if (status === 'within_spec') return { text: '✅ В рамках техкарты', color: 'text-emerald-400' }
  return { text: '⚠️ Выход за лимиты', color: 'text-amber-400' }
}

export default function Archive({ spotId, onSelectRecipe, onNewRecipe, userRole }) {
  const [activeTab, setActiveTab] = useState('history')
  const [history, setHistory] = useState([])
  const [recipes, setRecipes] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [favoriteFilter, setFavoriteFilter] = useState('all') // 'all' | 'favorites'
  const [loading, setLoading] = useState({ history: true, library: true })
  const [error, setError] = useState(null)

  useEffect(() => {
    loadHistory()
  }, [])

  useEffect(() => {
    loadRecipes()
  }, [spotId])

  const loadHistory = async () => {
    setLoading((prev) => ({ ...prev, history: true }))
    setError(null)
    try {
      const data = await listBrewHistory()
      setHistory(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading((prev) => ({ ...prev, history: false }))
    }
  }

  const loadRecipes = async () => {
    setLoading((prev) => ({ ...prev, library: true }))
    setError(null)
    try {
      const data = await listRecipes(spotId)
      setRecipes(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading((prev) => ({ ...prev, library: false }))
    }
  }

  const handleToggleFavorite = async (recipeId) => {
    try {
      const updated = await toggleFavorite(recipeId)
      setRecipes((prev) =>
        prev.map((r) => (r.id === recipeId ? { ...r, isFavorite: updated.isFavorite } : r))
      )
    } catch (e) {
      console.error('Failed to toggle favorite:', e)
    }
  }

  // ── Фильтрация рецептов ──
  const filteredRecipes = useMemo(() => {
    let result = recipes

    // Фильтр по поиску
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((r) => {
        const name = (r.name || '').toLowerCase()
        const bean = (r.beanVariety || '').toLowerCase()
        const method = (r.dripperType || '').toLowerCase()
        const roaster = (r.roaster || '').toLowerCase()
        return name.includes(q) || bean.includes(q) || method.includes(q) || roaster.includes(q)
      })
    }

    // Фильтр "Только избранные"
    if (favoriteFilter === 'favorites') {
      result = result.filter((r) => r.isFavorite)
    }

    // Без дополнительной сортировки — рецепты в порядке от API (по дате создания)
    return result
  }, [recipes, searchQuery, favoriteFilter])

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Tabs */}
      <div className="flex max-w-md mx-auto bg-tech-surface rounded-2xl border border-tech-border p-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-tech-accent text-black shadow-md'
                  : 'text-tech-secondary hover:text-tech-primary'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── Вкладка: История ── */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-heading font-semibold text-tech-primary">История заваров</h2>
            <button
              onClick={loadHistory}
              className="text-xs text-tech-secondary hover:text-tech-accent transition px-3 py-1 rounded-lg bg-tech-surface border border-tech-border"
            >
              🔄 Обновить
            </button>
          </div>

          {loading.history ? (
            <div className="text-center py-8 text-tech-secondary">Загрузка истории...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-400">Ошибка: {error}</div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-tech-secondary">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-sm">История заваров пуста</p>
              <p className="text-xs mt-1 opacity-60">Завершите заваривание, чтобы оно появилось здесь</p>
            </div>
          ) : (
            <div className="bento-grid">
              {history.map((h) => {
                const st = statusLabel(h.status)
                return (
                  <div
                    key={h.id}
                    className="card p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-tech-primary font-medium text-sm truncate">
                          {h.coffee_beans}
                        </div>
                        <div className="text-tech-secondary text-xs mt-0.5">
                          {h.brew_method}
                        </div>
                      </div>
                      <span className={`text-[10px] font-medium whitespace-nowrap ${st.color}`}>
                        {st.text}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-black/40 rounded-lg py-1.5">
                        <div className="text-tech-primary text-sm font-mono">{h.weight_in}г</div>
                        <div className="text-[10px] text-tech-secondary">Закладка</div>
                      </div>
                      <div className="bg-black/40 rounded-lg py-1.5">
                        <div className="text-tech-primary text-sm font-mono">{h.weight_out}г</div>
                        <div className="text-[10px] text-tech-secondary">Выход</div>
                      </div>
                      <div className="bg-black/40 rounded-lg py-1.5">
                        <div className="text-tech-primary text-sm font-mono">{formatTime(h.brew_time)}</div>
                        <div className="text-[10px] text-tech-secondary">Время</div>
                      </div>
                    </div>

                    {(h.temperature || h.extraction) && (
                      <div className="flex gap-3 text-xs text-tech-secondary">
                        {h.temperature && <span>🌡️ {h.temperature}°C</span>}
                        {h.extraction && <span className="text-tech-accent">Ext: {h.extraction}%</span>}
                        {h.tds && <span>TDS: {h.tds}%</span>}
                      </div>
                    )}

                    <div className="text-[10px] text-tech-secondary/60 text-right">
                      {formatDate(h.created_at)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Вкладка: Библиотека ── */}
      {activeTab === 'library' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-heading font-semibold text-tech-primary">Библиотека рецептов</h2>
            {userRole !== 'barista' && (
              <button
                onClick={onNewRecipe}
                className="px-4 py-2 rounded-xl bg-tech-accent text-black font-bold text-sm hover:brightness-110 transition"
              >
                + Новый
              </button>
            )}
          </div>

          {/* Поиск */}
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 Найти рецепт (по названию, сорту кофе или способу)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-tech-secondary hover:text-tech-primary text-sm"
              >
                ✕
              </button>
            )}
          </div>

          {/* Фильтр: Все / Избранное */}
          <div className="flex gap-1.5 bg-tech-surface rounded-xl border border-tech-border p-1">
            <button
              onClick={() => setFavoriteFilter('all')}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                favoriteFilter === 'all'
                  ? 'bg-tech-accent text-black shadow-md'
                  : 'text-tech-secondary hover:text-tech-primary'
              }`}
            >
              Все рецепты
            </button>
            <button
              onClick={() => setFavoriteFilter('favorites')}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                favoriteFilter === 'favorites'
                  ? 'bg-tech-accent text-black shadow-md'
                  : 'text-tech-secondary hover:text-tech-primary'
              }`}
            >
              ★ Избранное
            </button>
          </div>

          {loading.library ? (
            <div className="text-center py-8 text-tech-secondary">Загрузка рецептов...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-400">Ошибка: {error}</div>
          ) : filteredRecipes.length === 0 ? (
            <div className="text-center py-12 text-tech-secondary">
              <div className="text-4xl mb-3">
                {favoriteFilter === 'favorites' ? '⭐' : '📖'}
              </div>
              {favoriteFilter === 'favorites' ? (
                <>
                  <p className="text-sm">Список избранного пуст</p>
                  <p className="text-xs mt-1 opacity-60">
                    Нажмите звездочку на карточке рецепта, чтобы закрепить его здесь
                  </p>
                </>
              ) : searchQuery ? (
                <p className="text-sm">Ничего не найдено по запросу «{searchQuery}»</p>
              ) : (
                <>
                  <p className="text-sm">Библиотека рецептов пуста</p>
                  {userRole !== 'barista' && (
                    <button
                      onClick={onNewRecipe}
                      className="mt-4 px-6 py-2 rounded-xl bg-tech-accent text-black font-bold hover:brightness-110 transition"
                    >
                      Создать первый рецепт
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="bento-grid">
              {filteredRecipes.map((r) => (
                <div
                  key={r.id}
                  className="card p-4 hover:border-tech-accent transition-all duration-200 hover:shadow-[0_0_16px_rgba(222,255,154,0.08)] relative"
                >
                  <button
                    onClick={() => handleToggleFavorite(r.id)}
                    className="absolute top-2 right-2 text-lg leading-none transition-transform hover:scale-110 z-10"
                    title={r.isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
                  >
                    {r.isFavorite ? (
                      <span className="text-[#DEFF9A]" style={{ textShadow: '0 0 6px rgba(222,255,154,0.5)' }}>★</span>
                    ) : (
                      <span className="text-tech-secondary/50 hover:text-tech-secondary">☆</span>
                    )}
                  </button>

                  <button
                    onClick={() => onSelectRecipe && onSelectRecipe(r)}
                    className="w-full text-left"
                  >
                    <div className="flex justify-between items-start pr-5">
                      <div className="flex-1 min-w-0">
                        <div className="text-tech-primary font-medium truncate">
                          {r.name ? r.name : (r.roaster ? `${r.roaster} — ` : '') + r.beanVariety}
                        </div>
                        <div className="text-tech-secondary text-xs mt-1">
                          {r.dripperType} · {r.dose}г · {r.totalWater}мл
                        </div>
                        {r.lastMeasurement && (
                          <div className="text-tech-accent text-xs mt-1">
                            Экстракция: {r.lastMeasurement.extraction}% · TDS: {r.lastMeasurement.tds}%
                          </div>
                        )}
                      </div>
                      <div className="text-tech-secondary text-xs ml-2 whitespace-nowrap">
                        {formatDate(r.createdAt)}
                      </div>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}