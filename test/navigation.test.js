import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeTopNavigation, ValidationError } from '../src/utils/navigation.js'

test('normalizes top navigation and nested dropdown links', () => {
  assert.deepEqual(normalizeTopNavigation([
    { label: ' Services ', link: ' #services ', children: [{ label: ' Design ', link: ' /design ' }] },
  ]), [
    { label: 'Services', link: '#services', children: [{ label: 'Design', link: '/design' }] },
  ])
})

test('rejects empty labels and invalid children', () => {
  assert.throws(
    () => normalizeTopNavigation([{ label: ' ', link: '#home' }]),
    ValidationError,
  )
  assert.throws(
    () => normalizeTopNavigation([{ label: 'Home', link: '#home', children: {} }]),
    ValidationError,
  )
})
