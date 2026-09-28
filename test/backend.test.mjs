/* eslint n/no-unsupported-features/node-builtins: "off", n/no-unpublished-import: "off" */
import assert from 'node:assert/strict'
import test from 'node:test'
import { combineRgb } from '@companion-module/base'
import Backend from '../dist/api/backend.js'
import { Store } from '../dist/scripts/store.js'
import { UpdateActions } from '../dist/actions.js'
import { UpdateFeedbacks } from '../dist/feedbacks.js'
import { UpdatePresets } from '../dist/presets.js'
import { EventHandler } from '../dist/scripts/eventhandler.js'
import { getCameraWorkflowPresets } from '../dist/presets/camera.js'
import { getGamepadPresets } from '../dist/presets/gamepad.js'
import { getOrchestraPresets } from '../dist/presets/orchestra.js'
import { getProjectPresets } from '../dist/presets/projects.js'
import { getSwitcherPresets } from '../dist/presets/switcher.js'
import { UpdateVariableDefinitions, UpdateVariableValues } from '../dist/variables.js'

function makeBackend() {
	const self = {
		log() {},
		updateVariableValues() {},
		checkFeedbacks() {},
		store: {
			setOrchestraSettings(settings) {
				this.settings = settings
			},
		},
	}
	const backend = new Backend(self)
	backend._client = { GET: async () => ({ data: {} }), PUT: async () => ({ response: { ok: true, status: 204 } }) }
	return { backend, self }
}

test('project load reports 409 impact and does not confirm unless requested', async () => {
	const { backend } = makeBackend()
	const impact = { sources: [{ deviceName: 'Camera A', sourceName: 'NDI' }], confirmationToken: 'token-1' }
	const requests = []
	backend._client.PUT = async (_path, options) => {
		requests.push(options)
		return { response: { ok: false, status: 409 }, error: impact }
	}

	const result = await backend.loadProject(12, false)
	assert.equal(result.loaded, false)
	assert.deepEqual(result.impact, impact)
	assert.equal(requests.length, 1)
})

test('project load retries with the server confirmation token when enabled', async () => {
	const { backend } = makeBackend()
	const impact = { sources: [{ deviceName: 'Camera A' }], confirmationToken: 'token-2' }
	const requests = []
	backend._client.PUT = async (_path, options) => {
		requests.push(options)
		return requests.length === 1
			? { response: { ok: false, status: 409 }, error: impact }
			: { response: { ok: true, status: 200 }, data: { projectId: 12 } }
	}

	const result = await backend.loadProject(12, true)
	assert.equal(result.loaded, true)
	assert.deepEqual(result.impact, impact)
	assert.equal(requests.length, 2)
	assert.deepEqual(requests[1].params.query, { id: 12, confirm: true, confirmationToken: 'token-2' })
})

test('Switcher preview input uses the generated preview endpoint', async () => {
	const { backend } = makeBackend()
	let request
	backend._client.POST = async (path, options) => {
		request = { path, options }
		return { response: { ok: true, status: 201 } }
	}

	await backend.setPreview('Camera 1')
	assert.equal(request.path, '/api/switcher/preview/{input}')
	assert.deepEqual(request.options.params.path, { input: 'Camera 1' })
})

test('Orchestra updates merge into the latest settings before PUT', async () => {
	const { backend, self } = makeBackend()
	const writes = []
	backend._client.GET = async () => ({ data: { movePreviewCameras: true, moveCameraCount: 2, disabledDeviceIds: [5] } })
	backend._client.PUT = async (_path, options) => {
		writes.push(options.body)
		return { response: { ok: true, status: 204 } }
	}

	await backend.updateOrchestraSettings({ moveCameraCount: 3 })
	assert.deepEqual(writes[0], { movePreviewCameras: true, moveCameraCount: 3, disabledDeviceIds: [5] })
	assert.deepEqual(self.store.settings, writes[0])
})

test('Orchestra Boolean toggle flips the latest server value and preserves other fields', async () => {
	const { backend } = makeBackend()
	const writes = []
	backend._client.GET = async () => ({ data: { movePreviewCameras: true, saveCameraGain: false, moveCameraCount: 3 } })
	backend._client.PUT = async (_path, options) => {
		writes.push(options.body)
		return { response: { ok: true, status: 204 } }
	}

	await backend.toggleOrchestraSetting('movePreviewCameras')
	assert.deepEqual(writes[0], { movePreviewCameras: false, saveCameraGain: false, moveCameraCount: 3 })
})

