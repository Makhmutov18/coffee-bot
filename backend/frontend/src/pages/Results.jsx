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

function getBalanceVerdict(extraction) {
  if (extraction === null || extraction === undefined) return null
  if (extraction >= 18 && extraction <= 22) {
    return { text: '✨ Идеальный баланс! Чашка получилась сладкой, сбалансированной, с выраженной деликатной кислотностью.', color: 'text-emerald-400' }
  }
  if (extraction < 18) {
    return { text: '⚠️ Недоэкстракция. Попробуйте увеличить температуру, уменьшить помол или увеличить время контакта.', color: 'text-amber-400' }
  }
  return { text: '⚠️ Переэкстракция. Попробуйте снизить температуру, увеличить помол или уменьшить время контакта.', color: 'text-red-400' }
}

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

      const saveData = { ...recipe }
      if (beverageWeight) saveData.beverageWeight = parseFloat(beverageWeight)
      if (tds) saveData.tds = parseFloat(tds)
      if (extraction !== null) saveData.extraction = extraction
      if (Object.keys(tastingData).length > 0) saveData.tastingNotes = tastingData

      await saveRecipe(saveData)
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

  const verdict = getBalanceVerdict(extraction)

  // Guard: если нет рецепта
  if (!recipe) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4 py-8 animate-fade-in">
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
      <div className="max-w-md mx-auto text-center space-y-4 py-8 animate-fade-in">
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
    <div className="max-w-md mx-auto space-y-6 pb-12 animate-fade-in">
      {/* КАРТОЧКА ВВОДА ДАННЫХ РЕФРАКТОМЕТРА */}
      <div className="bg-coffee-900/40 backdrop-blur-sm border border-coffee-800/40 rounded-2xl p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-coffee-400 flex items-center gap-2">
          <span>🧪</span> Данные измерений
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-coffee-300 font-medium mb-1 block">Выход напитка (гр)</label>
            <input
              type="text"
              inputMode="decimal"
              pattern="\d*\.?\d*"
              placeholder="например, 215"
              value={beverageWeight}
              onChange={(e) => setBeverageWeight(e.target.value)}
              className="w-full text-center"
            />
          </div>
          <div>
            <label className="text-xs text-coffee-300 font-medium mb-1 block">TDS (%)</label>
            <input
              type="text"
              inputMode="decimal"
              pattern="\d*\.?\d*"
              placeholder="например, 1.35"
              value={tds}
              onChange={(e) => setTds(e.target.value)}
              className="w-full text-center"
            />
          </div>
        </div>

        <button
          onClick={handleCalculate}
          disabled={!beverageWeight || !tds}
          className="w-full py-3 bg-coffee-500 hover:bg-coffee-400 text-coffee-50 font-medium rounded-xl shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
        >
          Рассчитать экстракцию
        </button>
      </div>

      {/* ВИЗУАЛИЗАЦИЯ GOLDEN CUP */}
      {extraction !== null && (
        <div className="bg-coffee-900/60 border border-coffee-800/60 rounded-2xl p-6 text-center space-y-5 shadow-xl">
          <div>
            <span className="text-xs uppercase tracking-widest text-coffee-400 font-medium">Экстракция (Extraction)</span>
            <div className="text-5xl font-light text-coffee-100 font-mono mt-1">
              {extraction}%
            </div>
          </div>

          {/* Шкала вкусового баланса */}
          <div className="space-y-2 pt-2">
            <div className="h-2.5 w-full bg-coffee-950 rounded-full border border-coffee-800/40 relative overflow-hidden flex">
              <div className="h-full w-[18%] bg-amber-600/30 border-r border-coffee-800/40" />
              <div className="h-full w-[4%] bg-emerald-500/60" />
              <div className="h-full flex-1 bg-red-900/30 border-l border-coffee-800/40" />
              <div
                className="absolute top-0 bottom-0 w-1 bg-coffee-100 shadow-[0_0_8px_#fff] transition-all duration-500"
                style={{ left: `${Math.min(Math.max((extraction / 30) * 100, 5), 95)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-medium tracking-wide text-coffee-500 px-1">
              <span className="text-amber-500/70">Кислый / Недо-</span>
              <span className="text-emerald-400 font-semibold">Sweet Spot (18-22%)</span>
              <span className="text-red-400/70">Горький / Пере-</span>
            </div>
          </div>

          {/* Вердикт */}
          {verdict && (
            <div className={`p-3 bg-coffee-950/40 rounded-xl border border-coffee-800/30 text-sm ${verdict.color}`}>
              {verdict.text}
            </div>
          )}
        </div>
      )}

      {/* Дегустационный профиль */}
      <div className="bg-coffee-900/40 backdrop-blur-sm border border-coffee-800/40 rounded-2xl p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-coffee-400 flex items-center gap-2">
          <span>👃</span> Дегустационный профиль
        </h3>
        {TASTING_FIELDS.map((field) => (
          <div key={field.key}>
            <label className="text-xs text-coffee-300 font-medium mb-1 block">{field.label}</label>
            <textarea
              value={tastingNotes[field.key]}
              onChange={handleTastingChange(field.key)}
              placeholder={field.placeholder}
              rows={2}
              className="w-full text-sm resize-none"
            />
          </div>
        ))}
      </div>

      {error && (
        <div className="text-red-400 text-sm text-center">{error}</div>
      )}

      {/* НАВИГАЦИОННЫЕ КНОПКИ */}
      <div className="space-y-2 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 bg-coffee-500 hover:bg-coffee-400 text-coffee-50 font-medium rounded-xl shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
        >
          {saving ? 'Сохранение...' : '💾 Сохранить рецепт'}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onNewBrew}
            className="py-3 bg-coffee-900 hover:bg-coffee-800 border border-coffee-800 text-coffee-300 text-sm font-medium rounded-xl transition-all"
          >
            🔄 Заново
          </button>
          <button
            onClick={onNewRecipe}
            className="py-3 bg-coffee-900 hover:bg-coffee-800 border border-coffee-800 text-coffee-300 text-sm font-medium rounded-xl transition-all"
          >
            📝 Новый рецепт
          </button>
        </div>
      </div>
    </div>
  )
}