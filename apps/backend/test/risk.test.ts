import test from 'node:test'
import assert from 'node:assert/strict'
import { riskForText, structuredFindings } from '../src/server.js'

test('emergency safety rules stop routine routing', () => {
  assert.equal(riskForText('chest pain and difficulty breathing'), 'EMERGENCY')
})

test('moderate symptoms remain distinct from emergency', () => {
  assert.equal(riskForText('stomach pain and nausea'), 'MODERATE')
})

test('mock AI returns structured gastrointestinal findings', () => {
  const result = structuredFindings('stomach pain and nausea for 3 days')
  assert.deepEqual(result.symptoms, ['stomach pain', 'nausea'])
  assert.equal(result.recommendedDepartment, 'Gastroenterology')
  assert.equal(result.duration, '3 days')
})