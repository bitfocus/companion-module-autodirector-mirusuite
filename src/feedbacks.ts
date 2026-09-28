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
import { type ComponentState } from './api/types.js'

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
				const componentType = feedback.options.componentType as 'INPUT' | 'CONTROLLER' | 'DIRECTOR' | 'AUTO_CUT'
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
				return isInputLive(self, feedback.options.input?.toString() ?? '')
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
	})
}
