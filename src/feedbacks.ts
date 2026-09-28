import { DropdownChoice } from '@companion-module/base'
import type { MiruSuiteModuleInstance } from './main.js'
import {
	getDeviceSelector,
	getFaceSelector,
	getPresetSelector,
	createFaceOptions,
	getPresetChoices,
	isPresetActive,
	getDeviceIdToSwitcherInputMap,
	isDeviceLive,
	isInputLive,
	createDeviceOptions,
	getComponentsOfType,
} from './scripts/helpers.js'
import { type ComponentState, type OrchestraSettings } from './api/types.js'

export function UpdateFeedbacks(self: MiruSuiteModuleInstance): void {
	const backend = self.backend
	const store = self.store
	const faceChoices: DropdownChoice[] = createFaceOptions(self)
	const videoDeviceChoices: DropdownChoice[] = createDeviceOptions(store.getVideoDevices())
	const audioDeviceChoices: DropdownChoice[] = createDeviceOptions(store.getAudioDevices())
	const deviceOptions = videoDeviceChoices.concat(audioDeviceChoices)
	const presetChoices: DropdownChoice[] = getPresetChoices(self, videoDeviceChoices)
	const deviceId2SwitcherInput = getDeviceIdToSwitcherInputMap(self)
	self.setFeedbackDefinitions({
		enabledComponentType: {
			name: 'Component Type Enabled',
			type: 'boolean',
			description:
				'Is active when a component of the selected type is enabled. To select a device, you first need to create and configure a device in MiruSuite.',
			defaultStyle: {
				bgcolor: 0x00ff00,
				color: 0x000000,
			},
			options: [
				getDeviceSelector(self, deviceOptions),
				{
					id: 'componentType',
					type: 'dropdown',
					label: 'Component Type',
					choices: [
						{ id: 'INPUT', label: 'Input' },
						{ id: 'CONTROLLER', label: 'Controller' },
						{ id: 'DIRECTOR', label: 'Director' },
						{ id: 'AUTO_CUT', label: 'AutoCut' },
						{ id: 'MUSIC_FOLLOWER', label: 'Music Follower' },
					],
					default: 'DIRECTOR',
				},
			],
			callback: async (feedback) => {
				const deviceId = Number(feedback.options.deviceId)
				const device = store.getDeviceById(deviceId)
				if (!device) {
					return false
				}
				const componentType = feedback.options.componentType as
					| 'INPUT'
					| 'CONTROLLER'
					| 'DIRECTOR'
					| 'AUTO_CUT'
					| 'MUSIC_FOLLOWER'
				const components = getComponentsOfType(device, componentType)
				return components.some((component) => device.feedback?.[component]?.state === 'RUNNING')
			},
		},
		directorStatus: {
			name: 'Director Status',
			type: 'advanced',
			description:
				'Turns green when the director is running, yellow when in warning state, and red when in error state. To select a device, you first need to create a device in MiruSuite and add a video input to it. This action needs a director be installed on the device.',
			options: [getDeviceSelector(self, videoDeviceChoices)],
			affectedProperties: ['bgcolor', 'color'],
			callback: async (feedback) => {
				const deviceId = Number(feedback.options.deviceId)
				const device = store.getDeviceById(deviceId)
				const headTrackingDirector = device?.feedback?.['DIRECTOR_HEAD_TRACKING']
				let state: ComponentState = 'OFF'
				if (headTrackingDirector) {
					state = headTrackingDirector.state ?? 'OFF'
				}
				const autoMoveDirector = device?.feedback?.['DIRECTOR_AUTO_MOVE']
				if (autoMoveDirector) {
					state = autoMoveDirector.state ?? 'OFF'
				}
				const lectureDirector = device?.feedback?.['DIRECTOR_LECTURE']
				if (lectureDirector) {
					state = lectureDirector.state ?? 'OFF'
				}
				if (state == 'RUNNING') {
					return {
						bgcolor: 0x00ff00,
						color: 0x000000,
					}
				} else if (state == 'WARN' || state == 'ERROR') {
					return {
						bgcolor: 0xffff00,
						color: 0x000000,
					}
				} else {
					return {
						bgcolor: 0x000000,
						color: 0xffffff,
					}
				}
			},
		},
		trackingMode: {
			name: 'Tracking Mode',
			type: 'advanced',
			description:
				'Get the tracking mode for a device. The person option is only used in SINGLE mode. To select a device, you first need to create a device in MiruSuite and add a video input to it. This action needs a director be installed on the device.',
			options: [
				{
					type: 'dropdown',
					label: 'Mode',
					id: 'mode',
					default: 'ALL',
					choices: [
						{ id: 'ALL', label: 'ALL' },
						{ id: 'MANUAL', label: 'MANUAL' },
						{ id: 'SINGLE', label: 'SINGLE' },
					],
				},
				getFaceSelector(self, faceChoices),
				getDeviceSelector(self, videoDeviceChoices),
			],
			affectedProperties: ['bgcolor', 'color', 'png64'],
			callback: async (feedback, _) => {
				const deviceId = Number(feedback.options.deviceId)
				const device = store.getDeviceById(deviceId)
				const personTracker = device?.components?.personTracker
				const person = personTracker?.targetFaceId
				const mode = personTracker?.trackingMode
				if (feedback.options.mode == 'SINGLE') {
					const active = mode == feedback.options.mode && person == Number(feedback.options.person)
					// display image
					const img = await backend?.loadPreviewImage(Number(feedback.options.person))
					const png64 = await img
						?.scaleToFit(feedback.image?.width ?? 72, feedback.image?.height ?? 72)
						.getBase64Async('image/png')
					if (active) {
						return {
							bgcolor: 0xff0000,
							color: 0x000000,
							png64,
						}
					} else {
						return {
							png64,
						}
					}
				} else {
					if (mode == feedback.options.mode) {
						return {
							bgcolor: 0xff0000,
						}
					} else {
						return {
							bgcolor: 0x000000,
						}
					}
				}
			},
		},
		shotSize: {
			name: 'Shot Size',
			type: 'boolean',
			description:
				'Check if the shot size is set to a specific value. To select a device, you first need to create a device in MiruSuite and add a video input to it. This action needs a head trracking director be installed on the device.',
			defaultStyle: {
				bgcolor: 0xff0000,
				color: 0x000000,
			},
			options: [
				{
					id: 'size',
					type: 'dropdown',
					label: 'Size',
					default: 'WIDE',
					choices: [
						{ id: 'CLOSE_UP', label: 'Close' },
						{ id: 'MEDIUM', label: 'Medium' },
						{ id: 'WIDE', label: 'Wide' },
					],
				},
				getDeviceSelector(self, videoDeviceChoices),
			],
			callback: async (feedback) => {
				const deviceId = Number(feedback.options.deviceId)
				const device = store.getDeviceById(deviceId)
				const headTrackingDirector = device?.components?.headTrackingDirector
				if (headTrackingDirector) {
					return headTrackingDirector.targetShotSize === feedback.options.size
				}
				return false
			},
		},
		activePreset: {
			name: 'Is Preset Active',
			type: 'boolean',
			description:
				'Check if a specific preset is active. To select a device, you first need to create a device in MiruSuite and add a video input to it.',
			defaultStyle: {
				bgcolor: 0xff0000,
				color: 0xfffff,
			},
			options: [getPresetSelector(self, presetChoices)],
			callback: async (feedback) => {
				const presetId = Number(feedback.options.preset)
				return isPresetActive(self, presetId)
			},
		},
		liveDevice: {
			name: 'Live Device',
			type: 'boolean',
			description:
				'Check if a specific device is live. To select a device, you first need to create a device in MiruSuite and add a video input to it.',
			defaultStyle: {
				bgcolor: 0xff0000,
				color: 0xfffff,
			},
			options: [getDeviceSelector(self, videoDeviceChoices)],
			callback: async (feedback) => {
				const deviceId = Number(feedback.options.deviceId)
				return isDeviceLive(self, deviceId2SwitcherInput, deviceId)
			},
		},
		liveInput: {
			name: 'Live Input',
			type: 'boolean',
			description: 'Check if a specific input is live.',
			defaultStyle: {
				bgcolor: 0xff0000,
				color: 0xfffff,
			},
			options: [
				{
					id: 'input',
					type: 'textinput',
					label: 'Input',
					default: '1',
				},
			],
			callback: async (feedback) => {
				const input = feedback.options.input
				return isInputLive(self, typeof input === 'string' || typeof input === 'number' ? String(input) : '')
			},
		},
		autoCut: {
			name: 'Auto Cut Active',
			type: 'boolean',
			description: 'Check if AutoCut is running.',
			defaultStyle: {
				bgcolor: 0xff0000,
				color: 0xfffff,
			},
			options: [],
			callback: (_) => {
				return store.isAutoCutRunning()
			},
		},
		dominantSpeakerOverride: {
			name: 'Dominant Speaker Override Active',
			type: 'boolean',
			description: 'Check if Dominant Speaker Override is set.',
			defaultStyle: {
				bgcolor: 0x00ff00,
				color: 0x000000,
			},
			options: [getDeviceSelector(self, audioDeviceChoices)],
			callback: (feedback) => {
				const override = store.getDominantSpeakerOverride()
				const deviceId = Number(feedback.options.deviceId)
				return override !== null && override === deviceId
			},
		},
		vMixFramerEnabled: {
			name: 'vMix Framer Enabled',
			type: 'boolean',
			description:
				"Is active when the device's vMix Framer component is enabled. To select a device, you first need to create a device in MiruSuite and add a video input to it. This feedback requires a vMix Framer to be installed on the device.",
			defaultStyle: {
				bgcolor: 0x00ff00,
				color: 0x000000,
			},
			options: [getDeviceSelector(self, videoDeviceChoices)],
			callback: async (feedback) => {
				const deviceId = Number(feedback.options.deviceId)
				const device = store.getDeviceById(deviceId)
				return device?.feedback?.['FRAMER_VMIX']?.state === 'RUNNING'
			},
		},
		controllerConnected: {
			name: 'Controller Connected',
			type: 'boolean',
			description: 'Checks the latest live controller connection state reported by MiruSuite.',
			defaultStyle: { bgcolor: 0x00ff00, color: 0x000000 },
			options: [getDeviceSelector(self, videoDeviceChoices)],
			callback: (feedback) => {
				const state = store.getLiveState('controller', Number(feedback.options.deviceId))
				return state?.target === 'controller' && state.connectionState === 'CONNECTED'
			},
		},
		framingStable: {
			name: 'Framing Stable',
			type: 'boolean',
			description: 'Checks whether live tracking state reports stable framing for a device.',
			defaultStyle: { bgcolor: 0x00ff00, color: 0x000000 },
			options: [getDeviceSelector(self, videoDeviceChoices)],
			callback: (feedback) => {
				const state = store.getLiveState('framingStable', Number(feedback.options.deviceId))
				return state?.target === 'framingStable' && state.enabled === true
			},
		},
		dominantSpeaker: {
			name: 'Is Dominant Speaker',
			type: 'boolean',
			description:
				'Checks the automatically detected dominant speaker. This is separate from a manually set speaker override.',
			defaultStyle: { bgcolor: 0x00ff00, color: 0x000000 },
			options: [getDeviceSelector(self, audioDeviceChoices)],
			callback: (feedback) => store.getDominantSpeaker()?.id === Number(feedback.options.deviceId),
		},
		activeProject: {
			name: 'Active Project',
			type: 'boolean',
			description: 'Checks whether the selected MiruSuite project is active.',
			defaultStyle: { bgcolor: 0x00ff00, color: 0x000000 },
			options: [
				{
					id: 'projectId',
					type: 'dropdown',
					label: 'Project',
					choices: store
						.getProjects()
						.map((project) => ({ id: project.id ?? -1, label: project.name ?? `Project ${project.id}` })),
					default: store.getProjects()[0]?.id ?? -1,
				},
			],
			callback: (feedback) => store.getActiveProject()?.id === Number(feedback.options.projectId),
		},
		gamepadSelectedDevice: {
			name: 'Gamepad Camera Selected',
			type: 'boolean',
			description: 'Checks whether the selected device is assigned to MiruSuite’s shared gamepad.',
			defaultStyle: { bgcolor: 0x00ff00, color: 0x000000 },
			options: [getDeviceSelector(self, videoDeviceChoices)],
			callback: (feedback) => store.getGamepadDeviceId() === Number(feedback.options.deviceId),
		},
		autoCutState: {
			name: 'AutoCut Live State',
			type: 'boolean',
			description: 'Checks the current AutoCut live state reported by MiruSuite.',
			defaultStyle: { bgcolor: 0xff0000, color: 0x000000 },
			options: [
				{
					id: 'state',
					type: 'dropdown',
					label: 'State',
					choices: ['STAGE', 'SPEAKER', 'PIP', 'PRESENTATION', 'AUDIENCE'].map((id) => ({ id, label: id })),
					default: 'STAGE',
				},
			],
			callback: (feedback) => {
				const state = store.getLiveState('autoCutState')
				return state?.target === 'autoCutState' && state.state === feedback.options.state
			},
		},
		musicFollower: {
			name: 'Music Follower Status',
			type: 'boolean',
			description: 'Checks the live status of a device Music Follower component.',
			defaultStyle: { bgcolor: 0x00ff00, color: 0x000000 },
			options: [
				{
					id: 'status',
					type: 'dropdown',
					label: 'Status',
					choices: [
						'DISABLED',
						'PAUSED',
						'WAITING_FOR_SELECTION',
						'WAITING_FOR_ANALYSIS',
						'TRACKING',
						'HALTED',
						'ENDED',
						'ERROR',
					].map((id) => ({ id, label: id.replaceAll('_', ' ') })),
					default: 'TRACKING',
				},
				getDeviceSelector(
					self,
					createDeviceOptions(store.getDevices().filter((device) => device.components?.musicFollower != null)),
				),
			],
			callback: (feedback) =>
				store.getMusicFollowerState(Number(feedback.options.deviceId))?.status === feedback.options.status,
		},
		musicFollowerPieceSelected: {
			name: 'Music Follower Piece Selected',
			type: 'boolean',
			description: 'Checks whether this piece is selected by the device Music Follower.',
			defaultStyle: { bgcolor: 0x008000, color: 0xffffff },
			options: [
				getDeviceSelector(
					self,
					createDeviceOptions(store.getDevices().filter((device) => device.components?.musicFollower != null)),
				),
				{
					id: 'pieceId',
					type: 'number',
					label: 'Piece ID',
					default: -1,
				},
			],
			callback: (feedback) =>
				store.getMusicFollowerState(Number(feedback.options.deviceId))?.selectedPieceId ===
				Number(feedback.options.pieceId),
		},
		musicFollowerSetlistEntrySelected: {
			name: 'Music Follower Setlist Entry Selected',
			type: 'boolean',
			description: 'Checks whether this setlist entry is selected by the device Music Follower.',
			defaultStyle: { bgcolor: 0x008000, color: 0xffffff },
			options: [
				getDeviceSelector(
					self,
					createDeviceOptions(store.getDevices().filter((device) => device.components?.musicFollower != null)),
				),
				{ id: 'setlistId', type: 'number', label: 'Setlist ID', default: -1 },
				{ id: 'entryId', type: 'number', label: 'Entry ID', default: -1 },
			],
			callback: (feedback) => {
				const state = store.getMusicFollowerState(Number(feedback.options.deviceId))
				return (
					state?.selectedSetlistId === Number(feedback.options.setlistId) &&
					state?.selectedSetlistEntryId === Number(feedback.options.entryId)
				)
			},
		},
		orchestraSetting: {
			name: 'Orchestra Setting',
			type: 'boolean',
			description:
				'Checks an Orchestra setting against a selected value. For excluded devices, use the device ID as the value.',
			defaultStyle: { bgcolor: 0x00ff00, color: 0x000000 },
			options: [
				{
					id: 'setting',
					type: 'dropdown',
					label: 'Setting',
					choices: [
						{ id: 'movePreviewCameras', label: 'Move preview cameras' },
						{ id: 'moveCameraCount', label: 'Cameras to move' },
						{ id: 'saveCameraGain', label: 'Save camera gain' },
						{ id: 'saveDirectorSettings', label: 'Save director settings' },
						{ id: 'autoMoveCameras', label: 'Automatically move cameras' },
						{ id: 'audioCalloutPrepLeadSeconds', label: 'Audio callout lead time' },
						{ id: 'audioCalloutPrepGroupWindowSeconds', label: 'Audio callout group window' },
						{ id: 'cameraPreparationLeadSeconds', label: 'Camera preparation lead time' },
						{ id: 'disabledDeviceIds', label: 'Excluded device IDs' },
					],
					default: 'movePreviewCameras',
				},
				{ id: 'value', type: 'textinput', label: 'Expected value', default: 'true' },
			],
			callback: (feedback) => {
				const setting = feedback.options.setting
				const key = typeof setting === 'string' ? setting : ''
				const actual = store.getOrchestraSettings()[key as keyof OrchestraSettings]
				const value = feedback.options.value
				const expected = typeof value === 'string' || typeof value === 'number' ? String(value) : ''
				if (key === 'disabledDeviceIds') return (actual as number[] | undefined)?.includes(Number(expected)) ?? false
				if (typeof actual === 'boolean')
					return expected === 'toggle' ? actual : String(actual) === expected.toLowerCase()
				if (typeof actual === 'number') return actual === Number(expected)
				return false
			},
		},
	})
}