test('Orchestra device toggle adds or removes the device while preserving settings', async () => {
	const { backend } = makeBackend()
	let settings = { moveCameraCount: 2, disabledDeviceIds: [5], saveCameraGain: true }
	const writes = []
	backend._client.GET = async () => ({ data: settings })
	backend._client.PUT = async (_path, options) => {
		writes.push(options.body)
		settings = options.body
		return { response: { ok: true, status: 204 } }
	}

	await backend.toggleOrchestraDevice(5)
	assert.deepEqual(writes[0], { moveCameraCount: 2, disabledDeviceIds: [], saveCameraGain: true })
	await backend.toggleOrchestraDevice(8)
	assert.deepEqual(writes[1], { moveCameraCount: 2, disabledDeviceIds: [8], saveCameraGain: true })
})

test('live state cache keys device state by target and can be cleared', () => {
	const store = new Store({})
	const controller = { target: 'controller', deviceId: 7, connectionState: 'CONNECTED', panAngle: 23 }
	store.applyLiveState(controller)
	assert.deepEqual(store.getLiveState('controller', 7), controller)
	assert.equal(store.getLiveState('controller', 8), undefined)
	store.clearLiveState()
	assert.equal(store.getLiveState('controller', 7), undefined)
})

test('variables refresh AutoCut and live state and are declared only for relevant components', () => {
	const speakerCamera = {
		id: 10,
		name: 'Speaker camera',
		switcherInput: '0',
		components: { personTracker: {}, headTrackingDirector: {}, speakerAutoCut: {} },
		feedback: {
			INPUT_WEBCAM: { state: 'RUNNING' },
			DIRECTOR_HEAD_TRACKING: { state: 'RUNNING' },
			AUTO_CUT_SPEAKER: { state: 'RUNNING' },
			FRAMER_VMIX: { state: 'OFF' },
			CONTROLLER_CANON: { state: 'OFF' },
		},
	}
	const audioDevice = {
		id: 11,
		name: 'Audio',
		components: { audioInput: {}, audioAutoCut: {} },
		feedback: {
			INPUT_AUDIO: { state: 'RUNNING' },
			AUTO_CUT_AUDIO: { state: 'RUNNING' },
			MUSIC_FOLLOWER: { state: 'OFF' },
		},
	}
	const orchestraCamera = {
		id: 12,
		name: 'Orchestra camera',
		components: { musicFollower: {}, vMixFramer: {}, panasonicController: {} },
		feedback: {
			INPUT_WEBCAM: { state: 'RUNNING' },
			FRAMER_VMIX: { state: 'OFF' },
			CONTROLLER_PANASONIC: { state: 'RUNNING' },
		},
	}
	const futureRoleDevice = {
		id: 13,
		name: 'Future AutoCut camera',
		components: { audienceAutoCut: {}, futureAutoCutRole: {} },
		feedback: { AUTO_CUT_FUTURE_ROLE: { state: 'READY' } },
	}
	const devices = [speakerCamera, audioDevice, orchestraCamera, futureRoleDevice]
	const liveStates = new Map([
		['autoCutState:global', { target: 'autoCutState', state: 'CUTTING', subState: 'LOCKED', remainingTime: 1.75 }],
	])
	let liveInputs = ['0']
	let definitions
	let values
	const store = {
		getDevices: () => devices,
		getVideoDevices: () => [speakerCamera, orchestraCamera],
		getAudioDevices: () => [audioDevice],
		getLiveInputs: () => liveInputs,
		getActivePresetMap: () => ({}),
		getPresets: () => [],
		getPresetById: () => undefined,
		getLiveState: (target, deviceId) => liveStates.get(`${target}:${deviceId ?? 'global'}`),
		getAutoCutRemainingTime: () => 1.75,
		getOrchestraSettings: () => ({ moveCameraCount: 2, disabledDeviceIds: [] }),
		isAutoCutRunning: () => true,
		getActiveProject: () => null,
		getDominantSpeaker: () => null,
		getDominantSpeakerOverride: () => null,
		getGamepadDeviceId: () => null,
		getDeviceById: (id) => devices.find((device) => device.id === id),
		getMusicFollowerState: () => undefined,
	}
	const self = {
		store,
		connectionState: 'Connected',
		manualMoveSpeed: 0.2,
		ptzArrowImagesInitialized: true,
		setVariableDefinitions(next) {
			definitions = next
		},
		setVariableValues(next) {
			values = next
		},
	}

	UpdateVariableDefinitions(self)
	assert.ok(definitions.device_10_autocut_state)
	assert.ok(definitions.device_13_autocut_state)
	assert.equal(definitions.device_10_vmix_framer_state, undefined)
	assert.equal(definitions.device_10_music_follower_state, undefined)
	assert.equal(definitions.device_10_controller_connection_state, undefined)
	assert.equal(definitions.device_11_music_follower_state, undefined)
	assert.ok(definitions.device_10_tracking_mode)
	assert.equal(definitions.device_11_live, undefined)
	assert.ok(definitions.device_12_vmix_framer_state)
	assert.ok(definitions.device_12_music_follower_state)
	assert.ok(definitions.device_12_controller_connection_state)
	assert.equal(definitions.device_12_tracking_mode, undefined)
	assert.ok(definitions.orchestra_move_camera_count)
	assert.equal(values.autocut_state, 'CUTTING')
	assert.equal(values.autocut_remaining_time, 1.75)
	assert.equal(values.device_10_autocut_state, 'RUNNING')
	assert.equal(values.device_13_autocut_state, 'READY')
	assert.equal(values.device_10_live, true)

	liveInputs = ['1']
	UpdateVariableValues(self)
	assert.equal(values.device_10_live, false)
	orchestraCamera.components.musicFollower = null
	UpdateVariableDefinitions(self)
	assert.equal(definitions.orchestra_move_camera_count, undefined)
	assert.equal(values.orchestra_move_camera_count, undefined)
	assert.deepEqual(getOrchestraPresets({ store }), {})

	futureRoleDevice.feedback.AUTO_CUT_AUDIENCE = { state: 'IDLE' }
	UpdateVariableValues(self)
	assert.equal(values.device_13_autocut_state, 'AUTO_CUT_AUDIENCE=IDLE, AUTO_CUT_FUTURE_ROLE=READY')
})

