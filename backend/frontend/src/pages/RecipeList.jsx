import React, { useState, useEffect } from 'react'
import { listRecipes } from '../api'

const METHOD_FILTERS = [
  { key: null, label: 'Все' },
  { key: 'pourover', label: '🌪 Пуровер' },
  { key: 'batch', label: '🤖 Батч' },
  { key: 'espresso', label: '☕️ Эспрессо' },
]

export default function RecipeList({ onSelectRecipe, onNewRecipe, spotId, userRole }) {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [methodFilter, setMethodFilter] = useState(null)

  useEffect(() => {
    loadRecipes()
  }, [spotId])

  const loadRecipes = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listRecipes(spotId, methodFilter)
      setRecipes(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecipes()
  }, [methodFilter])

  const formatDate = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-tech-secondary">Загрузка рецептов...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="text-red-400">Ошибка: {error}</div>
        <button
          onClick={loadRecipes}
          className="px-4 py-2 rounded-xl bg-tech-surface border border-tech-border text-tech-primary hover:brightness-125 transition"
        >
          Повторить
        </button>
      </div>
    )
  }

  const isReadOnly = userRole === 'barista' && spotId

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-heading font-semibold text-tech-primary">Мои рецепты</h2>
        {!isReadOnly && (
          <button
            onClick={onNewRecipe}
            className="px-4 py-2 rounded-xl bg-tech-accent text-black font-bold text-sm hover:brightness-110 transition"
          >
            + Новый
          </button>
        )}
      </div>

      {/* Method filter pills */}
      <div className="flex gap-1.5 bg-tech-surface rounded-xl border border-tech-border p-1">
        {METHOD_FILTERS.map((f) => (
          <button
            key={f.key || 'all'}
            onClick={() => setMethodFilter(f.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
              methodFilter === f.key
                ? 'bg-tech-accent text-black shadow-md'
                : 'text-tech-secondary hover:text-tech-primary'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {recipes.length === 0 ? (
        <div className="text-center py-8 text-tech-secondary">
          <p>У вас пока нет сохранённых рецептов.</p>
          {!isReadOnly && (
            <button
              onClick={onNewRecipe}
              className="mt-4 px-6 py-2 rounded-xl bg-tech-accent text-black font-bold hover:brightness-110 transition"
            >
              Создать первый рецепт
            </button>
          )}
        </div>
      ) : (
        <div className="bento-grid">
          {recipes.map((r) => (
            <button
              key={r.id}
              onClick={() => onSelectRecipe(r)}
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
  )
}