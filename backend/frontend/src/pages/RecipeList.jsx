import React, { useState, useEffect } from 'react'
import { listRecipes } from '../api'

export default function RecipeList({ onSelectRecipe, onNewRecipe, spotId }) {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadRecipes()
  }, [spotId])

  const loadRecipes = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listRecipes(spotId)
      setRecipes(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

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
        <div className="text-coffee-latte">Загрузка рецептов...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="text-red-400">Ошибка: {error}</div>
        <button
          onClick={loadRecipes}
          className="px-4 py-2 rounded-lg bg-coffee-brown text-coffee-cream hover:bg-coffee-gold hover:text-coffee-dark transition"
        >
          Повторить
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-coffee-cream">Мои рецепты</h2>
        <button
          onClick={onNewRecipe}
          className="px-4 py-2 rounded-lg bg-coffee-gold text-coffee-dark font-bold text-sm hover:bg-yellow-500 transition"
        >
          + Новый
        </button>
      </div>

      {recipes.length === 0 ? (
        <div className="text-center py-8 text-coffee-latte">
          <p>У вас пока нет сохранённых рецептов.</p>
          <button
            onClick={onNewRecipe}
            className="mt-4 px-6 py-2 rounded-lg bg-coffee-gold text-coffee-dark font-bold hover:bg-yellow-500 transition"
          >
            Создать первый рецепт
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {recipes.map((r) => (
            <button
              key={r.id}
              onClick={() => onSelectRecipe(r)}
              className="w-full text-left bg-coffee-dark rounded-lg p-4 border border-coffee-brown hover:border-coffee-gold transition"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="text-coffee-cream font-medium truncate">
                    {r.name ? r.name : (r.roaster ? `${r.roaster} — ` : '') + r.beanVariety}
                  </div>
                  <div className="text-coffee-latte text-xs mt-1">
                    {r.dripperType} · {r.dose}г · {r.totalWater}мл
                  </div>
                  {r.lastMeasurement && (
                    <div className="text-coffee-gold text-xs mt-1">
                      Экстракция: {r.lastMeasurement.extraction}% · TDS: {r.lastMeasurement.tds}%
                    </div>
                  )}
                </div>
                <div className="text-coffee-latte text-xs ml-2 whitespace-nowrap">
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