test('AutoCut remaining time counts down from the latest scheduled state snapshot', () => {
	const store = new Store({})
	const receivedAt = Date.now()
	store.applyLiveState({ target: 'autoCutState', state: 'SPEAKER', scheduledTime: 8, remainingTime: 6 }, receivedAt)
	assert.equal(store.hasAutoCutCountdown(), true)
	assert.equal(store.getAutoCutRemainingTime(receivedAt + 1500), 4.5)
	assert.equal(store.getAutoCutRemainingTime(receivedAt + 7000), 0)
	store.clearLiveState()
	assert.equal(store.hasAutoCutCountdown(), false)
})

test('switcher state refresh tracks available, Program, and Preview inputs', async () => {
	let state = {
		connectionStatus: 'CONNECTED',
		availableInputs: [{ id: 'a', name: 'Camera A' }],
		programs: ['a'],
		preview: ['b'],
	}
	const store = new Store({ backend: { getSwitcherState: async () => state } })
	assert.equal(await store.loadLiveInputs(), true)
	assert.deepEqual(store.getSwitcherInputs(), [{ id: 'a', name: 'Camera A' }])
	assert.deepEqual(store.getLiveInputs(), ['a'])
	assert.deepEqual(store.getPreviewInputs(), ['b'])
	assert.equal(await store.loadLiveInputs(), false)

	state = { connectionStatus: 'DISCONNECTED', availableInputs: [], programs: [], preview: [] }
	assert.equal(await store.loadLiveInputs(), true)
	assert.deepEqual(store.getPreviewInputs(), [])
})

