import React, { useState, useEffect } from 'react'

const DRIPPERS = [
  'Hario V60',
  'Kalita Wave',
  'Chemex',
  'Origami',
  'Orea',
  'NextLevel Pulsar',
  'Hario Switch',
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

export default function NewRecipe({ onSave, initialData }) {
  const [form, setForm] = useState({
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
    pourSteps: [{ time: '', volume: '', action: 'bloom' }],
  })

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
        pourSteps: (initialData.pourSteps && initialData.pourSteps.length > 0)
          ? initialData.pourSteps.map((s) => ({
              time: s.time?.toString() || '',
              volume: s.volume?.toString() || '',
              action: s.action || 'pour',
            }))
          : [{ time: '', volume: '', action: 'bloom' }],
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
      pourSteps: [...prev.pourSteps, { time: '', volume: '', action: 'pour' }],
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

  const handleSubmit = (e) => {
    e.preventDefault()
    // Преобразуем время шагов: "45" → 45 (сек), "1:30" → 90 (сек)
    const steps = form.pourSteps
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
        }
      })
    onSave({
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
      pourSteps: steps,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-bold text-coffee-cream">Новый рецепт</h2>

      {/* Название рецепта */}
      <div>
        <label className="block text-sm font-medium text-coffee-latte mb-1">Название рецепта</label>
        <input
          type="text"
          value={form.name}
          onChange={handleChange('name')}
          placeholder="Например: Утренний V60"
          className="w-full px-3 py-2 rounded-lg bg-coffee-dark text-coffee-cream border border-coffee-brown focus:border-coffee-gold focus:outline-none"
        />
      </div>

      {/* Обжарщик */}
      <div>
        <label className="block text-sm font-medium text-coffee-latte mb-1">Обжарщик</label>
        <input
          type="text"
          value={form.roaster}
          onChange={handleChange('roaster')}
          placeholder="Название обжарщика"
          className="w-full px-3 py-2 rounded-lg bg-coffee-dark text-coffee-cream border border-coffee-brown focus:border-coffee-gold focus:outline-none"
        />
      </div>

      {/* Сорт зерна */}
      <div>
        <label className="block text-sm font-medium text-coffee-latte mb-1">Сорт зерна *</label>
        <input
          type="text"
          value={form.beanVariety}
          onChange={handleChange('beanVariety')}
          placeholder="Ethiopia Yirgacheffe"
          required
          className="w-full px-3 py-2 rounded-lg bg-coffee-dark text-coffee-cream border border-coffee-brown focus:border-coffee-gold focus:outline-none"
        />
      </div>

      {/* Обработка */}
      <div>
        <label className="block text-sm font-medium text-coffee-latte mb-1">Обработка</label>
        <input
          type="text"
          value={form.beanProcessing}
          onChange={handleChange('beanProcessing')}
          placeholder="мытая / натуральная / хани"
          className="w-full px-3 py-2 rounded-lg bg-coffee-dark text-coffee-cream border border-coffee-brown focus:border-coffee-gold focus:outline-none"
        />
      </div>

      {/* Доза */}
      <div>
        <label className="block text-sm font-medium text-coffee-latte mb-1">Доза (г) *</label>
        <input
          type="number"
          step="0.1"
          min="1"
          value={form.dose}
          onChange={handleChange('dose')}
          placeholder="15"
          required
          className="w-full px-3 py-2 rounded-lg bg-coffee-dark text-coffee-cream border border-coffee-brown focus:border-coffee-gold focus:outline-none"
        />
      </div>

      {/* Воронка */}
      <div>
        <label className="block text-sm font-medium text-coffee-latte mb-1">Воронка *</label>
        <select
          value={form.dripperType}
          onChange={handleChange('dripperType')}
          className="w-full px-3 py-2 rounded-lg bg-coffee-dark text-coffee-cream border border-coffee-brown focus:border-coffee-gold focus:outline-none"
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
            className="w-full mt-2 px-3 py-2 rounded-lg bg-coffee-dark text-coffee-cream border border-coffee-brown focus:border-coffee-gold focus:outline-none"
          />
        )}
      </div>

      {/* Кофемолка */}
      <div>
        <label className="block text-sm font-medium text-coffee-latte mb-1">Кофемолка</label>
        <select
          value={form.grinderModel}
          onChange={handleChange('grinderModel')}
          className="w-full px-3 py-2 rounded-lg bg-coffee-dark text-coffee-cream border border-coffee-brown focus:border-coffee-gold focus:outline-none"
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
            className="w-full mt-2 px-3 py-2 rounded-lg bg-coffee-dark text-coffee-cream border border-coffee-brown focus:border-coffee-gold focus:outline-none"
          />
        )}
      </div>

      {/* Помол */}
      <div>
        <label className="block text-sm font-medium text-coffee-latte mb-1">Помол (клик / номер)</label>
        <input
          type="text"
          value={form.grindSetting}
          onChange={handleChange('grindSetting')}
          placeholder="22 клика"
          className="w-full px-3 py-2 rounded-lg bg-coffee-dark text-coffee-cream border border-coffee-brown focus:border-coffee-gold focus:outline-none"
        />
      </div>

      {/* Общая вода */}
      <div>
        <label className="block text-sm font-medium text-coffee-latte mb-1">Общий объём воды (мл) *</label>
        <input
          type="number"
          step="1"
          min="1"
          value={form.totalWater}
          onChange={handleChange('totalWater')}
          placeholder="250"
          required
          className="w-full px-3 py-2 rounded-lg bg-coffee-dark text-coffee-cream border border-coffee-brown focus:border-coffee-gold focus:outline-none"
        />
      </div>

      {/* Температура воды */}
      <div>
        <label className="block text-sm font-medium text-coffee-latte mb-1">Температура воды (°C)</label>
        <input
          type="number"
          step="0.5"
          value={form.waterTemp}
          onChange={handleChange('waterTemp')}
          placeholder="92"
          className="w-full px-3 py-2 rounded-lg bg-coffee-dark text-coffee-cream border border-coffee-brown focus:border-coffee-gold focus:outline-none"
        />
      </div>

      {/* TDS воды */}
      <div>
        <label className="block text-sm font-medium text-coffee-latte mb-1">Минерализация воды (ppm)</label>
        <input
          type="number"
          step="1"
          value={form.waterTds}
          onChange={handleChange('waterTds')}
          placeholder="50"
          className="w-full px-3 py-2 rounded-lg bg-coffee-dark text-coffee-cream border border-coffee-brown focus:border-coffee-gold focus:outline-none"
        />
      </div>

      {/* Шаги пролива */}
      <div>
        <label className="block text-sm font-medium text-coffee-latte mb-2">Шаги пролива</label>
        {form.pourSteps.map((step, i) => (
          <div key={i} className="flex gap-2 mb-2 items-end">
            <div className="flex-1">
              <input
                type="text"
                value={step.time}
                onChange={handleStepChange(i, 'time')}
                placeholder="Время: 45 или 1:30"
                className="w-full px-3 py-2 rounded-lg bg-coffee-dark text-coffee-cream border border-coffee-brown focus:border-coffee-gold focus:outline-none text-sm"
              />
            </div>
            <div className="w-20">
              <input
                type="number"
                value={step.volume}
                onChange={handleStepChange(i, 'volume')}
                placeholder="мл"
                min="1"
                className="w-full px-2 py-2 rounded-lg bg-coffee-dark text-coffee-cream border border-coffee-brown focus:border-coffee-gold focus:outline-none text-sm"
              />
            </div>
            <div className="w-24">
              <select
                value={step.action}
                onChange={handleStepChange(i, 'action')}
                className="w-full px-2 py-2 rounded-lg bg-coffee-dark text-coffee-cream border border-coffee-brown focus:border-coffee-gold focus:outline-none text-sm"
              >
                <option value="bloom">Блум</option>
                <option value="pour">Вливание</option>
              </select>
            </div>
            {form.pourSteps.length > 1 && (
              <button
                type="button"
                onClick={() => removeStep(i)}
                className="px-2 py-2 text-red-400 hover:text-red-300 text-lg"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addStep}
          className="text-coffee-gold hover:text-yellow-400 text-sm"
        >
          + Добавить шаг
        </button>
      </div>

      <button
        type="submit"
        className="w-full py-3 rounded-lg bg-coffee-gold text-coffee-dark font-bold hover:bg-yellow-500 transition"
      >
        Начать заваривание
      </button>
    </form>
  )
}