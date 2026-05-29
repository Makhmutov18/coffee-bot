import React, { useState } from 'react'
import { calculateExtraction, saveRecipe } from '../api'

const TASTING_FIELDS = [
  { key: 'aroma', label: 'Аромат (Fragrance / Aroma)', placeholder: 'Фруктовые, цветочные, ореховые ноты...' },
  { key: 'flavor', label: 'Вкус (Flavor)', placeholder: 'Базовое вкусовое ощущение...' },
  { key: 'aftertaste', label: 'Послевкусие (Aftertaste)', placeholder: 'Короткое, долгое, сладковатое...' },
  { key: 'acidity', label: 'Кислотность (Acidity)', placeholder: 'Винная, яблочная, лимонная...' },
  { key: 'body', label: 'Тело (Body)', placeholder: 'Водянистое, лёгкое, сиропное, маслянистое...' },
  { key: 'balance', label: 'Баланс (Balance)', placeholder: 'Насколько гармонично...' },
  { key: 'cleanCup', label: 'Чистота чашки (Clean Cup)', placeholder: 'Отсутствие дефектов...' },
]

export default function Results({ recipe, brewResults, onNewBrew, onNewRecipe, onGoToRecipes }) {
  const [beverageWeight, setBeverageWeight] = useState('')
  const [tds, setTds] = useState('')
  const [extraction, setExtraction] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const [tastingNotes, setTastingNotes] = useState(
    Object.fromEntries(TASTING_FIELDS.map((f) => [f.key, '']))
  )

  const handleCalculate = async () => {
    setError(null)
    try {
      const result = await calculateExtraction({
        beverageWeight: parseFloat(beverageWeight),
        tds: parseFloat(tds),
        dose: recipe.dose,
      })
      setExtraction(result.extraction)
    } catch (e) {
      setError(e.message)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const tastingData = {}
      for (const [key, val] of Object.entries(tastingNotes)) {
        if (val.trim()) tastingData[key] = val.trim()
      }

      await saveRecipe({
        ...recipe,
        beverageWeight: parseFloat(beverageWeight),
        tds: parseFloat(tds),
        extraction: extraction,
        tastingNotes: Object.keys(tastingData).length > 0 ? tastingData : undefined,
      })
      setSaved(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    onNewRecipe()
  }

  const handleTastingChange = (key) => (e) => {
    setTastingNotes((prev) => ({ ...prev, [key]: e.target.value }))
  }

  // Guard: если нет рецепта — показываем заглушку
  if (!recipe) {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="text-5xl">☕</div>
        <h2 className="text-xl font-bold text-coffee-cream">Нет активного рецепта</h2>
        <p className="text-coffee-latte text-sm">
          Сначала создайте рецепт на вкладке «Рецепт»
        </p>
        <button
          onClick={onNewRecipe}
          className="px-6 py-2 rounded-lg bg-coffee-gold text-coffee-dark font-bold hover:bg-yellow-500 transition"
        >
          Создать рецепт
        </button>
      </div>
    )
  }

  if (saved) {
    return (
      <div className="text-center space-y-4">
        <div className="text-6xl">✅</div>
        <h2 className="text-xl font-bold text-coffee-cream">Рецепт сохранён!</h2>
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleClose}
            className="px-6 py-2 rounded-lg bg-coffee-gold text-coffee-dark font-bold hover:bg-yellow-500 transition"
          >
            Новый рецепт
          </button>
          <button
            onClick={onGoToRecipes}
            className="px-6 py-2 rounded-lg border border-coffee-brown text-coffee-cream hover:bg-coffee-brown transition"
          >
            Мои рецепты
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-coffee-cream">Итоги заваривания</h2>

      {/* Параметры заваривания */}
      <div className="bg-coffee-dark rounded-lg p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-coffee-latte">Сорт:</span>
          <span className="text-coffee-cream font-medium">{recipe.beanVariety}</span>
        </div>
        {recipe.roaster && (
          <div className="flex justify-between">
            <span className="text-coffee-latte">Обжарщик:</span>
            <span className="text-coffee-cream font-medium">{recipe.roaster}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-coffee-latte">Доза:</span>
          <span className="text-coffee-cream font-medium">{recipe.dose} г</span>
        </div>
        <div className="flex justify-between">
          <span className="text-coffee-latte">Воронка:</span>
          <span className="text-coffee-cream font-medium">{recipe.dripperType}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-coffee-latte">Вода:</span>
          <span className="text-coffee-cream font-medium">{recipe.totalWater} мл</span>
        </div>
      </div>

      {/* Замеры */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-coffee-cream">Замеры</h3>
        <div>
          <label className="block text-sm text-coffee-latte mb-1">Вес напитка (г)</label>
          <input
            type="number"
            step="0.1"
            value={beverageWeight}
            onChange={(e) => setBeverageWeight(e.target.value)}
            placeholder="210"
            className="w-full px-3 py-2 rounded-lg bg-coffee-dark text-coffee-cream border border-coffee-brown focus:border-coffee-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-coffee-latte mb-1">TDS (%)</label>
          <input
            type="number"
            step="0.01"
            value={tds}
            onChange={(e) => setTds(e.target.value)}
            placeholder="1.35"
            className="w-full px-3 py-2 rounded-lg bg-coffee-dark text-coffee-cream border border-coffee-brown focus:border-coffee-gold focus:outline-none"
          />
        </div>
        <button
          onClick={handleCalculate}
          disabled={!beverageWeight || !tds}
          className="w-full py-2 rounded-lg bg-coffee-brown text-coffee-cream font-medium hover:bg-coffee-gold hover:text-coffee-dark transition disabled:opacity-50"
        >
          Рассчитать экстракцию
        </button>
        {extraction !== null && (
          <div className="text-center p-3 rounded-lg bg-coffee-gold/20 border border-coffee-gold">
            <span className="text-coffee-latte text-sm">Экстракция:</span>
            <span className="text-coffee-gold text-2xl font-bold ml-2">{extraction}%</span>
          </div>
        )}
      </div>

      {/* Дегустационный профиль */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-coffee-cream">Дегустационный профиль</h3>
        {TASTING_FIELDS.map((field) => (
          <div key={field.key}>
            <label className="block text-sm text-coffee-latte mb-1">{field.label}</label>
            <textarea
              value={tastingNotes[field.key]}
              onChange={handleTastingChange(field.key)}
              placeholder={field.placeholder}
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-coffee-dark text-coffee-cream border border-coffee-brown focus:border-coffee-gold focus:outline-none text-sm resize-none"
            />
          </div>
        ))}
      </div>

      {error && (
        <div className="text-red-400 text-sm text-center">{error}</div>
      )}

      {/* Кнопки */}
      <div className="flex gap-3">
        <button
          onClick={onNewBrew}
          className="flex-1 py-2 rounded-lg border border-coffee-brown text-coffee-cream hover:bg-coffee-brown transition"
        >
          Заново
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !beverageWeight || !tds}
          className="flex-1 py-2 rounded-lg bg-coffee-gold text-coffee-dark font-bold hover:bg-yellow-500 transition disabled:opacity-50"
        >
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </div>
  )
}