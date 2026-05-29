import React, { useState, useEffect, useCallback } from 'react'
import NewRecipe from './pages/NewRecipe'
import BrewTimer from './pages/BrewTimer'
import Results from './pages/Results'
import RecipeList from './pages/RecipeList'
import RecipeDetail from './pages/RecipeDetail'
import { listUserSpots, getCurrentUser } from './api'

const TABS = [
  { key: 'recipe', label: 'Рецепт', icon: '📝' },
  { key: 'brew', label: 'Заваривание', icon: '⏱️' },
  { key: 'results', label: 'Итоги', icon: '📊' },
  { key: 'recipes', label: 'Архив', icon: '☕' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('recipe')
  const [recipe, setRecipe] = useState(null)
  const [brewResults, setBrewResults] = useState(null)
  const [selectedRecipeId, setSelectedRecipeId] = useState(null)
  const [repeatRecipe, setRepeatRecipe] = useState(null)
  const [spots, setSpots] = useState([])
  const [selectedSpotId, setSelectedSpotId] = useState(null)
  const [userRole, setUserRole] = useState(null)

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp
      tg.expand()
      tg.ready()
    }
  }, [])

  // Load user info and spots on mount
  useEffect(() => {
    const savedSpotId = localStorage.getItem('selectedSpotId')
    if (savedSpotId) {
      setSelectedSpotId(parseInt(savedSpotId, 10))
    }

    getCurrentUser()
      .then((user) => {
        setUserRole(user.role)
      })
      .catch(() => {
        // Silently fail
      })

    listUserSpots()
      .then((data) => {
        setSpots(data)
        // If saved spot is no longer available, reset
        if (data.length > 0 && savedSpotId) {
          const stillAvailable = data.some((s) => s.id === parseInt(savedSpotId, 10))
          if (!stillAvailable) {
            setSelectedSpotId(null)
            localStorage.removeItem('selectedSpotId')
          }
        }
      })
      .catch(() => {
        // Silently fail — user may be personal role
      })
  }, [])

  const handleSpotChange = useCallback((e) => {
    const value = e.target.value ? parseInt(e.target.value, 10) : null
    setSelectedSpotId(value)
    if (value) {
      localStorage.setItem('selectedSpotId', value)
    } else {
      localStorage.removeItem('selectedSpotId')
    }
  }, [])

  const handleRecipeSave = useCallback((data) => {
    setRecipe(data)
    setActiveTab('brew')
  }, [])

  const handleBrewComplete = useCallback((results) => {
    setBrewResults(results)
    setActiveTab('results')
  }, [])

  const handleNewBrew = useCallback(() => {
    setBrewResults(null)
    setActiveTab('brew')
  }, [])

  const handleNewRecipe = useCallback(() => {
    setRecipe(null)
    setBrewResults(null)
    setRepeatRecipe(null)
    setSelectedRecipeId(null)
    setActiveTab('recipe')
  }, [])

  const handleGoToRecipes = useCallback(() => {
    setActiveTab('recipes')
  }, [])

  const handleSelectRecipe = useCallback((r) => {
    setSelectedRecipeId(r.id)
  }, [])

  const handleBackToList = useCallback(() => {
    setSelectedRecipeId(null)
  }, [])

  const handleRepeatRecipe = useCallback((r) => {
    const prefill = {
      roaster: r.roaster || '',
      beanVariety: r.beanVariety,
      beanProcessing: r.beanProcessing || '',
      dose: r.dose,
      dripperType: r.dripperType,
      grinderModel: r.grinderModel || '',
      grindSetting: r.grindSetting || '',
      totalWater: r.totalWater,
      waterTemp: r.waterTemp || '',
      waterTds: r.waterTds || '',
      brewTime: r.brewTime || '',
      pourSteps: (r.pourSteps || []).map((s) => ({
        time: s.time,
        action: s.action,
      })),
    }
    setRepeatRecipe(prefill)
    setSelectedRecipeId(null)
    setActiveTab('recipe')
  }, [])

  return (
    <div className="flex flex-col h-screen bg-coffee-950 text-coffee-100 selection:bg-coffee-500/30">
      {/* Header */}
      <header className="px-4 py-3 bg-coffee-900/60 backdrop-blur-md border-b border-coffee-800/40 sticky top-0 z-50">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-md font-medium tracking-wide text-coffee-200 uppercase shrink-0">
            ✦ Brew Lab ✦
          </h1>
          {spots.length > 0 && (
            <select
              value={selectedSpotId ?? ''}
              onChange={handleSpotChange}
              className="flex-1 min-w-0 max-w-[200px] text-xs bg-coffee-800/60 border border-coffee-700/50 rounded-lg px-2 py-1.5 text-coffee-200 focus:outline-none focus:border-coffee-500"
            >
              <option value="">Личное</option>
              {spots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        {activeTab === 'recipe' && (
          <NewRecipe
            key={repeatRecipe ? JSON.stringify(repeatRecipe) : 'new'}
            onSave={handleRecipeSave}
            initialData={repeatRecipe}
            spotId={selectedSpotId}
          />
        )}
        {activeTab === 'brew' && (
          <BrewTimer
            recipe={recipe}
            onComplete={handleBrewComplete}
            onNewRecipe={handleNewRecipe}
          />
        )}
        {activeTab === 'results' && (
          <Results
            recipe={recipe}
            brewResults={brewResults}
            onNewBrew={handleNewBrew}
            onNewRecipe={handleNewRecipe}
            onGoToRecipes={handleGoToRecipes}
          />
        )}
        {activeTab === 'recipes' && !selectedRecipeId && (
          <RecipeList
            onSelectRecipe={handleSelectRecipe}
            onNewRecipe={handleNewRecipe}
            spotId={selectedSpotId}
            userRole={userRole}
          />
        )}
        {activeTab === 'recipes' && selectedRecipeId && (
          <RecipeDetail
            recipeId={selectedRecipeId}
            onBack={handleBackToList}
            onRepeat={handleRepeatRecipe}
            userRole={userRole}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <div
        className="sticky bottom-0 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-coffee-950 via-coffee-950/95 to-transparent pointer-events-none"
        onPointerDown={(e) => {
          // Hide keyboard on tap outside inputs
          if (e.target === e.currentTarget || e.target.tagName !== 'INPUT') {
            document.activeElement?.blur()
          }
        }}
      >
        <nav className="flex max-w-md mx-auto bg-coffee-900/90 backdrop-blur-lg border border-coffee-800/60 rounded-2xl shadow-xl pointer-events-auto overflow-hidden">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex-1 flex flex-col items-center justify-center py-3 transition-all duration-300 relative group"
              >
                {isActive && (
                  <span className="absolute inset-x-4 top-0 h-[2px] bg-gradient-to-r from-transparent via-coffee-300 to-transparent rounded-full" />
                )}
                <span className={`text-xl transition-transform duration-300 ${isActive ? 'scale-110' : 'opacity-60 group-hover:opacity-80'}`}>
                  {tab.icon}
                </span>
                <span className={`text-[10px] mt-1 font-medium tracking-wider transition-colors duration-300 ${isActive ? 'text-coffee-200' : 'text-coffee-600'}`}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}