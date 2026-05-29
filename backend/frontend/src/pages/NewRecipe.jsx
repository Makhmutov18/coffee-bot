import React, { useState, useEffect, useRef, useCallback } from 'react'
import { saveRecipe, convertGrinder, listGrinderModels } from '../api'

const DRIPPERS = [
  'Hario V60',
  'Hario Switch',
  'Kalita Wave',
  'Chemex',
  'Origami',
  'Orea',
  'NextLevel Pulsar',
  'Cafec Flower Deep 27',
  'Timemore B75',
  'Sworks Dripper',
  'Gabi Dripper',
  'Torch Mountain',
  'Kono',
  'Melitta',
  'GSI Outdoors Collapsible JavaDrip',
  'Sea to Summit X-Brew',
  'Zebrang V60 Foldable Dripper',
  'Primula Brew Buddy',
  'Другая...',
]

const GRINDERS = [
  'Mahlkönig Tanzania',
  'Mahlkönig EK43 (turkish)',
  'Mahlkönig EK43 (coffee)',
  'Mazzer ZM',
  'Comandante (Red clix)',
  'Feldgrind 2',
  'Kinu m47 phoenix',
  'Timemore Slim',
  'Timemore Nano',
  'Timemore Chestnut G1 Plus',
  'Timemore Chestnut C2',
  'Ditting',
  'Baratza Encore',
  'Baratza Virtuoso+',
  'Baratza Sette 30',
  'Baratza Forte',
  'Fellow Ode',
  '1Zpresso JX',
  '1Zpresso JE',
  'Wilfa Svart Nymalt',
  'Wilfa Svart Uniform',
  'Niche Zero',
  'Eureka Atom Pro',
  'Eureka Drogheria',
  'Eureka Mignon Brew Pro',
  'Eureka Mignon 50mm Filtro Pro',
  'Eureka Mignon 50mm Filtro Pro NEW',
  'Feld47',
  'Ditting 807 LAB SWEET',
  'Fiorenzato F4 Filter',
  'Omni Cup',
  'XEOLEO',
  '1Zpresso K-Plus',
  'Mahlkönig (другая)',
  'Timemore Grinder Go',
  'Saint Anthony',
  'DF64',
  'KINGrinder K4',
  'KINGrinder K2-AR',
  '1Zpresso Q2',
  'Timemore Chestnut C3',
  'Comandante C40',
  'Hario Coffee Grinder',
  'Anfim Drogheria',
  'Varia VS3',
  'Lagom P64',
  'KINGrinder K6',
  'Hero',
  'Timemore Chestnut X lite',
  'Ditting для дрипов',
  'Китайская копия EK-43',
  'PIETRO',
  'Mahlkönig EK43 ICON (coffee)',
  'EUREKA MIGNON CRONO',
  'Mischef Electric Mini',
  'MHW-3BOMBER Blade R3',
  'Fellow Opus',
  'DF83V',
  'Chestnut C3 ESP',
  'MHW-3BOMBER Racing M1',
  'Varia Hand Grinder',
  'Mavo Wizard Coffee Grinder',
  'Другая...',
]


const INITIAL_FORM = {
  name: '',
  roaster: '',
  beanVariety: '',
  beanProcessing: '',
  dose: '',
  dripperType: 'Hario V60',
  dripperCustom: '',
  grinderModel: '',
  grinderCustom: '',
  grindSetting: '',
  totalWater: '',
  waterTemp: '',
  waterTds: '',
  brewTime: '',
  pourSteps: [{ time: '', volume: '', action: 'bloom', comment: '' }],
}

