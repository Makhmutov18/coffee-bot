const API_BASE = 'https://web-production-66155.up.railway.app'

export async function saveRecipe(recipeData) {
  const res = await fetch(`${API_BASE}/api/recipes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(recipeData),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Ошибка сохранения')
  }
  return res.json()
}

export async function listRecipes() {
  const res = await fetch(`${API_BASE}/api/recipes`)
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Ошибка загрузки списка')
  }
  return res.json()
}

export async function getRecipe(id) {
  const res = await fetch(`${API_BASE}/api/recipes/${id}`)
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Ошибка загрузки рецепта')
  }
  return res.json()
}

export async function calculateExtraction(data) {
  const res = await fetch(`${API_BASE}/api/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Ошибка расчёта')
  }
  return res.json()
}