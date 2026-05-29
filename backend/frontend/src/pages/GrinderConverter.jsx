import React, { useState, useEffect, useRef, useCallback } from 'react'
import { convertGrinder, listGrinderModels } from '../api'

function grinderNameToLabel(name) {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function GrinderConverter() {
  const [grinderOptions, setGrinderOptions] = useState([])
  const [fromGrinder, setFromGrinder] = useState('')
  const [toGrinder, setToGrinder] = useState('')
  const [value, setValue] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)

  // Загружаем список кофемолок с сервера
  useEffect(() => {
    listGrinderModels().then((models) => {
      setGrinderOptions(models)
      if (models.length > 0) {
        setFromGrinder(models[0])
        if (models.length > 1) {
          setToGrinder(models[1])
        } else {
          setToGrinder(models[0])
        }
      }
    }).catch(() => {
      setError('Не удалось загрузить список кофемолок')
    })
  }, [])

  const doConvert = useCallback(async (from, to, val) => {
    if (!val || !val.trim() || from === to) {
      setResult(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await convertGrinder(from, to, val.trim())
      setResult(data)
    } catch (err) {
      setError(err.message || 'Ошибка конвертации')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Авто-конвертация с debounce 400ms
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    if (!value || !value.trim() || fromGrinder === toGrinder || !fromGrinder || !toGrinder) {
      setResult(null)
      setError(null)
      return
    }
    debounceRef.current = setTimeout(() => {
      doConvert(fromGrinder, toGrinder, value)
    }, 400)
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [fromGrinder, toGrinder, value, doConvert])

  const handleSwap = useCallback(() => {
    setFromGrinder(toGrinder)
    setToGrinder(fromGrinder)
    setResult(null)
    setError(null)
  }, [fromGrinder, toGrinder])

  const getGrinderLabel = (val) => {
    return grinderNameToLabel(val)
  }

  if (grinderOptions.length === 0) {
    return (
      <div className="space-y-5">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-coffee-200">🔄 Конвертер помола</h2>
          <p className="text-xs text-coffee-400 mt-1">Загрузка списка кофемолок...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-coffee-200">🔄 Конвертер помола</h2>
        <p className="text-xs text-coffee-400 mt-1">
          Пересчёт помола между разными кофемолками
        </p>
      </div>

      {/* ── Слот A: Исходная кофемолка ── */}
      <div className="bg-coffee-800/30 border border-coffee-700/40 rounded-xl p-4 space-y-3">
        <div className="text-xs font-medium text-coffee-400 uppercase tracking-wider">
          Слот A — Исходная кофемолка
        </div>
        <select
          value={fromGrinder}
          onChange={(e) => { setFromGrinder(e.target.value); setResult(null); setError(null) }}
          className="w-full bg-coffee-800/60 border border-coffee-700/50 rounded-lg px-3 py-2.5 text-sm text-coffee-200 focus:outline-none focus:border-coffee-500 appearance-none"
        >
          {grinderOptions.map((g) => (
            <option key={g} value={g}>{getGrinderLabel(g)}</option>
          ))}
        </select>
        <input
          type="text"
          inputMode="decimal"
          pattern="\d*\.?\d*"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(null) }}
          placeholder="Введите значение (например, 20)"
          className="w-full bg-coffee-800/60 border border-coffee-700/50 rounded-lg px-3 py-2.5 text-sm text-coffee-200 placeholder-coffee-600 focus:outline-none focus:border-coffee-500"
        />
      </div>

      {/* ── Кнопка смены ── */}
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

      {/* ── Слот B: Целевая кофемолка ── */}
      <div className="bg-coffee-800/30 border border-coffee-700/40 rounded-xl p-4 space-y-3">
        <div className="text-xs font-medium text-coffee-400 uppercase tracking-wider">
          Слот B — Целевая кофемолка
        </div>
        <select
          value={toGrinder}
          onChange={(e) => { setToGrinder(e.target.value); setResult(null); setError(null) }}
          className="w-full bg-coffee-800/60 border border-coffee-700/50 rounded-lg px-3 py-2.5 text-sm text-coffee-200 focus:outline-none focus:border-coffee-500 appearance-none"
        >
          {grinderOptions.map((g) => (
            <option key={g} value={g}>{getGrinderLabel(g)}</option>
          ))}
        </select>
        <div className="relative">
          <input
            type="text"
            readOnly
            value={
              loading
                ? '⏳ Конвертация...'
                : result
                  ? result.to_value
                  : error
                    ? ''
                    : ''
            }
            placeholder={
              !value
                ? 'Введите значение в Слоте A'
                : fromGrinder === toGrinder
                  ? 'Выберите разные кофемолки'
                  : error
                    ? 'Ошибка'
                    : 'Результат появится автоматически'
            }
            className="w-full bg-coffee-900/60 border border-coffee-700/50 rounded-lg px-3 py-2.5 text-sm text-coffee-100 placeholder-coffee-600 focus:outline-none focus:border-coffee-500"
          />
          {result && !loading && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-coffee-500">
              ✓
            </div>
          )}
        </div>
      </div>

      {/* ── Ошибка ── */}
      {error && (
        <div className="p-3 bg-red-900/30 border border-red-800/50 rounded-lg text-sm text-red-300">
          ❌ {error}
        </div>
      )}

      {/* ── Результат ── */}
      {result && !loading && (
        <div className="p-4 bg-coffee-800/40 border border-coffee-700/50 rounded-xl space-y-2">
          <div className="text-center">
            <span className="text-xs text-coffee-400 uppercase tracking-wider">Результат</span>
          </div>
          <div className="flex items-center justify-center gap-3 text-sm">
            <span className="text-coffee-300 font-medium text-right max-w-[120px] truncate">
              {value} {getGrinderLabel(fromGrinder).split(' ')[0]}
            </span>
            <span className="text-coffee-500 text-lg shrink-0">→</span>
            <span className="text-coffee-100 font-bold text-lg text-left max-w-[120px] truncate">
              {result.to_value} {getGrinderLabel(toGrinder).split(' ')[0]}
            </span>
          </div>
          <div className="text-center text-xs text-coffee-500 space-y-0.5">
            <div>Диапазон микрон: {result.micron_range}</div>
            {result.method && <div>Метод: {result.method}</div>}
          </div>
        </div>
      )}
    </div>
  )
}