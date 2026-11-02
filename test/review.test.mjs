/* eslint n/no-unpublished-import: "off" */
import assert from 'node:assert/strict'
import test from 'node:test'
import Backend from '../dist/api/backend.js'
import { UpgradeScripts } from '../dist/upgrades.js'
import { Store } from '../dist/scripts/store.js'
import { EventHandler } from '../dist/scripts/eventhandler.js'
import { UpdateActions } from '../dist/actions.js'
import { UpdateFeedbacks } from '../dist/feedbacks.js'
import { UpdateVariableDefinitions } from '../dist/variables.js'

test('1.0.3 connections migrate passwords at index 1, even when index 0 already ran', () => {
	const config = { host: 'localhost', port: 8080, username: 'admin', password: 'saved-password' }
	const props = { config, secrets: null, actions: [], feedbacks: [] }
	assert.equal(UpgradeScripts[0]({}, props).updatedConfig, null)
	const result = UpgradeScripts[1]({}, props)
	assert.deepEqual(result.updatedConfig, { host: 'localhost', port: 8080, username: 'admin' })
	assert.deepEqual(result.updatedSecrets, { password: 'saved-password' })
	assert.equal(config.password, 'saved-password', 'migration does not mutate input')
	assert.deepEqual(UpgradeScripts[1]({}, { ...props, secrets: { password: 'new-password' } }).updatedSecrets, {
		password: 'new-password',
	})
	assert.equal(UpgradeScripts[1]({}, { ...props, config: result.updatedConfig }).updatedConfig, null)
	assert.equal(UpgradeScripts[1]({}, { ...props, config: null }).updatedSecrets, null)
})

function makeInstance() {
	const self = {
		connectionState: 'Disconnected',
		manualMoveSpeed: 0.2,
		log() {},
		updateStatus() {},
		updateVariableValues() {},
		checkFeedbacks() {},
		setActionDefinitions(definitions) {
			this.actions = definitions
		},
		setFeedbackDefinitions(definitions) {
			this.feedbacks = definitions
		},
		setVariableDefinitions(definitions) {
			this.variableDefinitions = definitions
		},
		setVariableValues(values) {
			this.values = { ...this.values, ...values }
		},
	}
	self.store = new Store(self)
	return self
}

test('graphics initialize without reading asset files and are small PNGs', () => {
	const self = makeInstance()
	UpdateVariableDefinitions(self)
	let totalBytes = 0
	for (const direction of ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']) {
		const png = Buffer.from(self.values[`ptz_arrow_${direction}`].split(',')[1], 'base64')
		assert.equal(png.readUInt32BE(16), 96)
		assert.ok(png.readUInt32BE(20) <= 100)
		totalBytes += png.length
	}
	assert.ok(totalBytes < 50000)
	assert.equal(self.ptzArrowImagesInitialized, true)
})

test('conditional fields use fixed dropdowns and all numeric feedback fields have bounds', () => {
	const self = makeInstance()
	UpdateActions(self)
	UpdateFeedbacks(self)
	for (const [definition, id] of [
		[self.actions.setTrackingMode, 'mode'],
		[self.feedbacks.trackingMode, 'mode'],
		[self.actions.setOrchestraSetting, 'setting'],
	])
		assert.equal(definition.options.find((option) => option.id === id).disableAutoExpression, true)
	for (const definition of Object.values(self.feedbacks)) {
		for (const option of definition.options.filter((option) => option.type === 'number')) {
			assert.equal(typeof option.min, 'number')
			assert.equal(typeof option.max, 'number')
		}
	}
})

test('successful HTTP requests do not override a disconnected event stream or push variables', async (t) => {
	const self = makeInstance()
	let pushes = 0
	self.updateVariableValues = () => pushes++
	t.mock.method(
		globalThis,
		'fetch',
		async () => new Response('[]', { headers: { 'Content-Type': 'application/json' } }),
	)
	const backend = new Backend(self)
	await backend.setup('localhost', 8080)
	await backend.loadDevices()
	await backend.loadDevices()
	assert.equal(self.connectionState, 'Disconnected')
	assert.equal(pushes, 0)
})

test('HTTP timeout and caller cancellation both abort requests', async (t) => {
	const timeout = new AbortController()
	let timeoutMs
	t.mock.method(AbortSignal, 'timeout', (ms) => {
		timeoutMs = ms
		return timeout.signal
	})
	t.mock.method(
		globalThis,
		'fetch',
		(_input, init) =>
			new Promise((_, reject) => {
				if (init.signal.aborted) reject(init.signal.reason)
				else init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true })
			}),
	)
	const self = makeInstance()
	const backend = new Backend(self)
	await backend.setup('localhost', 8080)
	const request = backend.loadDevices()
	timeout.abort(new DOMException('Timed out', 'TimeoutError'))
	await assert.rejects(request, { name: 'TimeoutError' })
	assert.equal(timeoutMs, 5000)
	assert.equal(self.connectionState, 'Disconnected')
	const caller = new AbortController()
	caller.abort(new DOMException('Cancelled', 'AbortError'))
	// Use a fresh timeout signal to verify caller cancellation independently.
	t.mock.method(AbortSignal, 'timeout', () => new AbortController().signal)
	await assert.rejects(backend.client.GET('/api/devices', { signal: caller.signal }), { name: 'AbortError' })
})

test('unknown GUI events do not push variables or change connection status', async () => {
	const self = makeInstance()
	let pushes = 0
	self.updateVariableValues = () => pushes++
	await new EventHandler(self, 'localhost', 8080, '', '').handleMessage('{"type":"FUTURE_EVENT"}')
	assert.equal(pushes, 0)
	assert.equal(self.connectionState, 'Disconnected')
})