test('project changes clear old live state and reject Music Follower snapshots from the previous project', async () => {
	let activeProject = { id: 1, name: 'One' }
	let followerState = { target: 'musicFollower', deviceId: 7, projectId: 1, status: 'TRACKING' }
	let presetReads = 0
	const device = { id: 7, name: 'Camera', components: { musicFollower: {} } }
	const backend = {
		loadDevices: async () => [device],
		listFaces: async () => [],
		loadActivePresetMap: async () => ({}),
		listPresets: async () => {
			presetReads++
			if (presetReads === 2) return [{ id: 10, name: 'stale project preset' }]
			if (presetReads >= 3) return [{ id: 20, name: 'new project preset' }]
			return [{ id: 1, name: 'first project preset' }]
		},
		getLiveInputs: async () => [],
		isAutoCutRunning: async () => false,
		loadOverrideDominantSpeaker: async () => null,
		loadDominantSpeaker: async () => null,
		loadProjects: async () => [activeProject],
		loadActiveProject: async () => activeProject,
		loadGamepadSelectedDevice: async () => ({ deviceId: null }),
		loadOrchestraSettings: async () => ({}),
		loadMusicPieces: async () => [],
		loadSetlists: async () => [],
		loadMusicFollowerState: async () => followerState,
	}
	const self = { backend, log() {} }
	const store = new Store(self)
	self.store = store
	await store.loadConfiguration()
	store.applyLiveState({ target: 'controller', deviceId: 7, connectionState: 'CONNECTED' })
	assert.equal(store.getMusicFollowerState(7).status, 'TRACKING')

	activeProject = { id: 2, name: 'Two' }
	await store.loadConfiguration()
	assert.equal(store.getLiveState('controller', 7), undefined)
	assert.equal(store.getMusicFollowerState(7), undefined)
	assert.equal(store.getPresets()[0].name, 'new project preset')

	followerState = { target: 'musicFollower', deviceId: 7, projectId: 2, status: 'WAITING_FOR_SELECTION' }
	await store.loadConfiguration()
	assert.equal(store.getMusicFollowerState(7).status, 'WAITING_FOR_SELECTION')

	activeProject = null
	await store.loadConfiguration()
	assert.equal(store.getMusicFollowerState(7), undefined)
})

