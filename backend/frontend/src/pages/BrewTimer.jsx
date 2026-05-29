import React, { useState, useEffect, useRef, useCallback } from 'react'

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function BrewTimer({ recipe, onComplete, onNewRecipe }) {
  const [time, setTime] = useState(0)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const intervalRef = useRef(null)

  const steps = recipe?.pourSteps || []
  const totalTime = recipe?.brewTime
    || (steps.length > 0 ? Math.max(...steps.map((s) => s.time)) + 30 : 180)

  // Timer logic
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTime((t) => {
          if (t >= totalTime) {
            clearInterval(intervalRef.current)
            setRunning(false)
            setFinished(true)
            return totalTime
          }
          return t + 1
        })
      }, 1000)
    }
    return () => clearInterval(intervalRef.current)
  }, [running, totalTime])

  const handleStart = () => setRunning(true)
  const handlePause = () => setRunning(false)
  const handleReset = () => {
    setRunning(false)
    setTime(0)
    setFinished(false)
  }

  const handleFinish = useCallback(() => {
    onComplete({ brewTime: time })
  }, [time, onComplete])

  // Find current step
  const currentStepIndex = steps.findLastIndex((s) => s.time <= time)
  const currentStep = steps[currentStepIndex]
  const nextStep = steps[currentStepIndex + 1]

  // Calculate total brew time from recipe.brewTime or last step
  const displayBrewTime = recipe?.brewTime || (steps.length > 0 ? steps[steps.length - 1].time : 0)
  const brewTotalMinutes = Math.floor(displayBrewTime / 60)
  const brewTotalSeconds = displayBrewTime % 60
  const brewTotalStr = brewTotalMinutes > 0
    ? `${brewTotalMinutes} мин ${brewTotalSeconds} сек`
    : `${displayBrewTime} сек`

  // Calculate total poured volume so far
  const pouredVolume = steps
    .filter((s) => s.time <= time)
    .reduce((sum, s) => sum + (s.volume || 0), 0)

  return (
    <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-8 py-4 animate-fade-in">
      {/* Информация о зерне во время варки */}
      <div className="text-center">
        <span className="text-xs uppercase tracking-widest text-coffee-500 font-semibold bg-coffee-900/50 px-3 py-1 rounded-full border border-coffee-800/30">
          {recipe?.dripperType || 'Hario V60'}
        </span>
        <h2 className="text-lg font-medium text-coffee-200 mt-2">
          {recipe?.beanVariety || 'Свежий кофе'}
        </h2>
        {steps.length > 0 && (
          <div className="text-xs text-coffee-500 mt-1">
            Общее время: <span className="text-coffee-300 font-medium">{brewTotalStr}</span>
          </div>
        )}
      </div>

      {/* ГИГАНТСКИЙ ТАЙМЕР */}
      <div className="relative w-64 h-64 flex flex-col items-center justify-center rounded-full bg-gradient-to-b from-coffee-900/30 to-coffee-950 border border-coffee-800/40 shadow-2xl">
        {running && (
          <div className="absolute inset-0 rounded-full bg-coffee-500/5 animate-ping pointer-events-none" />
        )}
        <span className="text-6xl font-light tracking-tight text-coffee-100 font-mono">
          {formatTime(time)}
        </span>
        <span className="text-xs uppercase tracking-widest text-coffee-400 font-medium mt-2">
          {pouredVolume > 0 ? `Влито: ${pouredVolume} / ${recipe?.totalWater || 0} мл` : 'Ожидание...'}
        </span>
      </div>

      {/* ТЕКУЩИЙ АКТИВНЫЙ ШАГ */}
      {currentStep && !finished && (
        <div className="w-full bg-gradient-to-r from-coffee-900/80 to-coffee-800/40 backdrop-blur-md border border-coffee-500/30 rounded-2xl p-6 text-center shadow-lg shadow-coffee-950/40">
          <span className="text-[10px] uppercase tracking-widest font-bold text-coffee-400 bg-coffee-500/10 border border-coffee-500/20 px-2.5 py-0.5 rounded-md">
            Текущий шаг
          </span>
          <p className="text-xl font-medium text-coffee-100 mt-3">
            {currentStep.action === 'bloom' ? 'Блум' : 'Вливание'}
            {currentStep.volume ? `: ${currentStep.volume} мл` : ''}
          </p>
          {currentStep.comment && (
            <p className="text-xs text-coffee-400 italic mt-1">{currentStep.comment}</p>
          )}
          {nextStep && (
            <p className="text-xs text-coffee-500 font-mono mt-1">
              до {formatTime(nextStep.time)}
            </p>
          )}
        </div>
      )}

      {/* СЛЕДУЮЩИЙ ШАГ */}
      {nextStep && !finished && (
        <div className="w-full flex items-center justify-between px-5 py-3.5 bg-coffee-900/20 border border-coffee-800/30 rounded-xl opacity-60">
          <span className="text-xs text-coffee-400 font-medium">Далее:</span>
          <span className="text-sm font-medium text-coffee-200">
            {nextStep.action === 'bloom' ? 'Блум' : 'Вливание'}
            {nextStep.volume ? ` (${nextStep.volume} мл)` : ''}
          </span>
          <span className="text-xs font-mono text-coffee-400">{formatTime(nextStep.time)}</span>
        </div>
      )}

      {/* Steps Timeline */}
      {steps.length > 0 && !finished && (
        <div className="w-full space-y-1">
          <div className="text-xs text-coffee-500 mb-2">Все шаги</div>
          {steps.map((step, i) => (
            <div
              key={i}
              className={`text-sm px-3 py-1.5 rounded ${
                i === currentStepIndex
                  ? 'bg-coffee-700 text-coffee-100'
                  : i < currentStepIndex
                  ? 'text-coffee-500 line-through'
                  : 'text-coffee-400'
              }`}
            >
              <div className="flex justify-between">
                <span>{step.action === 'bloom' ? 'Блум' : 'Вливание'}</span>
                <span className="font-mono">
                  {formatTime(step.time)}
                  {step.volume ? ` — ${step.volume}мл` : ''}
                </span>
              </div>
              {step.comment && (
                <div className="text-xs opacity-70 mt-0.5">{step.comment}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* КНОПКИ УПРАВЛЕНИЯ */}
      <div className="w-full space-y-3">
        {!running && !finished && (
          <button
            onClick={handleStart}
            className="w-full py-4 bg-gradient-to-r from-coffee-500 to-coffee-600 text-coffee-50 font-medium rounded-xl shadow-md shadow-coffee-900 transition-all active:scale-[0.98]"
          >
            ▶ Старт
          </button>
        )}
        {running && (
          <button
            onClick={handlePause}
            className="w-full py-4 bg-coffee-900 hover:bg-coffee-800 border border-coffee-700/50 text-coffee-300 font-medium rounded-xl transition-all active:scale-95"
          >
            ⏸ Пауза
          </button>
        )}
        {!running && time > 0 && !finished && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleStart}
              className="py-4 bg-gradient-to-r from-coffee-500 to-coffee-600 text-coffee-50 font-medium rounded-xl shadow-md shadow-coffee-900 transition-all active:scale-[0.98]"
            >
              ▶ Продолжить
            </button>
            <button
              onClick={handleReset}
              className="py-4 bg-coffee-900 hover:bg-coffee-800 border border-coffee-700/50 text-coffee-300 font-medium rounded-xl transition-all active:scale-95"
            >
              ↺ Сброс
            </button>
          </div>
        )}

        {/* Finish */}
        {finished && (
          <div className="space-y-3">
            <div className="text-center text-coffee-300 text-lg">
              🎉 Заваривание завершено!
            </div>
            <button
              onClick={handleFinish}
              className="w-full py-4 bg-gradient-to-r from-coffee-500 to-coffee-600 text-coffee-50 font-medium rounded-xl shadow-md shadow-coffee-900 transition-all active:scale-[0.98]"
            >
              Далее: ввести замеры →
            </button>
          </div>
        )}

        {/* New Recipe */}
        {!running && !finished && (
          <button
            onClick={onNewRecipe}
            className="w-full text-sm text-coffee-500 hover:text-coffee-400 transition-colors text-center"
          >
            ← Новый рецепт
          </button>
        )}
      </div>
    </div>
  )
}