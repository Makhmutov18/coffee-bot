import React, { useState, useEffect, useCallback } from 'react'
import NewRecipe from './pages/NewRecipe'
import BrewTimer from './pages/BrewTimer'
import Results from './pages/Results'
import RecipeList from './pages/RecipeList'
import RecipeDetail from './pages/RecipeDetail'
import AdminPanel from './pages/AdminPanel'
import Archive from './pages/Archive'
import { listUserSpots, getCurrentUser } from './api'

const TABS = [
  { key: 'recipe', label: 'Рецепт', icon: '📝' },
  { key: 'brew', label: 'Заваривание', icon: '⏱️' },
  { key: 'results', label: 'Итоги', icon: '📊' },
  { key: 'archive', label: 'Архив', icon: '☕' },
  { key: 'admin', label: 'Управление', icon: '⚙️' },
]

function getVisibleTabs(userRole) {
  const isBarista = userRole === 'barista'
  return TABS.filter((tab) => {
    if (tab.key === 'admin' && userRole !== 'owner') return false
    if (tab.key === 'archive' && isBarista) return false
    return true
  })
}

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

  useEffect(() => {
    const savedSpotId = localStorage.getItem('selectedSpotId')
    if (savedSpotId) {
      setSelectedSpotId(parseInt(savedSpotId, 10))
    }

    getCurrentUser()
      .then((user) => {
        setUserRole(user.role)
      })
      .catch(() => {})

    listUserSpots()
      .then((data) => {
        setSpots(data)
        if (data.length > 0 && savedSpotId) {
          const stillAvailable = data.some((s) => s.id === parseInt(savedSpotId, 10))
          if (!stillAvailable) {
            setSelectedSpotId(null)
            localStorage.removeItem('selectedSpotId')
          }
        }
      })
      .catch(() => {})
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
    setActiveTab(userRole === 'barista' ? 'recipe' : 'archive')
  }, [userRole])

  const handleSelectRecipe = useCallback((r) => {
    setSelectedRecipeId(r.id)
  }, [])

  const handleBackToList = useCallback(() => {
    setSelectedRecipeId(null)
  }, [])

  const handleRepeatRecipe = useCallback((r) => {
    if (userRole === 'barista') {
      setRecipe(r)
      setSelectedRecipeId(null)
      setActiveTab('brew')
      return
    }
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
  }, [userRole])

  return (
    <div className="flex flex-col h-screen bg-black text-tech-primary selection:bg-tech-accent/20">
      {/* Header */}
      <header className="px-4 py-3 bg-black/80 glass sticky top-0 z-50">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-md font-heading font-semibold tracking-wide text-tech-primary uppercase shrink-0">
            ✦ Brew Lab ✦
          </h1>
          {spots.length > 0 && (
            <select
              value={selectedSpotId ?? ''}
              onChange={handleSpotChange}
              className="flex-1 min-w-0 max-w-[200px] text-xs bg-tech-input border-tech-border rounded-lg px-2 py-1.5 text-tech-primary focus:outline-none focus:border-tech-accent"
            >
              {userRole !== 'barista' && <option value="">Личное</option>}
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
        {activeTab === 'recipe' && userRole !== 'barista' && (
          <NewRecipe
            key={repeatRecipe ? JSON.stringify(repeatRecipe) : 'new'}
            onSave={handleRecipeSave}
            initialData={repeatRecipe}
            spotId={selectedSpotId}
          />
        )}
        {activeTab === 'recipe' && userRole === 'barista' && !selectedRecipeId && (
          <RecipeList
            onSelectRecipe={handleSelectRecipe}
            onNewRecipe={handleNewRecipe}
            spotId={selectedSpotId}
            userRole={userRole}
          />
        )}
        {activeTab === 'recipe' && userRole === 'barista' && selectedRecipeId && (
          <RecipeDetail
            recipeId={selectedRecipeId}
            onBack={handleBackToList}
            onRepeat={handleRepeatRecipe}
            userRole={userRole}
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
        {activeTab === 'archive' && userRole !== 'barista' && !selectedRecipeId && (
          <Archive
            spotId={selectedSpotId}
            onSelectRecipe={handleSelectRecipe}
            onNewRecipe={handleNewRecipe}
            userRole={userRole}
          />
        )}
        {activeTab === 'archive' && userRole !== 'barista' && selectedRecipeId && (
          <RecipeDetail
            recipeId={selectedRecipeId}
            onBack={handleBackToList}
            onRepeat={handleRepeatRecipe}
            userRole={userRole}
          />
        )}
        {activeTab === 'admin' && userRole === 'owner' && (
          <AdminPanel />
        )}
      </main>

      {/* Bottom Navigation — Glassmorphism */}
      <div
        className="sticky bottom-0 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-black via-black/95 to-transparent pointer-events-none"
        onPointerDown={(e) => {
          if (e.target === e.currentTarget || e.target.tagName !== 'INPUT') {
            document.activeElement?.blur()
          }
        }}
      >
        <nav className="flex max-w-md mx-auto glass rounded-2xl shadow-2xl pointer-events-auto overflow-hidden">
          {getVisibleTabs(userRole).map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex-1 flex flex-col items-center justify-center py-3 transition-all duration-300 relative group"
              >
                {isActive && (
                  <span className="absolute inset-x-4 top-0 h-[2px] bg-tech-accent rounded-full shadow-[0_0_8px_#DEFF9A]" />
                )}
                <span className={`text-xl transition-all duration-300 ${isActive ? 'scale-110' : 'opacity-40 group-hover:opacity-70'}`}
                  style={{ filter: isActive ? 'none' : 'grayscale(0.5)' }}
                >
                  {tab.icon}
                </span>
                <span className={`text-[10px] mt-1 font-body font-medium tracking-wider transition-colors duration-300 ${isActive ? 'text-tech-accent' : 'text-tech-secondary/50'}`}>
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