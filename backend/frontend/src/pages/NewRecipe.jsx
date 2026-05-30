import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { saveRecipe, updateRecipe } from '../api'

const DRIPPERS = [
  'Batch Brew',
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
  batchVolume: '',
  brewRatio: '16.5',
  pourSteps: [{ time: '', volume: '', action: 'bloom', comment: '' }],
}

export default function NewRecipe({ onSave, initialData, spotId, onUpdate }) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const isEditing = !!initialData?.id
  const isBatchBrew = form.dripperType === 'Batch Brew'

  const batchCalc = useMemo(() => {
    if (!isBatchBrew) return null
    const vol = parseFloat((form.batchVolume || '').replace(',', '.'))
    const ratio = parseFloat((form.brewRatio || '').replace(',', '.'))
    if (!vol || vol <= 0 || !ratio || ratio <= 0) return null
    const coffeeWeight = +(vol / ratio).toFixed(1)
    const waterInTank = Math.round(vol + coffeeWeight * 2)
    return { coffeeWeight, waterInTank, batchVolume: vol, brewRatio: ratio }
  }, [form.batchVolume, form.brewRatio, isBatchBrew])

  const computedRatio = useMemo(() => {
    if (isBatchBrew) return null
    const dose = parseFloat((form.dose || '').replace(',', '.'))
    const water = parseFloat((form.totalWater || '').replace(',', '.'))
    if (!dose || dose <= 0 || !water || water <= 0) return null
    return +(water / dose).toFixed(1)
  }, [form.dose, form.totalWater, isBatchBrew])

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
        batchVolume: initialData.batchVolume?.toString() || '',
        brewRatio: initialData.brewRatio?.toString() || '16.5',
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
    let dose = parseFloat((form.dose || '').replace(',', '.'))
    let totalWater = parseFloat((form.totalWater || '').replace(',', '.'))

    if (isBatchBrew && batchCalc) {
      dose = batchCalc.coffeeWeight
      totalWater = batchCalc.waterInTank
    }

    const data = {
      name: form.name || undefined,
      roaster: form.roaster || undefined,
      beanVariety: form.beanVariety,
      beanProcessing: form.beanProcessing || undefined,
      dose,
      dripperType: getDripperValue(),
      grinderModel: getGrinderValue() || undefined,
      grindSetting: form.grindSetting || undefined,
      totalWater,
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
      if (isEditing && initialData?.id) {
        await updateRecipe(initialData.id, recipeData)
      } else {
        await saveRecipe(recipeData)
      }
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
    if (isEditing && onUpdate) {
      onUpdate(recipeData)
    } else {
      onSave(recipeData)
    }
  }

  const handleNewAgain = () => {
    setForm(INITIAL_FORM)
    setSaved(false)
    setSaveError(null)
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-6 pb-12 animate-fade-in">
      {/* СЕКЦИЯ 1: ЗЕРНО */}
      <div className="card p-5 space-y-4">
        <h3 className="text-xs font-heading font-semibold uppercase tracking-wider text-tech-secondary flex items-center gap-2">
          <span>🌿</span> Профиль зерна
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-tech-primary font-medium mb-1 block">Название рецепта</label>
            <input
              type="text"
              value={form.name}
              onChange={handleChange('name')}
              placeholder="V60"
            />
          </div>
          <div>
            <label className="text-xs text-tech-primary font-medium mb-1 block">Обжарщик</label>
            <input
              type="text"
              value={form.roaster}
              onChange={handleChange('roaster')}
              placeholder="Tasty Coffee"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-tech-primary font-medium mb-1 block">Сорт / Регион *</label>
              <input
                type="text"
                value={form.beanVariety}
                onChange={handleChange('beanVariety')}
                placeholder="Ethiopia Yirgacheffe"
                required
              />
            </div>
            <div>
              <label className="text-xs text-tech-primary font-medium mb-1 block">Обработка</label>
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
      <div className="card p-5 space-y-4">
        <h3 className="text-xs font-heading font-semibold uppercase tracking-wider text-tech-secondary flex items-center gap-2">
          <span>⚙️</span> Параметры экстракции
        </h3>

        <div>
          <label className="text-xs text-tech-primary font-medium mb-2 block">Тип девайса *</label>
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
            <label className="text-xs text-tech-primary font-medium mb-1 block">Кофемолка</label>
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
            <label className="text-xs text-tech-primary font-medium mb-1 block">Помол (клики)</label>
            <input
              type="text"
              value={form.grindSetting}
              onChange={handleChange('grindSetting')}
              placeholder="24 clicks"
            />
          </div>
        </div>

        {isBatchBrew ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-tech-primary font-medium mb-1 block">
                Коэффициент заваривания (Brew Ratio)
              </label>
              <input
                type="text"
                inputMode="decimal"
                pattern="\d*\.?\d*"
                value={form.brewRatio}
                onChange={handleChange('brewRatio')}
                placeholder="16.5"
                className="w-full text-center"
              />
            </div>
            <div>
              <label className="text-xs text-tech-primary font-medium mb-1 block">
                Желаемый объём готового кофе (мл) *
              </label>
              <input
                type="text"
                inputMode="decimal"
                pattern="\d*\.?\d*"
                value={form.batchVolume}
                onChange={handleChange('batchVolume')}
                placeholder="1000"
                required
                className="w-full text-center"
              />
            </div>

            {batchCalc && (
              <div className="grid grid-cols-2 gap-3">
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-tech-accent font-mono">{batchCalc.coffeeWeight}</div>
                  <div className="text-xs text-tech-secondary mt-1">Вес кофе (г)</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-tech-accent font-mono">{batchCalc.waterInTank}</div>
                  <div className="text-xs text-tech-secondary mt-1">Вода в бак (мл)</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-lg font-bold text-tech-primary font-mono">1 : {batchCalc.brewRatio}</div>
                  <div className="text-xs text-tech-secondary mt-1">Brew Ratio</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-lg font-bold text-tech-primary font-mono">{batchCalc.batchVolume} мл</div>
                  <div className="text-xs text-tech-secondary mt-1">На выходе</div>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs text-tech-primary font-medium mb-1 block">Темп. (°C)</label>
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
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-tech-primary font-medium mb-1 block">Кофе (гр) *</label>
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
              <label className="text-xs text-tech-primary font-medium mb-1 block">Вода (мл) *</label>
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
              <label className="text-xs text-tech-primary font-medium mb-1 block">Темп. (°C)</label>
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
            {computedRatio && (
              <div className="card p-3 text-center flex flex-col items-center justify-center">
                <div className="text-lg font-bold text-tech-accent font-mono">1 : {computedRatio}</div>
                <div className="text-xs text-tech-secondary mt-0.5">Brew Ratio</div>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="text-xs text-tech-primary font-medium mb-1 block">Минерализация воды (ppm)</label>
          <input
            type="text"
            inputMode="decimal"
            pattern="\d*\.?\d*"
            value={form.waterTds}
            onChange={handleChange('waterTds')}
            placeholder="50"
          />
        </div>

        <div>
          <label className="text-xs text-tech-primary font-medium mb-1 block">Общее время заваривания (MM:SS)</label>
          <input
            type="text"
            value={form.brewTime}
            onChange={handleChange('brewTime')}
            placeholder="3:30"
          />
        </div>
      </div>

      {/* СЕКЦИЯ 3: ШАГИ ВЛИВАНИЙ */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-heading font-semibold uppercase tracking-wider text-tech-secondary flex items-center gap-2">
            <span>⏳</span> Схема проливов
          </h3>
          <button
            type="button"
            onClick={addStep}
            className="text-xs font-medium text-tech-primary bg-tech-surface border-tech-border px-2.5 py-1 rounded-lg border transition-all hover:brightness-125"
          >
            + Добавить шаг
          </button>
        </div>

        <div className="space-y-2">
          {form.pourSteps.map((step, i) => (
            <div key={i} className="bg-black/60 p-3 rounded-xl border border-tech-border space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={step.time}
                  onChange={handleStepChange(i, 'time')}
                  placeholder="00:00"
                  className="w-20 !bg-transparent !p-1 !border-0 text-sm font-mono text-tech-primary focus:!shadow-none"
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
                    className="text-tech-secondary/30 hover:text-red-400 p-1 text-sm transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
              <input
                type="text"
                value={step.comment}
                onChange={handleStepChange(i, 'comment')}
                placeholder="Комментарий к шагу (необязательно)"
                className="!bg-transparent !p-1 !border-0 text-xs text-tech-secondary focus:!shadow-none"
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
          <p className="text-tech-primary font-medium">Рецепт сохранён!</p>
          <button
            type="button"
            onClick={handleNewAgain}
            className="px-6 py-2 rounded-xl bg-tech-accent text-black font-bold hover:brightness-110 transition"
          >
            Создать ещё
          </button>
        </div>
      ) : (
        <>
          <button
            type="submit"
            className="w-full py-4 bg-tech-accent text-black font-bold rounded-xl shadow-lg shadow-tech-accent/10 active:scale-[0.98] transition-all tracking-wide text-md"
          >
            Перейти к завариванию →
          </button>

          <button
            type="button"
            onClick={handleSaveOnly}
            disabled={saving}
            className="w-full py-3 bg-tech-surface hover:brightness-125 border border-tech-border text-tech-primary font-medium rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : '💾 Сохранить рецепт без заваривания'}
          </button>
        </>
      )}
    </form>
  )
}