test('new contextual presets reference registered actions and feedbacks, and stale choices do nothing', async () => {
	const videoDevice = {
		id: 7,
		name: 'Camera',
		components: { headTrackingDirector: {}, musicFollower: {}, panasonicController: {} },
		feedback: { CONTROLLER_PANASONIC: { state: 'RUNNING' } },
	}
	const audioDevice = { id: 8, name: 'Mic', components: { audioAutoCut: {} } }
	const project = { id: 3, name: 'Show' }
	const piece = { id: 11, name: 'Intro', analysisStatus: 'READY' }
	const setlist = {
		id: 5,
		name: 'Main',
		entries: [
			{ id: 2, ready: true, piece: { name: 'Intro' } },
			{ id: 3, ready: false, piece: { name: 'Unavailable' } },
		],
	}
	const store = {
		getDevices: () => [videoDevice, audioDevice],
		getVideoDevices: () => [videoDevice],
		getAudioDevices: () => [audioDevice],
		getVMixFramerDevices: () => [],
		getFaces: () => [],
		getPresets: () => [{ id: 42, name: 'Saved preset', commands: [{ deviceId: 7 }] }],
		getProjects: () => [project],
		getMusicPieces: () => [piece, { id: 12, name: 'Draft', analysisStatus: 'PROCESSING' }],
		getSetlists: () => [setlist],
		getDeviceById: (id) => [videoDevice, audioDevice].find((candidate) => candidate.id === id),
		getPresetById: (id) => (id === 42 ? { id: 42, name: 'Saved preset', commands: [{ deviceId: 7 }] } : undefined),
		getActivePresetMap: () => ({}),
		getLiveInputs: () => ['camera-a'],
		getPreviewInputs: () => ['camera-b'],
		getSwitcherInputs: () => [
			{ id: 'camera-a', name: 'Camera A' },
			{ id: 'camera-b', name: 'Camera B' },
		],
		getDominantSpeakerOverride: () => null,
		getDominantSpeaker: () => null,
		getActiveProject: () => project,
		getGamepadDeviceId: () => null,
		getOrchestraSettings: () => ({ disabledDeviceIds: [8] }),
		getMusicFollowerState: () => undefined,
		getLiveState: () => undefined,
		isAutoCutRunning: () => false,
	}
	const apiCalls = []
	const logs = []
	const self = {
		store,
		backend: {
			setGamepadSelectedDevice: async (...args) => apiCalls.push(['gamepad', ...args]),
			setMusicFollowerPiece: async (...args) => apiCalls.push(['piece', ...args]),
			setMusicFollowerSetlistEntry: async (...args) => apiCalls.push(['entry', ...args]),
			loadProject: async (...args) => apiCalls.push(['project', ...args]),
		},
		log(level, message) {
			logs.push([level, message])
		},
		async updateConfiguration() {},
		setActionDefinitions(value) {
			this.actions = value
		},
		setFeedbackDefinitions(value) {
			this.feedbacks = value
		},
		setPresetDefinitions(structure, definitions) {
			this.presetStructure = structure
			this.presetDefinitions = definitions
		},
	}
	UpdateActions(self)
	UpdateFeedbacks(self)
	const presets = {
		...getProjectPresets(self),
		...getSwitcherPresets(self),
		...getCameraWorkflowPresets(self),
		...getGamepadPresets(self),
		...getOrchestraPresets(self),
	}
	const actionIds = new Set(Object.keys(self.actions))
	const feedbackIds = new Set(Object.keys(self.feedbacks))
	assert.ok(presets['loadProject-3'])
	assert.ok(presets['switcherProgram-camera-a'])
	assert.ok(presets['switcherPreview-camera-b'])
	assert.equal(presets['switcherProgram-camera-a'].style.bgcolor, combineRgb(64, 0, 0))
	assert.equal(presets['switcherProgram-camera-a'].feedbacks[0].style.bgcolor, combineRgb(255, 0, 0))
	assert.equal(presets['switcherPreview-camera-b'].style.bgcolor, combineRgb(0, 64, 0))
	assert.equal(presets['switcherPreview-camera-b'].feedbacks[0].style.bgcolor, combineRgb(0, 255, 0))
	assert.ok(presets['correctFraming-7'])
	assert.ok(presets['gamepadCamera-7'])
	assert.ok(presets['musicPiece-7-11'])
	assert.ok(presets['musicSetlist-7-5-2'])
	assert.equal(presets['musicPiece-7-12'], undefined)
	assert.ok(presets['orchestra-move-camera-count-3'])
	assert.ok(presets['orchestra-device-7'])
	assert.ok(presets['orchestra-device-8'])
	assert.equal(presets['orchestra-device-7'].feedbacks[0].style.bgcolor, combineRgb(0, 0, 255))
	for (const preset of Object.values(presets)) {
		for (const step of preset.steps ?? []) {
			for (const action of [...(step.down ?? []), ...(step.up ?? [])]) {
				assert.ok(actionIds.has(action.actionId), `missing action ${action.actionId}`)
			}
		}
		for (const feedback of preset.feedbacks ?? []) {
			assert.ok(feedbackIds.has(feedback.feedbackId), `missing feedback ${feedback.feedbackId}`)
		}
	}
	assert.equal(self.feedbacks.switcherBusInput.callback({ options: { bus: 'program', input: 'camera-a' } }), true)
	assert.equal(self.feedbacks.switcherBusInput.callback({ options: { bus: 'preview', input: 'camera-b' } }), true)
	assert.equal(self.feedbacks.switcherBusInput.callback({ options: { bus: 'preview', input: 'camera-a' } }), false)
	assert.equal(self.feedbacks.orchestraDeviceEnabled.callback({ options: { deviceId: 7 } }), true)
	assert.equal(self.feedbacks.orchestraDeviceEnabled.callback({ options: { deviceId: 8 } }), false)
	await self.actions.setGamepadDevice.callback({ options: { deviceId: 99 } })
	await self.actions.selectMusicPiece.callback({ options: { deviceId: 7, pieceId: 12 } })
	await self.actions.selectMusicSetlistEntry.callback({ options: { deviceId: 7, entry: '5:3' } })
	await self.actions.loadProject.callback({ options: { projectId: 99, confirmInterruptions: true } })
	assert.deepEqual(apiCalls, [])
	const impact = {
		sources: [{ deviceName: 'Camera', sourceName: 'NDI input' }],
		switcherWillDisconnect: true,
	}
	self.backend.loadProject = async (_projectId, confirm) => ({ loaded: confirm, impact })
	await self.actions.loadProject.callback({ options: { projectId: 3, confirmInterruptions: false } })
	await self.actions.loadProject.callback({ options: { projectId: 3, confirmInterruptions: true } })
	assert.ok(
		logs.some(([, message]) => message.includes('Camera: NDI input') && message.includes('switcher will disconnect')),
	)
	assert.ok(logs.some(([level, message]) => level === 'info' && message.includes('Project load interruption impact')))
	UpdatePresets(self)
	assert.ok(Object.keys(self.presetDefinitions).length > Object.keys(presets).length)
	for (const presetId of [
		'toggledDirector-7',
		'shotSize-WIDE-7',
		'toggleAutoCut',
		'overrideDominantSpeaker-8',
		'playPreset-42',
		'reapplyPreset-7',
	]) {
		assert.ok(self.presetDefinitions[presetId], `missing existing preset ${presetId}`)
	}
	for (const definition of Object.values(self.presetDefinitions)) {
		const variants = definition.variants ?? [definition]
		for (const variant of variants) {
			for (const step of variant.steps ?? []) {
				for (const action of [...(step.down ?? []), ...(step.up ?? [])]) {
					assert.ok(actionIds.has(action.actionId), `missing action ${action.actionId}`)
				}
			}
			for (const feedback of variant.feedbacks ?? []) {
				assert.ok(feedbackIds.has(feedback.feedbackId), `missing feedback ${feedback.feedbackId}`)
			}
		}
	}
})

