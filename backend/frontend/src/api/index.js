const API_BASE = 'https://web-production-66155.up.railway.app'

function getInitData() {
  if (window.Telegram?.WebApp?.initData) {
    return window.Telegram.WebApp.initData
  }
  return ''
}

async function apiFetch(url, options = {}) {
  const headers = {
    ...options.headers,
    'X-TG-Init-Data': getInitData(),
  }
  const res = await fetch(url, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Ошибка ${res.status}`)
  }
  return res.json()
}

export async function getCurrentUser() {
  return apiFetch(`${API_BASE}/api/user/me`)
}

export async function listUserSpots() {
  return apiFetch(`${API_BASE}/api/user/spots`)
}

export async function saveRecipe(recipeData) {
  return apiFetch(`${API_BASE}/api/recipes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(recipeData),
  })
}

export async function listRecipes(spotId) {
  const params = spotId ? `?spotId=${spotId}` : ''
  return apiFetch(`${API_BASE}/api/recipes${params}`)
}

export async function getRecipe(id) {
  return apiFetch(`${API_BASE}/api/recipes/${id}`)
}

export async function deleteRecipe(id) {
  return apiFetch(`${API_BASE}/api/recipes/${id}`, {
    method: 'DELETE',
  })
}

export async function calculateExtraction(data) {
  return apiFetch(`${API_BASE}/api/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}