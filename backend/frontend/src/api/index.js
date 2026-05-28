const API_BASE = import.meta.env.VITE_API_URL || 'https://web-production-66155.up.railway.app'

export async function saveRecipe(recipeData) {
  const res = await fetch(`${API_BASE}/api/recipes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(recipeData),
  })
  if (!res.ok) throw new Error('Failed to save recipe')
  return res.json()
}

export async function calculateExtraction(data) {
  const res = await fetch(`${API_BASE}/api/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to calculate extraction')
  return res.json()
}