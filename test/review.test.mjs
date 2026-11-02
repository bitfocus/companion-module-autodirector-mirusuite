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
import { MiruSuiteModuleInstance } from '../dist/main.js'
import { organizePresets } from '../dist/presets/modern.js'
import { addMoveTargetRotaryPresets, addUpdateSensitivityRotaryPresets } from '../dist/presets/legacy-camera.js'
import { addPlayPresetPreset } from '../dist/presets/saved.js'

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
		guiStreamConnected: false,
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

test('HTTP recovery restores status once while the GUI stream remains connected', async (t) => {
	const self = makeInstance()
	self.connectionState = 'Connected'
	self.guiStreamConnected = true
	self.store.configurationLoaded = true
	let pushes = 0
	self.updateVariableValues = () => pushes++
	let failing = true
	t.mock.method(globalThis, 'fetch', async () => (failing ? new Response('', { status: 503 }) : new Response('[]')))
	const backend = new Backend(self)
	await backend.setup('localhost', 8080)
	await assert.rejects(backend.loadDevices())
	assert.equal(self.connectionState, 'Disconnected')
	const failurePushes = pushes
	failing = false
	await backend.loadDevices()
	assert.equal(self.connectionState, 'Connected')
	assert.equal(pushes, failurePushes + 1)
	await backend.loadDevices()
	assert.equal(pushes, failurePushes + 1, 'healthy requests do not repeatedly push variables')
	self.guiStreamConnected = false
	self.connectionState = 'Disconnected'
	await backend.loadDevices()
	assert.equal(self.connectionState, 'Disconnected', 'HTTP recovery cannot mask a stream outage')
	assert.equal(pushes, failurePushes + 1)
})

test('GUI stream health tracks open, error, and close and every reopen refreshes configuration', async () => {
	const self = makeInstance()
	let refreshes = 0
	self.updateConfiguration = async () => refreshes++
	const handler = new EventHandler(self, 'localhost', 8080, '', '')
	try {
		handler.connect()
		const source = handler.guiSource
		self.connectionState = 'Connected'
		source.onopen()
		assert.equal(refreshes, 0, 'initial open does not repeat a successful configuration load')
		source.onerror()
		source.onopen()
		assert.equal(self.guiStreamConnected, true)
		assert.equal(refreshes, 1)
		source.onerror()
		assert.equal(self.guiStreamConnected, false)
		// A separate configuration refresh must not suppress the stream's reconnect refresh.
		self.connectionState = 'Connected'
		source.onopen()
		assert.equal(refreshes, 2)
	} finally {
		handler.close()
	}
	assert.equal(self.guiStreamConnected, false)
})

test('configuration refresh cannot mark a disconnected GUI stream healthy', async () => {
	const self = makeInstance()
	self.backend = {}
	self.eventHandler = {}
	self.store.loadConfiguration = async () => {}
	self.updateDefinitions = () => {}
	await MiruSuiteModuleInstance.prototype.updateConfiguration.call(self)
	assert.equal(self.connectionState, 'Disconnected')
	self.guiStreamConnected = true
	await MiruSuiteModuleInstance.prototype.updateConfiguration.call(self)
	assert.equal(self.connectionState, 'Connected')
})

test('rotary and single-device saved presets stay with their device; shared presets stay in Application', () => {
	const self = makeInstance()
	self.store.devices = [
		{ id: 7, name: 'Camera' },
		{ id: 8, name: 'Other camera' },
	]
	self.store.presets = [
		{ id: 1, commands: [{ deviceId: 7 }, { deviceId: 7 }] },
		{ id: 2, commands: [{ deviceId: 7 }, { deviceId: 8 }] },
		{ id: 3, commands: [] },
		{ id: 4, commands: [{ deviceId: 99 }] },
	]
	const presets = {}
	addMoveTargetRotaryPresets(presets, [{ id: 7, label: 'Camera' }], 7)
	addUpdateSensitivityRotaryPresets(presets, [{ id: 7, label: 'Camera' }], 7)
	for (const id of [1, 2, 3, 4, 5]) addPlayPresetPreset(presets, { id, label: `Preset ${id}` })
	const { structure, definitions } = organizePresets(self, presets)
	const groups = Object.fromEntries(
		structure.map((section) => [section.id, section.definitions.flatMap((group) => group.presets)]),
	)
	assert.deepEqual(groups['device-7'], [
		'moveTargetRotary-X-7',
		'moveTargetRotary-Y-7',
		'updateSensitivityRotary-7',
		'playPreset-1',
	])
	assert.deepEqual(groups['module-wide'], ['playPreset-2', 'playPreset-3', 'playPreset-4', 'playPreset-5'])
	assert.equal(definitions['moveTargetRotary-X-7'].steps[0].rotate_left[0].options.deviceId, 7)
})