test('batched state stream events update the store and refresh dominant speaker after audio changes', async () => {
	const applied = []
	let speakerRefreshes = 0
	const feedbackChecks = []
	const self = {
		store: {
			applyLiveState(state) {
				applied.push(state)
			},
			async loadDominantSpeaker() {
				speakerRefreshes++
			},
		},
		updateVariableValues() {},
		checkFeedbacks(...ids) {
			feedbackChecks.push(ids)
		},
		log() {},
	}
	const handler = new EventHandler(self, '127.0.0.1', 8080, '', '')
	await handler.handleStateMessage(
		JSON.stringify([
			{ target: 'controller', deviceId: 7, connectionState: 'CONNECTED' },
			{ target: 'musicFollower', deviceId: 7, status: 'TRACKING' },
			{ target: 'autoCutEvent', type: 'AUDIO_CHANGED' },
		]),
	)
	assert.equal(applied.length, 3)
	assert.equal(speakerRefreshes, 1)
	assert.ok(feedbackChecks.flat().includes('dominantSpeaker'))
})

test('state stream reconnect refreshes the live snapshot after the initial connection', () => {
	let refreshes = 0
	const handler = new EventHandler(
		{
			async updateConfiguration() {
				refreshes++
			},
			log() {},
		},
		'127.0.0.1',
		8080,
		'',
		'',
	)
	handler.handleStateStreamOpen()
	assert.equal(refreshes, 0)
	handler.handleStateStreamOpen()
	assert.equal(refreshes, 1)
	handler.close()
	handler.handleStateStreamOpen()
	assert.equal(refreshes, 1)
})

test('switcher state events refresh definitions when the available input list changes', async () => {
	let definitionsRefreshed = 0
	const feedbackChecks = []
	const handler = new EventHandler(
		{
			store: {
				async loadLiveInputs() {
					return true
				},
			},
			updateStatus() {},
			updateDefinitions() {
				definitionsRefreshed++
			},
			updateVariableValues() {},
			checkFeedbacks(...ids) {
				feedbackChecks.push(ids)
			},
			log() {},
		},
		'127.0.0.1',
		8080,
		'',
		'',
	)
	await handler.handleMessage(JSON.stringify({ type: 'SWITCHER_STATE_UPDATED' }))
	assert.equal(definitionsRefreshed, 1)
	assert.ok(feedbackChecks.flat().includes('switcherBusInput'))
})

test('AutoCut update events reload per-device component feedback before updating variables', async () => {
	let deviceRefreshes = 0
	let runningRefreshes = 0
	let variableRefreshes = 0
	const handler = new EventHandler(
		{
			store: {
				async loadDevices() {
					deviceRefreshes++
				},
				async loadAutoCutEnabled() {
					runningRefreshes++
				},
				async loadDominantSpeaker() {},
			},
			updateStatus() {},
			updateVariableValues() {
				variableRefreshes++
			},
			checkFeedbacks() {},
			log() {},
		},
		'127.0.0.1',
		8080,
		'',
		'',
	)
	await handler.handleMessage(JSON.stringify({ type: 'AUTO_CUT_UPDATED' }))
	assert.equal(deviceRefreshes, 1)
	assert.equal(runningRefreshes, 1)
	assert.equal(variableRefreshes, 2)
})
