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

  const currentStepIndex = steps.findLastIndex((s) => s.time <= time)
  const currentStep = steps[currentStepIndex]
  const nextStep = steps[currentStepIndex + 1]

  const displayBrewTime = recipe?.brewTime || (steps.length > 0 ? steps[steps.length - 1].time : 0)
  const brewTotalMinutes = Math.floor(displayBrewTime / 60)
  const brewTotalSeconds = displayBrewTime % 60
  const brewTotalStr = brewTotalMinutes > 0
    ? `${brewTotalMinutes} мин ${brewTotalSeconds} сек`
    : `${displayBrewTime} сек`

  const pouredVolume = steps
    .filter((s) => s.time <= time)
    .reduce((sum, s) => sum + (s.volume || 0), 0)

  return (
    <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-8 py-4 animate-fade-in">
      <div className="text-center">
        <span className="text-xs uppercase tracking-widest text-tech-secondary font-semibold bg-tech-surface px-3 py-1 rounded-full border border-tech-border">
          {recipe?.dripperType || 'Hario V60'}
        </span>
        <h2 className="text-lg font-heading font-medium text-tech-primary mt-2">
          {recipe?.beanVariety || 'Свежий кофе'}
        </h2>
        {steps.length > 0 && (
          <div className="text-xs text-tech-secondary mt-1">
            Общее время: <span className="text-tech-primary font-medium">{brewTotalStr}</span>
          </div>
        )}
      </div>

      <div
        onClick={finished ? undefined : (running ? handlePause : handleStart)}
        className="relative w-64 h-64 flex flex-col items-center justify-center rounded-full bg-tech-surface border border-tech-border shadow-2xl cursor-pointer active:scale-[0.97] transition-transform select-none"
      >
        {running && (
          <div className="absolute inset-0 rounded-full bg-tech-accent/5 animate-ping pointer-events-none" />
        )}
        <span className="text-6xl font-light tracking-tight text-tech-primary font-mono">
          {formatTime(time)}
        </span>
        <span className="text-xs uppercase tracking-widest text-tech-secondary font-medium mt-2">
          {!running && !finished && time === 0 && 'Тапните, чтобы начать'}
          {!running && !finished && time > 0 && 'Тапните, чтобы продолжить'}
          {running && (pouredVolume > 0 ? `Влито: ${pouredVolume} / ${recipe?.totalWater || 0} мл` : 'Варим...')}
          {finished && 'Готово!'}
        </span>
      </div>

      {currentStep && !finished && (
        <div className="w-full bg-tech-surface border border-tech-accent/30 rounded-2xl p-6 text-center shadow-lg shadow-black/40">
          <span className="text-[10px] uppercase tracking-widest font-bold text-tech-secondary bg-tech-accent/10 border border-tech-accent/20 px-2.5 py-0.5 rounded-md">
            Текущий шаг
          </span>
          <p className="text-xl font-medium text-tech-primary mt-3">
            {currentStep.action === 'bloom' ? 'Блум' : 'Вливание'}
            {currentStep.volume ? `: ${currentStep.volume} мл` : ''}
          </p>
          {currentStep.comment && (
            <p className="text-xs text-tech-secondary italic mt-1">{currentStep.comment}</p>
          )}
          {nextStep && (
            <p className="text-xs text-tech-secondary font-mono mt-1">
              до {formatTime(nextStep.time)}
            </p>
          )}
        </div>
      )}

      {nextStep && !finished && (
        <div className="w-full flex items-center justify-between px-5 py-3.5 bg-tech-surface/50 border border-tech-border rounded-xl opacity-60">
          <span className="text-xs text-tech-secondary font-medium">Далее:</span>
          <span className="text-sm font-medium text-tech-primary">
            {nextStep.action === 'bloom' ? 'Блум' : 'Вливание'}
            {nextStep.volume ? ` (${nextStep.volume} мл)` : ''}
          </span>
          <span className="text-xs font-mono text-tech-secondary">{formatTime(nextStep.time)}</span>
        </div>
      )}

      {steps.length > 0 && !finished && (
        <div className="w-full space-y-1">
          <div className="text-xs text-tech-secondary mb-2">Все шаги</div>
          {steps.map((step, i) => (
            <div
              key={i}
              className={`text-sm px-3 py-1.5 rounded ${
                i === currentStepIndex
                  ? 'bg-tech-accent/20 text-tech-primary'
                  : i < currentStepIndex
                  ? 'text-tech-secondary/50 line-through'
                  : 'text-tech-secondary'
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

      <div className="w-full space-y-3">
        {!running && !finished && (
          <button
            onClick={handleStart}
            className="w-full py-4 bg-tech-accent text-black font-bold rounded-xl shadow-md shadow-black/50 transition-all active:scale-[0.98]"
          >
            ▶ Старт
          </button>
        )}
        {running && (
          <button
            onClick={handlePause}
            className="w-full py-4 bg-tech-surface hover:brightness-125 border border-tech-border text-tech-primary font-medium rounded-xl transition-all active:scale-95"
          >
            ⏸ Пауза
          </button>
        )}
        {!running && time > 0 && !finished && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleStart}
              className="py-4 bg-tech-accent text-black font-bold rounded-xl shadow-md shadow-black/50 transition-all active:scale-[0.98]"
            >
              ▶ Продолжить
            </button>
            <button
              onClick={handleReset}
              className="py-4 bg-tech-surface hover:brightness-125 border border-tech-border text-tech-primary font-medium rounded-xl transition-all active:scale-95"
            >
              ↺ Сброс
            </button>
          </div>
        )}

        {finished && (
          <div className="space-y-3">
            <div className="text-center text-tech-primary text-lg">
              🎉 Заваривание завершено!
            </div>
            <button
              onClick={handleFinish}
              className="w-full py-4 bg-tech-accent text-black font-bold rounded-xl shadow-md shadow-black/50 transition-all active:scale-[0.98]"
            >
              Далее: ввести замеры →
            </button>
          </div>
        )}

        {!running && !finished && (
          <button
            onClick={onNewRecipe}
            className="w-full text-sm text-tech-secondary hover:text-tech-primary transition-colors text-center"
          >
            ← Новый рецепт
          </button>
        )}
      </div>
    </div>
  )
}