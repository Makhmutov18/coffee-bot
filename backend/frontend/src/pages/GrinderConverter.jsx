import React, { useState, useCallback } from 'react'
import { convertGrinder } from '../api'

const GRINDER_OPTIONS = [
  { value: 'comandante_c40', label: 'Comandante C40' },
  { value: 'timemore_c2', label: 'Timemore C2' },
  { value: 'mahlkonig_ek43', label: 'Mahlkönig EK43' },
  { value: 'zp6', label: '1Zpresso ZP6' },
  { value: 'mischief_m40', label: 'Mischief M40' },
  { value: 'fellow_ode', label: 'Fellow Ode' },
  { value: 'wilfa_svart', label: 'Wilfa Svart' },
  { value: 'kinu_m47', label: 'Kinu M47' },
]

export default function GrinderConverter() {
  const [fromGrinder, setFromGrinder] = useState('comandante_c40')
  const [toGrinder, setToGrinder] = useState('zp6')
  const [clicks, setClicks] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleConvert = useCallback(async () => {
    if (!clicks || parseFloat(clicks) <= 0) {
      setError('Введите количество щелчков')
      setResult(null)
      return
    }
    if (fromGrinder === toGrinder) {
      setError('Выберите разные кофемолки')
      setResult(null)
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await convertGrinder(fromGrinder, toGrinder, parseFloat(clicks))
      setResult(data)
    } catch (err) {
      setError(err.message || 'Ошибка конвертации')
    } finally {
      setLoading(false)
    }
  }, [fromGrinder, toGrinder, clicks])

  const handleSwap = useCallback(() => {
    setFromGrinder(toGrinder)
    setToGrinder(fromGrinder)
    setResult(null)
    setError(null)
  }, [fromGrinder, toGrinder])

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-coffee-200">🔄 Конвертация кофемолок</h2>
        <p className="text-xs text-coffee-400 mt-1">
          Пересчёт щелчков/делений между разными моделями
        </p>
      </div>

      {/* Исходная кофемолка */}
      <div>
        <label className="block text-xs font-medium text-coffee-400 mb-1.5 uppercase tracking-wider">
          Исходная кофемолка
        </label>
        <select
          value={fromGrinder}
          onChange={(e) => { setFromGrinder(e.target.value); setResult(null); setError(null) }}
          className="w-full bg-coffee-800/60 border border-coffee-700/50 rounded-lg px-3 py-2.5 text-sm text-coffee-200 focus:outline-none focus:border-coffee-500 appearance-none"
        >
          {GRINDER_OPTIONS.map((g) => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </select>
      </div>

      {/* Щелчки */}
      <div>
        <label className="block text-xs font-medium text-coffee-400 mb-1.5 uppercase tracking-wider">
          Щелчки / деления
        </label>
        <input
          type="text"
          inputMode="decimal"
          pattern="\d*\.?\d*"
          value={clicks}
          onChange={(e) => { setClicks(e.target.value); setResult(null); setError(null) }}
          placeholder="22"
          className="w-full bg-coffee-800/60 border border-coffee-700/50 rounded-lg px-3 py-2.5 text-sm text-coffee-200 placeholder-coffee-600 focus:outline-none focus:border-coffee-500"
        />
      </div>

      {/* Кнопка ↓ (поменять местами) */}
      <div className="flex justify-center">
        <button
          onClick={handleSwap}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-coffee-800/60 border border-coffee-700/50 text-coffee-400 hover:text-coffee-200 hover:border-coffee-500 transition-all"
          title="Поменять местами"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>
      </div>

      {/* Целевая кофемолка */}
      <div>
        <label className="block text-xs font-medium text-coffee-400 mb-1.5 uppercase tracking-wider">
          Целевая кофемолка
        </label>
        <select
          value={toGrinder}
          onChange={(e) => { setToGrinder(e.target.value); setResult(null); setError(null) }}
          className="w-full bg-coffee-800/60 border border-coffee-700/50 rounded-lg px-3 py-2.5 text-sm text-coffee-200 focus:outline-none focus:border-coffee-500 appearance-none"
        >
          {GRINDER_OPTIONS.map((g) => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </select>
      </div>

      {/* Кнопка конвертации */}
      <button
        onClick={handleConvert}
        disabled={loading}
        className="w-full py-3 bg-coffee-600 hover:bg-coffee-500 disabled:bg-coffee-700 disabled:text-coffee-500 text-white font-medium rounded-xl transition-all text-sm"
      >
        {loading ? '⏳ Конвертация...' : '🔄 Конвертировать'}
      </button>

      {/* Ошибка */}
      {error && (
        <div className="p-3 bg-red-900/30 border border-red-800/50 rounded-lg text-sm text-red-300">
          ❌ {error}
        </div>
      )}

      {/* Результат */}
      {result && (
        <div className="p-4 bg-coffee-800/40 border border-coffee-700/50 rounded-xl space-y-2">
          <div className="text-center">
            <span className="text-xs text-coffee-400 uppercase tracking-wider">Результат</span>
          </div>
          <div className="flex items-center justify-center gap-3 text-sm">
            <span className="text-coffee-300 font-medium">
              {result.from_clicks} {GRINDER_OPTIONS.find(g => g.value === result.from_grinder)?.label.split(' ')[0] || result.from_grinder}
            </span>
            <span className="text-coffee-500 text-lg">→</span>
            <span className="text-coffee-100 font-bold text-lg">
              {result.to_clicks} {GRINDER_OPTIONS.find(g => g.value === result.to_grinder)?.label.split(' ')[0] || result.to_grinder}
            </span>
          </div>
          <div className="text-center text-xs text-coffee-500">
            Диапазон микрон: {result.micron_range}
          </div>
        </div>
      )}
    </div>
  )
}