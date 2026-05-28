import React, { useState, useEffect } from 'react'
import { getRecipe } from '../api'

export default function RecipeDetail({ recipeId, onBack, onRepeat }) {
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadRecipe()
  }, [recipeId])

  const loadRecipe = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getRecipe(recipeId)
      setRecipe(data)
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
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatTime = (seconds) => {
    if (seconds === undefined || seconds === null) return ''
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    if (m > 0) return `${m}:${s.toString().padStart(2, '0')}`
    return `${s} сек`
  }

  if (loading) {
    return <div className="text-center py-8 text-coffee-latte">Загрузка...</div>
  }

  if (error) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="text-red-400">Ошибка: {error}</div>
        <button onClick={onBack} className="text-coffee-gold">Назад</button>
      </div>
    )
  }

  if (!recipe) return null

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-coffee-gold text-sm mb-2">← Назад к списку</button>

      <h2 className="text-xl font-bold text-coffee-cream">
        {recipe.roaster ? `${recipe.roaster} — ` : ''}{recipe.beanVariety}
      </h2>

      <div className="text-coffee-latte text-xs">{formatDate(recipe.createdAt)}</div>

      {/* Параметры */}
      <div className="bg-coffee-dark rounded-lg p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-coffee-latte">Сорт:</span>
          <span className="text-coffee-cream">{recipe.beanVariety}</span>
        </div>
        {recipe.roaster && (
          <div className="flex justify-between">
            <span className="text-coffee-latte">Обжарщик:</span>
            <span className="text-coffee-cream">{recipe.roaster}</span>
          </div>
        )}
        {recipe.beanProcessing && (
          <div className="flex justify-between">
            <span className="text-coffee-latte">Обработка:</span>
            <span className="text-coffee-cream">{recipe.beanProcessing}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-coffee-latte">Доза:</span>
          <span className="text-coffee-cream">{recipe.dose} г</span>
        </div>
        <div className="flex justify-between">
          <span className="text-coffee-latte">Воронка:</span>
          <span className="text-coffee-cream">{recipe.dripperType}</span>
        </div>
        {recipe.grinderModel && (
          <div className="flex justify-between">
            <span className="text-coffee-latte">Кофемолка:</span>
            <span className="text-coffee-cream">{recipe.grinderModel}</span>
          </div>
        )}
        {recipe.grindSetting && (
          <div className="flex justify-between">
            <span className="text-coffee-latte">Помол:</span>
            <span className="text-coffee-cream">{recipe.grindSetting}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-coffee-latte">Вода:</span>
          <span className="text-coffee-cream">{recipe.totalWater} мл</span>
        </div>
        {recipe.waterTemp && (
          <div className="flex justify-between">
            <span className="text-coffee-latte">Температура:</span>
            <span className="text-coffee-cream">{recipe.waterTemp}°C</span>
          </div>
        )}
        {recipe.waterTds && (
          <div className="flex justify-between">
            <span className="text-coffee-latte">TDS воды:</span>
            <span className="text-coffee-cream">{recipe.waterTds} ppm</span>
          </div>
        )}
      </div>

      {/* Шаги пролива */}
      {recipe.pourSteps && recipe.pourSteps.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-coffee-cream mb-2">Шаги пролива</h3>
          <div className="space-y-1">
            {recipe.pourSteps.map((step, i) => (
              <div key={i} className="flex justify-between text-sm bg-coffee-dark rounded px-3 py-2">
                <span className="text-coffee-latte">
                  {step.action === 'bloom' ? 'Блум' : 'Вливание'}
                </span>
                <span className="text-coffee-cream">{formatTime(step.time)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Замеры */}
      {recipe.measurements && recipe.measurements.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-coffee-cream mb-2">Замеры</h3>
          {recipe.measurements.map((m) => (
            <div key={m.id} className="bg-coffee-dark rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-coffee-latte">Вес напитка:</span>
                <span className="text-coffee-cream">{m.beverageWeight} г</span>
              </div>
              <div className="flex justify-between">
                <span className="text-coffee-latte">TDS:</span>
                <span className="text-coffee-cream">{m.tds}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-coffee-latte">Экстракция:</span>
                <span className="text-coffee-gold font-bold">{m.extraction}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Дегустационный профиль */}
      {recipe.tastingNotes && Object.keys(recipe.tastingNotes).length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-coffee-cream mb-2">Дегустационный профиль</h3>
          <div className="bg-coffee-dark rounded-lg p-4 space-y-2 text-sm">
            {recipe.tastingNotes.aroma && (
              <div>
                <span className="text-coffee-latte">Аромат: </span>
                <span className="text-coffee-cream">{recipe.tastingNotes.aroma}</span>
              </div>
            )}
            {recipe.tastingNotes.flavor && (
              <div>
                <span className="text-coffee-latte">Вкус: </span>
                <span className="text-coffee-cream">{recipe.tastingNotes.flavor}</span>
              </div>
            )}
            {recipe.tastingNotes.aftertaste && (
              <div>
                <span className="text-coffee-latte">Послевкусие: </span>
                <span className="text-coffee-cream">{recipe.tastingNotes.aftertaste}</span>
              </div>
            )}
            {recipe.tastingNotes.acidity && (
              <div>
                <span className="text-coffee-latte">Кислотность: </span>
                <span className="text-coffee-cream">{recipe.tastingNotes.acidity}</span>
              </div>
            )}
            {recipe.tastingNotes.body && (
              <div>
                <span className="text-coffee-latte">Тело: </span>
                <span className="text-coffee-cream">{recipe.tastingNotes.body}</span>
              </div>
            )}
            {recipe.tastingNotes.balance && (
              <div>
                <span className="text-coffee-latte">Баланс: </span>
                <span className="text-coffee-cream">{recipe.tastingNotes.balance}</span>
              </div>
            )}
            {recipe.tastingNotes.cleanCup && (
              <div>
                <span className="text-coffee-latte">Чистота чашки: </span>
                <span className="text-coffee-cream">{recipe.tastingNotes.cleanCup}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Кнопка повтора */}
      <button
        onClick={() => onRepeat(recipe)}
        className="w-full py-3 rounded-lg bg-coffee-gold text-coffee-dark font-bold hover:bg-yellow-500 transition"
      >
        Повторить этот рецепт
      </button>
    </div>
  )
}