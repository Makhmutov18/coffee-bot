import React, { useState } from 'react'
import { saveRecipe, calculateExtraction } from '../api'

export default function Results({ recipe, brewResults, onNewBrew, onNewRecipe }) {
  const [beverageWeight, setBeverageWeight] = useState('')
  const [tds, setTds] = useState('')
  const [extraction, setExtraction] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  const handleCalculate = async () => {
    if (!beverageWeight || !tds) return

    setError(null)
    setSaving(true)

    try {
      // Calculate extraction locally first
      const bw = Number(beverageWeight)
      const tdsVal = Number(tds)
      const dose = recipe.dose
      const ext = ((bw * tdsVal) / dose).toFixed(2)
      setExtraction(ext)

      // Save to backend
      await saveRecipe({
        ...recipe,
        beverageWeight: bw,
        tds: tdsVal,
        extraction: Number(ext),
        brewTime: brewResults?.brewTime || 0,
      })

      setSaved(true)
    } catch (err) {
      setError('Ошибка при сохранении. Попробуй ещё раз.')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.close()
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-coffee-200">Итоги заваривания</h2>

      {/* Recipe Summary */}
      {recipe && (
        <div className="bg-coffee-900 rounded-xl p-4 border border-coffee-700 space-y-1">
          <div className="text-sm text-coffee-400">{recipe.beanVariety}</div>
          <div className="text-sm text-coffee-500">
            {recipe.dose}г / {recipe.totalWater}мл / {recipe.dripperType}
          </div>
          {brewResults && (
            <div className="text-sm text-coffee-500">
              Время: {Math.floor(brewResults.brewTime / 60)}:{(brewResults.brewTime % 60).toString().padStart(2, '0')}
            </div>
          )}
        </div>
      )}

      {/* Input Fields */}
      {!saved && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-coffee-400 mb-1">
              Вес готового напитка (г)
            </label>
            <input
              type="number"
              step="0.1"
              value={beverageWeight}
              onChange={(e) => setBeverageWeight(e.target.value)}
              placeholder="Например: 210"
            />
          </div>

          <div>
            <label className="block text-sm text-coffee-400 mb-1">
              TDS (%)
            </label>
            <input
              type="number"
              step="0.01"
              value={tds}
              onChange={(e) => setTds(e.target.value)}
              placeholder="Например: 1.35"
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center">{error}</div>
          )}

          <button
            onClick={handleCalculate}
            disabled={!beverageWeight || !tds || saving}
            className="w-full py-3 bg-coffee-600 text-coffee-100 rounded-xl font-medium
              hover:bg-coffee-500 transition-colors disabled:opacity-40"
          >
            {saving ? 'Сохранение...' : 'Рассчитать и сохранить'}
          </button>
        </div>
      )}

      {/* Result */}
      {extraction && (
        <div className="bg-coffee-900 rounded-xl p-6 border border-coffee-600 text-center">
          <div className="text-sm text-coffee-400 mb-2">Экстракция</div>
          <div className="text-4xl font-bold text-coffee-100">
            {extraction}%
          </div>
          <div className="text-sm text-coffee-500 mt-2">
            Вес напитка: {beverageWeight}г · TDS: {tds}%
          </div>
          <div className="text-xs text-coffee-600 mt-1">
            Golden Cup: (Вес × TDS) / Доза
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={onNewBrew}
          className="w-full py-3 bg-coffee-700 text-coffee-200 rounded-xl font-medium
            hover:bg-coffee-600 transition-colors"
        >
          Повторить заваривание
        </button>
        <button
          onClick={onNewRecipe}
          className="w-full py-3 bg-coffee-800 text-coffee-400 rounded-xl
            hover:bg-coffee-700 transition-colors"
        >
          Новый рецепт
        </button>
        <button
          onClick={handleClose}
          className="w-full py-2 text-sm text-coffee-500 hover:text-coffee-400 transition-colors"
        >
          Закрыть
        </button>
      </div>
    </div>
  )
}