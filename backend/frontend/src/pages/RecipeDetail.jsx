import React, { useState, useEffect } from 'react'
import { getRecipe, deleteRecipe, copyRecipe, moveRecipe, listUserSpots } from '../api'

export default function RecipeDetail({ recipeId, onBack, onRepeat, onEdit, userRole }) {
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [spots, setSpots] = useState([])
  const [selectedMoveSpotId, setSelectedMoveSpotId] = useState('')
  const [moving, setMoving] = useState(false)
  const [copying, setCopying] = useState(false)
  const [copyDone, setCopyDone] = useState(false)

  useEffect(() => {
    loadRecipe()
  }, [recipeId])

  const loadRecipe = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getRecipe(recipeId)
      setRecipe(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (showMoveModal) {
      listUserSpots()
        .then((data) => setSpots(data))
        .catch(() => {})
    }
  }, [showMoveModal])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteRecipe(recipeId)
      onBack()
    } catch (e) {
      setError(e.message)
    } finally {
      setDeleting(false)
    }
  }

  const formatDate = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatTime = (seconds) => {
    if (seconds === undefined || seconds === null) return ''
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    if (m > 0) return `${m}:${s.toString().padStart(2, '0')}`
    return `${s} сек`
  }

  if (loading) {
    return <div className="text-center py-8 text-tech-secondary">Загрузка...</div>
  }

  if (error) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="text-red-400">Ошибка: {error}</div>
        <button onClick={onBack} className="text-tech-accent">Назад</button>
      </div>
    )
  }

  if (!recipe) return null

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-tech-accent text-sm mb-2">← Назад к списку</button>

      <h2 className="text-xl font-heading font-semibold text-tech-primary">
        {recipe.name || (recipe.roaster ? `${recipe.roaster} — ` : '') + recipe.beanVariety}
      </h2>

      <div className="text-tech-secondary text-xs">{formatDate(recipe.createdAt)}</div>

      <div className="card p-4 space-y-2 text-sm">
        {recipe.name && (
          <div className="flex justify-between">
            <span className="text-tech-secondary">Название:</span>
            <span className="text-tech-primary">{recipe.name}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-tech-secondary">Сорт:</span>
          <span className="text-tech-primary">{recipe.beanVariety}</span>
        </div>
        {recipe.roaster && (
          <div className="flex justify-between">
            <span className="text-tech-secondary">Обжарщик:</span>
            <span className="text-tech-primary">{recipe.roaster}</span>
          </div>
        )}
        {recipe.beanProcessing && (
          <div className="flex justify-between">
            <span className="text-tech-secondary">Обработка:</span>
            <span className="text-tech-primary">{recipe.beanProcessing}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-tech-secondary">Доза:</span>
          <span className="text-tech-primary">{recipe.dose} г</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tech-secondary">Воронка:</span>
          <span className="text-tech-primary">{recipe.dripperType}</span>
        </div>
        {recipe.grinderModel && (
          <div className="flex justify-between">
            <span className="text-tech-secondary">Кофемолка:</span>
            <span className="text-tech-primary">{recipe.grinderModel}</span>
          </div>
        )}
        {recipe.grindSetting && (
          <div className="flex justify-between">
            <span className="text-tech-secondary">Помол:</span>
            <span className="text-tech-primary">{recipe.grindSetting}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-tech-secondary">Вода:</span>
          <span className="text-tech-primary">{recipe.totalWater} мл</span>
        </div>
        {recipe.waterTemp && (
          <div className="flex justify-between">
            <span className="text-tech-secondary">Температура:</span>
            <span className="text-tech-primary">{recipe.waterTemp}°C</span>
          </div>
        )}
        {recipe.waterTds && (
          <div className="flex justify-between">
            <span className="text-tech-secondary">TDS воды:</span>
            <span className="text-tech-primary">{recipe.waterTds} ppm</span>
          </div>
        )}
      </div>

      {recipe.pourSteps && recipe.pourSteps.length > 0 && (
        <div>
          <h3 className="text-lg font-heading font-semibold text-tech-primary mb-2">Шаги пролива</h3>
          <div className="space-y-1">
            {recipe.pourSteps.map((step, i) => (
              <div key={i} className="flex justify-between text-sm card px-3 py-2">
                <span className="text-tech-secondary">
                  {step.action === 'bloom' ? 'Блум' : 'Вливание'}
                </span>
                <span className="text-tech-primary">
                  {formatTime(step.time)}
                  {step.volume ? ` · ${step.volume} мл` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {recipe.measurements && recipe.measurements.length > 0 && (
        <div>
          <h3 className="text-lg font-heading font-semibold text-tech-primary mb-2">Замеры</h3>
          {recipe.measurements.map((m) => (
            <div key={m.id} className="card p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-tech-secondary">Вес напитка:</span>
                <span className="text-tech-primary">{m.beverageWeight} г</span>
              </div>
              <div className="flex justify-between">
                <span className="text-tech-secondary">TDS:</span>
                <span className="text-tech-primary">{m.tds}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-tech-secondary">Экстракция:</span>
                <span className="text-tech-accent font-bold">{m.extraction}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {recipe.tastingNotes && Object.keys(recipe.tastingNotes).length > 0 && (
        <div>
          <h3 className="text-lg font-heading font-semibold text-tech-primary mb-2">Дегустационный профиль</h3>
          <div className="card p-4 space-y-2 text-sm">
            {recipe.tastingNotes.aroma && (
              <div>
                <span className="text-tech-secondary">Аромат: </span>
                <span className="text-tech-primary">{recipe.tastingNotes.aroma}</span>
              </div>
            )}
            {recipe.tastingNotes.flavor && (
              <div>
                <span className="text-tech-secondary">Вкус: </span>
                <span className="text-tech-primary">{recipe.tastingNotes.flavor}</span>
              </div>
            )}
            {recipe.tastingNotes.aftertaste && (
              <div>
                <span className="text-tech-secondary">Послевкусие: </span>
                <span className="text-tech-primary">{recipe.tastingNotes.aftertaste}</span>
              </div>
            )}
            {recipe.tastingNotes.acidity && (
              <div>
                <span className="text-tech-secondary">Кислотность: </span>
                <span className="text-tech-primary">{recipe.tastingNotes.acidity}</span>
              </div>
            )}
            {recipe.tastingNotes.body && (
              <div>
                <span className="text-tech-secondary">Тело: </span>
                <span className="text-tech-primary">{recipe.tastingNotes.body}</span>
              </div>
            )}
            {recipe.tastingNotes.balance && (
              <div>
                <span className="text-tech-secondary">Баланс: </span>
                <span className="text-tech-primary">{recipe.tastingNotes.balance}</span>
              </div>
            )}
            {recipe.tastingNotes.cleanCup && (
              <div>
                <span className="text-tech-secondary">Чистота чашки: </span>
                <span className="text-tech-primary">{recipe.tastingNotes.cleanCup}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <button
            onClick={() => onRepeat(recipe)}
            className="flex-1 py-3 rounded-xl bg-tech-accent text-black font-bold hover:brightness-110 transition"
          >
            Повторить
          </button>
          {userRole !== 'barista' && (
            <button
              onClick={() => onEdit(recipe)}
              className="px-4 py-3 rounded-xl border border-tech-border text-tech-primary hover:border-tech-accent transition text-sm"
            >
              ✏️ Редактировать
            </button>
          )}
        </div>

        {userRole !== 'barista' && (
          <div className="flex gap-2">
            <button
              onClick={async () => {
                setCopying(true)
                try {
                  await copyRecipe(recipe.id, recipe.spotId)
                  setCopyDone(true)
                  setTimeout(() => setCopyDone(false), 2000)
                } catch (e) {
                  setError(e.message)
                } finally {
                  setCopying(false)
                }
              }}
              disabled={copying}
              className="flex-1 py-2.5 rounded-xl border border-tech-border text-tech-primary hover:border-tech-accent transition text-sm disabled:opacity-50"
            >
              {copying ? '...' : copyDone ? '✅ Скопировано' : '📋 Копировать'}
            </button>
            <button
              onClick={() => setShowMoveModal(true)}
              className="flex-1 py-2.5 rounded-xl border border-tech-border text-tech-primary hover:border-tech-accent transition text-sm"
            >
              📦 Переместить
            </button>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="px-4 py-2.5 rounded-xl border border-red-700 text-red-400 hover:bg-red-900/30 transition text-sm"
              >
                🗑
              </button>
            ) : (
              <div className="flex gap-1">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-2.5 rounded-xl border border-tech-border text-tech-primary hover:brightness-125 transition text-sm"
                >
                  ✕
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-2 py-2.5 rounded-xl bg-red-700 text-white font-bold hover:bg-red-600 transition text-sm disabled:opacity-50"
                >
                  {deleting ? '...' : '✓'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Move Modal */}
      {showMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="card p-6 w-full max-w-sm space-y-4 animate-fade-in">
            <h3 className="text-sm font-heading font-semibold text-tech-primary">Переместить рецепт</h3>
            <select
              value={selectedMoveSpotId}
              onChange={(e) => setSelectedMoveSpotId(e.target.value)}
              className="w-full"
            >
              <option value="">— выберите точку —</option>
              {spots.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => setShowMoveModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-tech-border text-tech-primary transition text-sm"
              >
                Отмена
              </button>
              <button
                onClick={async () => {
                  if (!selectedMoveSpotId) return
                  setMoving(true)
                  try {
                    await moveRecipe(recipe.id, parseInt(selectedMoveSpotId, 10))
                    setShowMoveModal(false)
                    onBack()
                  } catch (e) {
                    setError(e.message)
                  } finally {
                    setMoving(false)
                  }
                }}
                disabled={moving || !selectedMoveSpotId}
                className="flex-1 py-2.5 rounded-xl bg-tech-accent text-black font-bold transition text-sm disabled:opacity-50"
              >
                {moving ? '...' : 'Переместить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}