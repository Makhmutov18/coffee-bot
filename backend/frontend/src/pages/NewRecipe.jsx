import React, { useState } from 'react'

const DRIPPERS = [
  { value: 'V60', label: 'Hario V60' },
  { value: 'Switch', label: 'Hario Switch' },
]

const INITIAL_STEP = { time: '', volume: '', action: 'Вливание' }

export default function NewRecipe({ onSave }) {
  const [form, setForm] = useState({
    beanVariety: '',
    beanProcessing: '',
    dose: '',
    dripperType: 'V60',
    grinderModel: '',
    grindSetting: '',
    totalWater: '',
    waterTemp: '',
    waterTds: '',
    pourSteps: [{ ...INITIAL_STEP }],
  })

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleStepChange = (index, field) => (e) => {
    const steps = [...form.pourSteps]
    steps[index] = { ...steps[index], [field]: e.target.value }
    setForm((prev) => ({ ...prev, pourSteps: steps }))
  }

  const addStep = () => {
    setForm((prev) => ({
      ...prev,
      pourSteps: [...prev.pourSteps, { ...INITIAL_STEP }],
    }))
  }

  const removeStep = (index) => {
    if (form.pourSteps.length <= 1) return
    setForm((prev) => ({
      ...prev,
      pourSteps: prev.pourSteps.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const steps = form.pourSteps
      .filter((s) => s.time && s.volume)
      .map((s) => ({
        time: Number(s.time),
        volume: Number(s.volume),
        action: s.action,
      }))

    onSave({
      ...form,
      dose: Number(form.dose),
      totalWater: Number(form.totalWater),
      waterTemp: form.waterTemp ? Number(form.waterTemp) : null,
      waterTds: form.waterTds ? Number(form.waterTds) : null,
      pourSteps: steps,
    })
  }

  const isValid =
    form.beanVariety && form.dose && form.totalWater

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold text-coffee-200 mb-4">
        Новый рецепт
      </h2>

      {/* Сорт зерна */}
      <div>
        <label className="block text-sm text-coffee-400 mb-1">Сорт зерна *</label>
        <input
          type="text"
          value={form.beanVariety}
          onChange={handleChange('beanVariety')}
          placeholder="Например: Ethiopia Yirgacheffe"
        />
      </div>

      {/* Обработка */}
      <div>
        <label className="block text-sm text-coffee-400 mb-1">Обработка</label>
        <input
          type="text"
          value={form.beanProcessing}
          onChange={handleChange('beanProcessing')}
          placeholder="Мытая / натуральная / хани"
        />
      </div>

      {/* Вес кофе и тип воронки */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-coffee-400 mb-1">Вес кофе (г) *</label>
          <input
            type="number"
            step="0.1"
            value={form.dose}
            onChange={handleChange('dose')}
            placeholder="15"
          />
        </div>
        <div>
          <label className="block text-sm text-coffee-400 mb-1">Воронка *</label>
          <select value={form.dripperType} onChange={handleChange('dripperType')}>
            {DRIPPERS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Кофемолка */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-coffee-400 mb-1">Кофемолка</label>
          <input
            type="text"
            value={form.grinderModel}
            onChange={handleChange('grinderModel')}
            placeholder="Comandante C40"
          />
        </div>
        <div>
          <label className="block text-sm text-coffee-400 mb-1">Помол</label>
          <input
            type="text"
            value={form.grindSetting}
            onChange={handleChange('grindSetting')}
            placeholder="22 клика"
          />
        </div>
      </div>

      {/* Вода */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm text-coffee-400 mb-1">Вода (мл) *</label>
          <input
            type="number"
            step="1"
            value={form.totalWater}
            onChange={handleChange('totalWater')}
            placeholder="250"
          />
        </div>
        <div>
          <label className="block text-sm text-coffee-400 mb-1">T°C</label>
          <input
            type="number"
            step="0.5"
            value={form.waterTemp}
            onChange={handleChange('waterTemp')}
            placeholder="92"
          />
        </div>
        <div>
          <label className="block text-sm text-coffee-400 mb-1">PPM</label>
          <input
            type="number"
            step="1"
            value={form.waterTds}
            onChange={handleChange('waterTds')}
            placeholder="50"
          />
        </div>
      </div>

      {/* Шаги пролива */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-coffee-400">Шаги пролива</label>
          <button
            type="button"
            onClick={addStep}
            className="text-xs px-3 py-1 bg-coffee-700 text-coffee-200 rounded-full hover:bg-coffee-600 transition-colors"
          >
            + Добавить шаг
          </button>
        </div>

        <div className="space-y-2">
          {form.pourSteps.map((step, i) => (
            <div key={i} className="flex gap-2 items-end bg-coffee-900 p-2 rounded-lg">
              <div className="flex-1">
                <label className="block text-xs text-coffee-500 mb-0.5">Время (с)</label>
                <input
                  type="number"
                  step="1"
                  value={step.time}
                  onChange={handleStepChange(i, 'time')}
                  placeholder="0"
                  className="text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-coffee-500 mb-0.5">Объём (мл)</label>
                <input
                  type="number"
                  step="1"
                  value={step.volume}
                  onChange={handleStepChange(i, 'volume')}
                  placeholder="50"
                  className="text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-coffee-500 mb-0.5">Действие</label>
                <input
                  type="text"
                  value={step.action}
                  onChange={handleStepChange(i, 'action')}
                  placeholder="Bloom"
                  className="text-sm"
                />
              </div>
              {form.pourSteps.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeStep(i)}
                  className="text-coffee-500 hover:text-red-400 text-lg pb-1"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!isValid}
        className="w-full py-3 bg-coffee-600 text-coffee-100 rounded-xl font-medium
          hover:bg-coffee-500 transition-colors disabled:opacity-40"
      >
        Начать заваривание →
      </button>
    </form>
  )
}