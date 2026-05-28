import React, { useState, useEffect, useCallback } from 'react'
import NewRecipe from './pages/NewRecipe'
import BrewTimer from './pages/BrewTimer'
import Results from './pages/Results'

const TABS = [
  { key: 'recipe', label: 'Рецепт', icon: '📝' },
  { key: 'brew', label: 'Заваривание', icon: '⏱️' },
  { key: 'results', label: 'Итоги', icon: '📊' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('recipe')
  const [recipe, setRecipe] = useState(null)
  const [brewResults, setBrewResults] = useState(null)

  // Telegram WebApp integration
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp
      tg.expand()
      tg.ready()
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
    setActiveTab('recipe')
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-coffee-950">
      {/* Header */}
      <header className="px-4 py-3 bg-coffee-900 border-b border-coffee-700">
        <h1 className="text-lg font-semibold text-coffee-100 text-center">
          ☕ Coffee Recipe
        </h1>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 py-4">
        {activeTab === 'recipe' && (
          <NewRecipe onSave={handleRecipeSave} />
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
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="flex bg-coffee-900 border-t border-coffee-700">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 text-center transition-colors ${
              activeTab === tab.key
                ? 'text-coffee-200 bg-coffee-800'
                : 'text-coffee-500'
            }`}
          >
            <div className="text-lg">{tab.icon}</div>
            <div className="text-xs mt-0.5">{tab.label}</div>
          </button>
        ))}
      </nav>
    </div>
  )
}