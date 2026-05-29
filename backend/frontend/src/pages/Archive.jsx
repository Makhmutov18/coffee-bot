import React, { useState, useEffect, useMemo } from 'react'
import { listBrewHistory, listRecipes } from '../api'

const TABS = [
  { key: 'history', label: 'История', icon: '📜' },
  { key: 'library', label: 'Библиотека', icon: '📚' },
  { key: 'stats', label: 'Статистика', icon: '📊' },
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

  // ── Статистика ──
  const stats = useMemo(() => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const weekBrews = history.filter((h) => new Date(h.created_at) >= weekAgo)
    const totalWeek = weekBrews.length
    const withinSpec = weekBrews.filter((h) => h.status === 'within_spec').length
    const stability = totalWeek > 0 ? Math.round((withinSpec / totalWeek) * 100) : 0
    return { totalWeek, withinSpec, stability }
  }, [history])

  // ── Фильтрация рецептов ──
  const filteredRecipes = useMemo(() => {
    if (!searchQuery.trim()) return recipes
    const q = searchQuery.toLowerCase()
    return recipes.filter((r) => {
      const name = (r.name || '').toLowerCase()
      const bean = (r.beanVariety || '').toLowerCase()
      const method = (r.dripperType || '').toLowerCase()
      const roaster = (r.roaster || '').toLowerCase()
      return name.includes(q) || bean.includes(q) || method.includes(q) || roaster.includes(q)
    })
  }, [recipes, searchQuery])

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

          {loading.library ? (
            <div className="text-center py-8 text-tech-secondary">Загрузка рецептов...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-400">Ошибка: {error}</div>
          ) : filteredRecipes.length === 0 ? (
            <div className="text-center py-12 text-tech-secondary">
              <div className="text-4xl mb-3">📖</div>
              {searchQuery ? (
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
                <button
                  key={r.id}
                  onClick={() => onSelectRecipe && onSelectRecipe(r)}
                  className="w-full text-left card p-4 hover:border-tech-accent transition-all duration-200 hover:shadow-[0_0_16px_rgba(222,255,154,0.08)]"
                >
                  <div className="flex justify-between items-start">
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
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Вкладка: Статистика ── */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          <h2 className="text-lg font-heading font-semibold text-tech-primary">Статистика</h2>

          {history.length === 0 ? (
            <div className="text-center py-12 text-tech-secondary">
              <div className="text-4xl mb-3">📊</div>
              <p className="text-sm">Недостаточно данных для статистики</p>
              <p className="text-xs mt-1 opacity-60">Начните записывать завары, чтобы увидеть аналитику</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Карточки статистики */}
              <div className="grid grid-cols-2 gap-3">
                <div className="card p-4 text-center">
                  <div className="text-3xl font-light font-mono text-tech-primary">{stats.totalWeek}</div>
                  <div className="text-xs text-tech-secondary mt-1">Заваров за неделю</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-3xl font-light font-mono text-tech-accent">{stats.stability}%</div>
                  <div className="text-xs text-tech-secondary mt-1">Стабильность</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="card p-4 text-center">
                  <div className="text-3xl font-light font-mono text-emerald-400">{stats.withinSpec}</div>
                  <div className="text-xs text-tech-secondary mt-1">В рамках техкарты</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-3xl font-light font-mono text-amber-400">{history.length - stats.withinSpec}</div>
                  <div className="text-xs text-tech-secondary mt-1">Выход за лимиты</div>
                </div>
              </div>

              {/* Прогресс-бар стабильности */}
              <div className="card p-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-tech-secondary">Стабильность заваривания</span>
                  <span className="text-tech-accent font-mono">{stats.stability}%</span>
                </div>
                <div className="h-2.5 w-full bg-black rounded-full border border-tech-border overflow-hidden">
                  <div
                    className="h-full bg-tech-accent rounded-full transition-all duration-500"
                    style={{ width: `${stats.stability}%` }}
                  />
                </div>
                <div className="text-[10px] text-tech-secondary/60">
                  Всего записей в истории: {history.length}
                </div>
              </div>

              {/* Последние завары */}
              <div className="card p-4 space-y-2">
                <h3 className="text-xs font-heading font-semibold uppercase tracking-wider text-tech-secondary">
                  Последние завары
                </h3>
                {history.slice(0, 5).map((h) => {
                  const st = statusLabel(h.status)
                  return (
                    <div key={h.id} className="flex items-center justify-between py-1.5 border-b border-tech-border last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-tech-primary text-xs truncate">{h.coffee_beans}</div>
                        <div className="text-tech-secondary text-[10px]">{h.brew_method} · {formatDate(h.created_at)}</div>
                      </div>
                      <span className={`text-[10px] font-medium ml-2 ${st.color}`}>{st.text}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}