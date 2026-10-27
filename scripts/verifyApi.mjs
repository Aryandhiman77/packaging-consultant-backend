import assert from 'node:assert/strict'
import 'dotenv/config'
import { verifyAdminToken } from '../src/utils/adminJwt.js'

const apiBaseUrl = process.env.API_BASE_URL || 'http://127.0.0.1:5050'
let adminToken = ''

async function request(path, options = {}) {
  const isAdmin = path === '/api/admin' || path.startsWith('/api/admin/')
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(isAdmin && adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
      ...options.headers,
    },
  })

  const body = response.status === 204 ? null : await response.json()
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path} failed: ${response.status} ${JSON.stringify(body)}`)
  }

  return { response, body }
}

const health = await request('/api/health')
assert.equal(health.body.status, 'ok')

const rejectedLogin = await fetch(`${apiBaseUrl}/api/admin/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: process.env.ADMIN_EMAIL,
    password: `${process.env.ADMIN_PASSWORD}-incorrect`,
  }),
})
assert.equal(rejectedLogin.status, 401)

const login = await request('/api/admin/auth/login', {
  method: 'POST',
  body: JSON.stringify({
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  }),
})
adminToken = login.body.token
const claims = verifyAdminToken(adminToken)
assert.equal(claims.exp - claims.iat, 24 * 60 * 60)
assert.equal(claims.email, process.env.ADMIN_EMAIL.toLowerCase())

const auth = await request('/api/admin/auth/check')
assert.equal(auth.body.authenticated, true)
assert.equal(auth.body.role, 'admin')

const current = await request('/api/admin/settings/current')
const originalNavigation = current.body.data.topNavigation
assert.ok(Array.isArray(originalNavigation))
assert.ok(originalNavigation.length > 0)

const reviews = await request('/api/admin/project-reviews?page=1&limit=1')
assert.ok(Array.isArray(reviews.body.data))
assert.equal(typeof reviews.body.pagination.total, 'number')

const testNavigation = [
  { label: 'Home', link: '#home', children: [] },
  {
    label: 'Services',
    link: '#services',
    children: [{ label: 'Packaging Design', link: '#packaging-design' }],
  },
]

let createdId

try {
  const updated = await request('/api/admin/settings/current', {
    method: 'PUT',
    body: JSON.stringify({ topNavigation: testNavigation }),
  })
  assert.equal(updated.body.data.topNavigation[1].children[0].label, 'Packaging Design')

  const publicNavigation = await request('/api/settings/navigation')
  assert.equal(publicNavigation.body.topNavigation.length, 2)
  assert.equal(publicNavigation.body.topNavigation[1].children[0].link, '#packaging-design')

  const created = await request('/api/admin/settings', {
    method: 'POST',
    body: JSON.stringify({
      key: `crud-check-${Date.now()}`,
      topNavigation: [{ label: 'Temporary', link: '/temporary', children: [] }],
    }),
  })
  createdId = created.body.data._id
  assert.ok(createdId)

  const patched = await request(`/api/admin/settings/${createdId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      topNavigation: [{ label: 'Updated', link: '/updated', children: [] }],
    }),
  })
  assert.equal(patched.body.data.topNavigation[0].label, 'Updated')

  const fetched = await request(`/api/admin/settings/${createdId}`)
  assert.equal(fetched.body.data.topNavigation[0].link, '/updated')

  await request(`/api/admin/settings/${createdId}`, { method: 'DELETE' })
  createdId = undefined

  console.log('Runtime API verification passed: admin login, rejected invalid login, strict 24-hour JWT, settings, navigation CRUD, and Project Reviews list.')
} finally {
  if (createdId) {
    await request(`/api/admin/settings/${createdId}`, { method: 'DELETE' }).catch(() => {})
  }

  await request('/api/admin/settings/current', {
    method: 'PUT',
    body: JSON.stringify({ topNavigation: originalNavigation }),
  })
}
