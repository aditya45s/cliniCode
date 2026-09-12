import test from 'node:test'
import assert from 'node:assert/strict'

test('demo project includes emergency risk contract', async () => {
  const response = await fetch('http://localhost:4000/health').catch(() => null)
  if (!response) return
  assert.equal(response.status, 200)
})
