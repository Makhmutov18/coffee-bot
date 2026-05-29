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
  const totalTime = steps.length > 0
    ? Math.max(...steps.map((s) => s.time)) + 30
    : 180

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

  // Calculate total brew time from last step
  const lastStepTime = steps.length > 0 ? steps[steps.length - 1].time : 0
  const brewTotalMinutes = Math.floor(lastStepTime / 60)
  const brewTotalSeconds = lastStepTime % 60
  const brewTotalStr = brewTotalMinutes > 0
    ? `${brewTotalMinutes} мин ${brewTotalSeconds} сек`
    : `${lastStepTime} сек`

  return (
    <div className="flex flex-col items-center space-y-6">
      <h2 className="text-lg font-semibold text-coffee-200">
        {recipe ? `${recipe.beanVariety}` : 'Заваривание'}
      </h2>

      {/* Total brew time */}
      {steps.length > 0 && (
        <div className="text-sm text-coffee-500">
          Общее время заваривания: <span className="text-coffee-300 font-medium">{brewTotalStr}</span>
        </div>
      )}

      {/* Timer Display */}
      <div className="text-6xl font-mono font-bold text-coffee-100 tracking-wider my-4">
        {formatTime(time)}
      </div>

      {/* Current Step Info */}
      {currentStep && !finished && (
        <div className="w-full bg-coffee-900 rounded-xl p-4 border border-coffee-700">
          <div className="text-sm text-coffee-400 mb-1">Текущий шаг</div>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-lg font-semibold text-coffee-200">
                {currentStep.action === 'bloom' ? 'Блум' : 'Вливание'}
              </div>
              <div className="text-sm text-coffee-400">
                {currentStep.volume ? `${currentStep.volume} мл` : ''}
              </div>
              {currentStep.comment && (
                <div className="text-xs text-coffee-500 mt-1 italic">
                  {currentStep.comment}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm text-coffee-500">Время</div>
              <div className="text-lg font-mono text-coffee-300">
                {formatTime(currentStep.time)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Next Step Preview */}
      {nextStep && !finished && (
        <div className="w-full bg-coffee-900/50 rounded-xl p-3 border border-coffee-800">
          <div className="text-xs text-coffee-500 mb-1">Следующий</div>
          <div className="flex justify-between text-sm">
            <span className="text-coffee-400">
              {nextStep.action === 'bloom' ? 'Блум' : 'Вливание'}
              {nextStep.volume ? ` — ${nextStep.volume} мл` : ''}
            </span>
            <span className="text-coffee-500 font-mono">{formatTime(nextStep.time)}</span>
          </div>
          {nextStep.comment && (
            <div className="text-xs text-coffee-600 mt-1 italic">{nextStep.comment}</div>
          )}
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

      {/* Controls */}
      <div className="flex gap-3 w-full">
        {!running && !finished && (
          <button
            onClick={handleStart}
            className="flex-1 py-4 bg-coffee-600 text-coffee-100 rounded-xl font-semibold text-lg
              hover:bg-coffee-500 transition-colors"
          >
            ▶ Старт
          </button>
        )}
        {running && (
          <button
            onClick={handlePause}
            className="flex-1 py-4 bg-coffee-700 text-coffee-200 rounded-xl font-semibold text-lg
              hover:bg-coffee-600 transition-colors"
          >
            ⏸ Пауза
          </button>
        )}
        {!running && time > 0 && !finished && (
          <>
            <button
              onClick={handleStart}
              className="flex-1 py-4 bg-coffee-600 text-coffee-100 rounded-xl font-semibold
                hover:bg-coffee-500 transition-colors"
            >
              ▶ Продолжить
            </button>
            <button
              onClick={handleReset}
              className="py-4 px-6 bg-coffee-800 text-coffee-400 rounded-xl
                hover:bg-coffee-700 transition-colors"
            >
              ↺
            </button>
          </>
        )}
      </div>

      {/* Finish Button */}
      {finished && (
        <div className="w-full space-y-3">
          <div className="text-center text-coffee-300 text-lg">
            🎉 Заваривание завершено!
          </div>
          <button
            onClick={handleFinish}
            className="w-full py-4 bg-coffee-600 text-coffee-100 rounded-xl font-semibold text-lg
              hover:bg-coffee-500 transition-colors"
          >
            Далее: ввести замеры →
          </button>
        </div>
      )}

      {/* New Recipe */}
      {!running && !finished && (
        <button
          onClick={onNewRecipe}
          className="text-sm text-coffee-500 hover:text-coffee-400 transition-colors"
        >
          ← Новый рецепт
        </button>
      )}
    </div>
  )
}