export default function NewRecipe({ onSave, initialData, spotId }) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(null)

  // ── Динамические опции кофемолок для конвертера ──
  const [convGrinderOptions, setConvGrinderOptions] = useState([])

  // ── Инлайн-конвертер помола ──
  const [showConverter, setShowConverter] = useState(false)
  const [convFrom, setConvFrom] = useState('')
  const [convTo, setConvTo] = useState('')
  const [convValue, setConvValue] = useState('')
  const [convResult, setConvResult] = useState(null)
  const [convError, setConvError] = useState(null)
  const [convLoading, setConvLoading] = useState(false)
  const convDebounce = useRef(null)

  // Загружаем список кофемолок для конвертера
  useEffect(() => {
    listGrinderModels().then((models) => {
      setConvGrinderOptions(models)
      if (models.length > 0) {
        setConvFrom(models[0])
        if (models.length > 1) {
          setConvTo(models[1])
        } else {
          setConvTo(models[0])
        }
      }
    }).catch(() => {})
  }, [])

  const doConvert = useCallback(async (from, to, val) => {
    if (!val || !val.trim() || from === to) {
      setConvResult(null)
      setConvError(null)
      return
    }
    setConvLoading(true)
    setConvError(null)
    try {
      const data = await convertGrinder(from, to, val.trim())
      setConvResult(data)
    } catch (err) {
      setConvError(err.message || 'Ошибка конвертации')
      setConvResult(null)
    } finally {
      setConvLoading(false)
    }
  }, [])

  useEffect(() => {
    if (convDebounce.current) clearTimeout(convDebounce.current)
    if (!convValue || !convValue.trim() || convFrom === convTo) {
      setConvResult(null)
      setConvError(null)
      return
    }
    convDebounce.current = setTimeout(() => {
      doConvert(convFrom, convTo, convValue)
    }, 400)
    return () => {
      if (convDebounce.current) clearTimeout(convDebounce.current)
    }
  }, [convFrom, convTo, convValue, doConvert])

  // Pre-fill form when repeating a recipe
  useEffect(() => {
    if (initialData) {
      const dripperIsCustom = initialData.dripperType && !DRIPPERS.slice(0, -1).includes(initialData.dripperType)
      const grinderIsCustom = initialData.grinderModel && !GRINDERS.slice(0, -1).includes(initialData.grinderModel)
      setForm({
        name: initialData.name || '',
        roaster: initialData.roaster || '',
        beanVariety: initialData.beanVariety || '',
        beanProcessing: initialData.beanProcessing || '',
        dose: initialData.dose?.toString() || '',
        dripperType: dripperIsCustom ? 'Другая...' : (initialData.dripperType || 'Hario V60'),
        dripperCustom: dripperIsCustom ? initialData.dripperType : '',
        grinderModel: grinderIsCustom ? 'Другая...' : (initialData.grinderModel || ''),
        grinderCustom: grinderIsCustom ? initialData.grinderModel : '',
        grindSetting: initialData.grindSetting || '',
        totalWater: initialData.totalWater?.toString() || '',
        waterTemp: initialData.waterTemp?.toString() || '',
        waterTds: initialData.waterTds?.toString() || '',
        brewTime: initialData.brewTime?.toString() || '',
        pourSteps: (initialData.pourSteps && initialData.pourSteps.length > 0)
          ? initialData.pourSteps.map((s) => ({
              time: s.time?.toString() || '',
              volume: s.volume?.toString() || '',
              action: s.action || 'pour',
              comment: s.comment || '',
            }))
          : [{ time: '', volume: '', action: 'bloom', comment: '' }],
      })
    }
  }, [initialData])

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleStepChange = (index, field) => (e) => {
    setForm((prev) => {
      const steps = [...prev.pourSteps]
      steps[index] = { ...steps[index], [field]: e.target.value }
      return { ...prev, pourSteps: steps }
    })
  }

  const addStep = () => {
    setForm((prev) => ({
      ...prev,
      pourSteps: [...prev.pourSteps, { time: '', volume: '', action: 'pour', comment: '' }],
    }))
  }

  const removeStep = (index) => {
    setForm((prev) => ({
      ...prev,
      pourSteps: prev.pourSteps.filter((_, i) => i !== index),
    }))
  }

  const getDripperValue = () => {
    if (form.dripperType === 'Другая...') {
      return form.dripperCustom || 'Другая'
    }
    return form.dripperType
  }

  const getGrinderValue = () => {
    if (form.grinderModel === 'Другая...') {
      return form.grinderCustom || 'Другая'
    }
    return form.grinderModel
  }

  const buildSteps = () => {
    return form.pourSteps
      .filter((s) => s.time !== '')
      .map((s) => {
        let totalSeconds = 0
        const t = s.time.trim()
        if (t.includes(':')) {
          const parts = t.split(':')
          totalSeconds = parseInt(parts[0] || 0) * 60 + parseInt(parts[1] || 0)
        } else {
          totalSeconds = parseInt(t) || 0
        }
        return {
          time: totalSeconds,
          volume: s.volume ? parseInt(s.volume) : undefined,
          action: s.action,
          comment: s.comment || undefined,
        }
      })
  }

  const buildRecipeData = (steps) => {
    const data = {
      name: form.name || undefined,
      roaster: form.roaster || undefined,
      beanVariety: form.beanVariety,
      beanProcessing: form.beanProcessing || undefined,
      dose: parseFloat(form.dose),
      dripperType: getDripperValue(),
      grinderModel: getGrinderValue() || undefined,
      grindSetting: form.grindSetting || undefined,
      totalWater: parseFloat(form.totalWater),
      waterTemp: form.waterTemp ? parseFloat(form.waterTemp) : undefined,
      waterTds: form.waterTds ? parseFloat(form.waterTds) : undefined,
      brewTime: form.brewTime ? (() => {
        const t = form.brewTime.trim()
        if (t.includes(':')) {
          const parts = t.split(':')
          return parseInt(parts[0] || 0) * 60 + parseInt(parts[1] || 0)
        }
        return parseInt(t) || undefined
      })() : undefined,
      pourSteps: steps,
    }
    if (spotId) {
      data.spotId = spotId
    }
    return data
  }

  const handleSaveOnly = async () => {
    const steps = buildSteps()
    const recipeData = buildRecipeData(steps)
    setSaving(true)
    setSaveError(null)
    try {
      await saveRecipe(recipeData)
      setSaved(true)
    } catch (e) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const steps = buildSteps()
    const recipeData = buildRecipeData(steps)
    onSave(recipeData)
  }

  const handleNewAgain = () => {
    setForm(INITIAL_FORM)
    setSaved(false)
    setSaveError(null)
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-6 pb-12 animate-fade-in">
      {/* СЕКЦИЯ 1: ЗЕРНО */}
      <div className="bg-coffee-900/40 backdrop-blur-sm border border-coffee-800/40 rounded-2xl p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-coffee-400 flex items-center gap-2">
          <span>🌿</span> Профиль зерна
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-coffee-300 font-medium mb-1 block">Название рецепта</label>
            <input
              type="text"
              value={form.name}
              onChange={handleChange('name')}
              placeholder="V60"
            />
          </div>
          <div>
            <label className="text-xs text-coffee-300 font-medium mb-1 block">Обжарщик</label>
            <input
              type="text"
              value={form.roaster}
              onChange={handleChange('roaster')}
              placeholder="Tasty Coffee"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-coffee-300 font-medium mb-1 block">Сорт / Регион *</label>
              <input
                type="text"
                value={form.beanVariety}
                onChange={handleChange('beanVariety')}
                placeholder="Ethiopia Yirgacheffe"
                required
              />
            </div>
            <div>
              <label className="text-xs text-coffee-300 font-medium mb-1 block">Обработка</label>
              <input
                type="text"
                value={form.beanProcessing}
                onChange={handleChange('beanProcessing')}
                placeholder="Мытая / Натуральная"
              />
            </div>
          </div>
        </div>
      </div>

      {/* СЕКЦИЯ 2: ОБОРУДОВАНИЕ И ПАРАМЕТРЫ */}
      <div className="bg-coffee-900/40 backdrop-blur-sm border border-coffee-800/40 rounded-2xl p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-coffee-400 flex items-center gap-2">
          <span>⚙️</span> Параметры экстракции
        </h3>

        {/* Воронка */}
        <div>
          <label className="text-xs text-coffee-300 font-medium mb-2 block">Тип девайса *</label>
          <select
            value={form.dripperType}
            onChange={handleChange('dripperType')}
            className="w-full"
          >
            {DRIPPERS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          {form.dripperType === 'Другая...' && (
            <input
              type="text"
              value={form.dripperCustom}
              onChange={handleChange('dripperCustom')}
              placeholder="Введите название воронки"
              className="w-full mt-2"
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-coffee-300 font-medium mb-1 block">Кофемолка</label>
            <select
              value={form.grinderModel}
              onChange={handleChange('grinderModel')}
              className="w-full"
            >
              <option value="">— выберите —</option>
              {GRINDERS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            {form.grinderModel === 'Другая...' && (
              <input
                type="text"
                value={form.grinderCustom}
                onChange={handleChange('grinderCustom')}
                placeholder="Введите название кофемолки"
                className="w-full mt-2"
              />
            )}
          </div>
          <div>
            <label className="text-xs text-coffee-300 font-medium mb-1 block">Помол (клики)</label>
            <input
              type="text"
              value={form.grindSetting}
              onChange={handleChange('grindSetting')}
              placeholder="24 clicks"
            />
          </div>
        </div>

        {/* ── Инлайн-конвертер помола ── */}
        <div className="border-t border-coffee-800/40 pt-3">
          <button
            type="button"
            onClick={() => setShowConverter((v) => !v)}
            className="w-full flex items-center justify-between text-xs font-medium text-coffee-400 hover:text-coffee-200 transition-colors"
          >
            <span>🔄 Конвертер помола</span>
            <span className={`transform transition-transform ${showConverter ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>

          {showConverter && convGrinderOptions.length > 0 && (
            <div className="mt-3 space-y-3 animate-fade-in">
              {/* Строка: from select + input */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-coffee-500 uppercase tracking-wider mb-1 block">Из</label>
                  <select
                    value={convFrom}
                    onChange={(e) => setConvFrom(e.target.value)}
                    className="w-full bg-coffee-800/60 border border-coffee-700/50 rounded-lg px-2 py-1.5 text-xs text-coffee-200 focus:outline-none focus:border-coffee-500 appearance-none"
                  >
                    {convGrinderOptions.map((g) => (
                      <option key={g} value={g}>{g.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-coffee-500 uppercase tracking-wider mb-1 block">В</label>
                  <select
                    value={convTo}
                    onChange={(e) => setConvTo(e.target.value)}
                    className="w-full bg-coffee-800/60 border border-coffee-700/50 rounded-lg px-2 py-1.5 text-xs text-coffee-200 focus:outline-none focus:border-coffee-500 appearance-none"
                  >
                    {convGrinderOptions.map((g) => (
                      <option key={g} value={g}>{g.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Строка: input + результат */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-coffee-500 uppercase tracking-wider mb-1 block">Значение</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="\d*\.?\d*"
                    value={convValue}
                    onChange={(e) => setConvValue(e.target.value)}
                    placeholder="20"
                    className="w-full bg-coffee-800/60 border border-coffee-700/50 rounded-lg px-2 py-1.5 text-xs text-coffee-200 placeholder-coffee-600 focus:outline-none focus:border-coffee-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-coffee-500 uppercase tracking-wider mb-1 block">Результат</label>
                  <div className="w-full bg-coffee-900/60 border border-coffee-700/50 rounded-lg px-2 py-1.5 text-xs min-h-[34px] flex items-center">
                    {convLoading ? (
                      <span className="text-coffee-500">⏳</span>
                    ) : convResult ? (
                      <span className="text-coffee-100 font-medium">{convResult.to_value}</span>
                    ) : convError ? (
                      <span className="text-red-400">{convError}</span>
                    ) : (
                      <span className="text-coffee-600">—</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Кнопка смены местами */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setConvFrom(convTo)
                    setConvTo(convFrom)
                    setConvResult(null)
                    setConvError(null)
                  }}
                  className="text-[10px] text-coffee-500 hover:text-coffee-300 transition-colors flex items-center gap-1"
                >
                  ⇅ Поменять местами
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-coffee-300 font-medium mb-1 block">Кофе (гр) *</label>
            <input
              type="text"
              inputMode="decimal"
              pattern="\d*\.?\d*"
              value={form.dose}
              onChange={handleChange('dose')}
              placeholder="15"
              required
              className="w-full text-center"
            />
          </div>
          <div>
            <label className="text-xs text-coffee-300 font-medium mb-1 block">Вода (мл) *</label>
            <input
              type="text"
              inputMode="decimal"
              pattern="\d*\.?\d*"
              value={form.totalWater}
              onChange={handleChange('totalWater')}
              placeholder="250"
              required
              className="w-full text-center"
            />
          </div>
          <div>
            <label className="text-xs text-coffee-300 font-medium mb-1 block">Темп. (°C)</label>
            <input
              type="text"
              inputMode="decimal"
              pattern="\d*\.?\d*"
              value={form.waterTemp}
              onChange={handleChange('waterTemp')}
              placeholder="94"
              className="w-full text-center"
            />
          </div>
        </div>

        {/* TDS воды */}
        <div>
          <label className="text-xs text-coffee-300 font-medium mb-1 block">Минерализация воды (ppm)</label>
          <input
            type="text"
            inputMode="decimal"
            pattern="\d*\.?\d*"
            value={form.waterTds}
            onChange={handleChange('waterTds')}
            placeholder="50"
          />
        </div>

        {/* Общее время заваривания */}
        <div>
          <label className="text-xs text-coffee-300 font-medium mb-1 block">Общее время заваривания (MM:SS)</label>
          <input
            type="text"
            value={form.brewTime}
            onChange={handleChange('brewTime')}
            placeholder="3:30"
          />
        </div>
      </div>

      {/* СЕКЦИЯ 3: ШАГИ ВЛИВАНИЙ */}
      <div className="bg-coffee-900/40 backdrop-blur-sm border border-coffee-800/40 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-coffee-400 flex items-center gap-2">
            <span>⏳</span> Схема проливов
          </h3>
          <button
            type="button"
            onClick={addStep}
            className="text-xs font-medium text-coffee-300 hover:text-coffee-100 bg-coffee-800/60 px-2.5 py-1 rounded-lg border border-coffee-700/50 transition-all"
          >
            + Добавить шаг
          </button>
        </div>

        <div className="space-y-2">
          {form.pourSteps.map((step, i) => (
            <div key={i} className="bg-coffee-950/60 p-3 rounded-xl border border-coffee-800/30 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={step.time}
                  onChange={handleStepChange(i, 'time')}
                  placeholder="00:00"
                  className="w-20 !bg-transparent !p-1 !border-0 text-sm font-mono text-coffee-300 focus:!shadow-none"
                />
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="\d*\.?\d*"
                  value={step.volume}
                  onChange={handleStepChange(i, 'volume')}
                  placeholder="мл"
                  className="w-16 !bg-transparent !p-1 !border-0 text-sm focus:!shadow-none"
                />
                <select
                  value={step.action}
                  onChange={handleStepChange(i, 'action')}
                  className="flex-1 !bg-transparent !p-1 !border-0 text-sm focus:!shadow-none"
                >
                  <option value="bloom">Блум</option>
                  <option value="pour">Вливание</option>
                </select>
                {form.pourSteps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStep(i)}
                    className="text-coffee-700 hover:text-red-400 p-1 text-sm transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
              {/* Комментарий к шагу */}
              <input
                type="text"
                value={step.comment}
                onChange={handleStepChange(i, 'comment')}
                placeholder="Комментарий к шагу (необязательно)"
                className="!bg-transparent !p-1 !border-0 text-xs text-coffee-400 focus:!shadow-none"
              />
            </div>
          ))}
        </div>
      </div>

      {saveError && (
        <div className="text-red-400 text-sm text-center">{saveError}</div>
      )}

      {saved ? (
        <div className="text-center py-6 space-y-4 animate-fade-in">
          <div className="text-5xl">✅</div>
          <p className="text-coffee-cream font-medium">Рецепт сохранён!</p>
          <button
            type="button"
            onClick={handleNewAgain}
            className="px-6 py-2 rounded-lg bg-coffee-gold text-coffee-dark font-bold hover:bg-yellow-500 transition"
          >
            Создать ещё
          </button>
        </div>
      ) : (
        <>
          {/* ГЛАВНАЯ КНОПКА ЗАПУСКА */}
          <button
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-coffee-500 to-coffee-600 text-coffee-50 font-medium rounded-xl shadow-lg shadow-coffee-950/50 active:scale-[0.98] transition-all tracking-wide text-md"
          >
            Перейти к завариванию →
          </button>

          {/* КНОПКА СОХРАНЕНИЯ БЕЗ ЗАВАРИВАНИЯ */}
          <button
            type="button"
            onClick={handleSaveOnly}
            disabled={saving}
            className="w-full py-3 bg-coffee-800 hover:bg-coffee-700 border border-coffee-700/50 text-coffee-200 font-medium rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : '💾 Сохранить рецепт без заваривания'}
          </button>
        </>
      )}
    </form>
  )
}