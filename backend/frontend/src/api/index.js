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

export async function listRecipes(spotId, method) {
  const params = new URLSearchParams()
  if (spotId) params.set('spotId', spotId)
  if (method) params.set('method', method)
  const qs = params.toString()
  return apiFetch(`${API_BASE}/api/recipes${qs ? `?${qs}` : ''}`)
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

export async function createSpot(spotData) {
  return apiFetch(`${API_BASE}/api/spots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(spotData),
  })
}

export async function generateInvite(spotId) {
  return apiFetch(`${API_BASE}/api/spots/${spotId}/invite`, {
    method: 'POST',
  })
}

export async function getUserCompany() {
  return apiFetch(`${API_BASE}/api/user/company`)
}

export async function createCompany(name) {
  return apiFetch(`${API_BASE}/api/companies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
}

export async function changeUserRole(userId, spotId, newRole) {
  return apiFetch(`${API_BASE}/api/companies/change-role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, spot_id: spotId, new_role: newRole }),
  })
}

export async function saveBrewHistory(data) {
  return apiFetch(`${API_BASE}/api/history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function listBrewHistory() {
  return apiFetch(`${API_BASE}/api/history`)
}

export async function toggleFavorite(recipeId) {
  return apiFetch(`${API_BASE}/api/recipes/${recipeId}/toggle-favorite`, {
    method: 'PATCH',
  })
}

export async function updateRecipe(id, recipeData) {
  return apiFetch(`${API_BASE}/api/recipes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(recipeData),
  })
}

export async function copyRecipe(id, spotId) {
  return apiFetch(`${API_BASE}/api/recipes/${id}/copy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spotId: spotId || null }),
  })
}

export async function moveRecipe(id, targetSpotId) {
  return apiFetch(`${API_BASE}/api/recipes/${id}/move`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spotId: targetSpotId }),
  })
}