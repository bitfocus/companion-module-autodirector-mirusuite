import { CompanionFeedbackAdvancedEvent, DropdownChoice } from '@companion-module/base'
import type { MiruSuiteModuleInstance } from './main.js'
import {
	getDeviceSelector,
	getFaceSelector,
	getPresetSelector,
	createFaceOptions,
	getPresetChoices,
	isPresetActive,
	getDeviceIdToSwitcherInputMap,
	isPresetLive,
	isDeviceLive,
	isInputLive,
	getDisplayableDeviceNamesFromPreset,
	createDeviceOptions,
} from './scripts/helpers.js'
import {
	AutoConfiguredButton,
	getAutoBankButtons,
	getFilteredPresets,
	getIndexOfButton,
	getPresetToButton,
	isDisplayDeviceName,
} from './scripts/autolearning.js'
import Jimp from 'jimp'
import { getColorByInstrument } from './scripts/instrumentcolors.js'
import { type ComponentState } from './api/types.js'

export function UpdateFeedbacks(self: MiruSuiteModuleInstance): void {
	const backend = self.backend
	const store = self.store
	const faceChoices: DropdownChoice[] = createFaceOptions(self)
	const videoDeviceChoices: DropdownChoice[] = createDeviceOptions(store.getVideoDevices())
	const audioDeviceChoices: DropdownChoice[] = createDeviceOptions(store.getAudioDevices())
	const presetChoices: DropdownChoice[] = getPresetChoices(self, videoDeviceChoices)
	const deviceId2SwitcherInput = getDeviceIdToSwitcherInputMap(self)
	const presets = store.getPresets()
	self.setFeedbackDefinitions({
		enabledDirector: {
			name: 'Director Enabled',
			type: 'boolean',
			description:
				"Is active when the device's director component is enabled. To select a device, you first need to create a device in MiruSuite and add a video input to it. This action needs a director be installed on the device.",
			defaultStyle: {
				bgcolor: 0x00ff00,
				color: 0x000000,
			},
			options: [getDeviceSelector(self, videoDeviceChoices)],
			callback: async (feedback) => {
				const deviceId = Number(feedback.options.deviceId)
				const device = store.getDeviceById(deviceId)
				return (
					device?.feedback['DIRECTOR_HEAD_TRACKING']?.state === 'RUNNING' ||
					device?.feedback['DIRECTOR_LECTURE']?.state === 'RUNNING' ||
					device?.feedback['DIRECTOR_AUTO_MOVE']?.state === 'RUNNING'
				)
			},
		},
		directorStatus: {
			name: 'Director Status',
			type: 'advanced',
			description:
				'Turns green when the director is running, yellow when in warning state, and red when in error state. To select a device, you first need to create a device in MiruSuite and add a video input to it. This action needs a director be installed on the device.',
			options: [getDeviceSelector(self, videoDeviceChoices)],
			callback: async (feedback) => {
				const deviceId = Number(feedback.options.deviceId)
				const device = store.getDeviceById(deviceId)
				const headTrackingDirector = device?.feedback['DIRECTOR_HEAD_TRACKING']
				let state: ComponentState = 'OFF'
				if (headTrackingDirector) {
					state = headTrackingDirector.state
				}
				const autoMoveDirector = device?.feedback['DIRECTOR_AUTO_MOVE']
				if (autoMoveDirector) {
					state = autoMoveDirector.state
				}
				const lectureDirector = device?.feedback['DIRECTOR_LECTURE']
				if (lectureDirector) {
					state = lectureDirector.state
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
			callback: async (feedback, _) => {
				const deviceId = Number(feedback.options.deviceId)
				const device = store.getDeviceById(deviceId)
				const personTracker = device?.components['personTracker']
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
				const headTrackingDirector = device?.components['headTrackingDirector']
				if (headTrackingDirector) {
					return headTrackingDirector.targetShotSize === feedback.options.sizef
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
		learnMode: {
			name: 'Learn Mode',
			type: 'advanced',
			options: [],
			callback: async (event) => {
				self.log('debug', 'Learn Mode feedback')
				const learnMode = self.getVariableValue('learningMode') === event.controlId
				const learnedButtonsCount = getAutoBankButtons(event.controlId).length
				const filteredPresetsCount = getFilteredPresets(presets, event.controlId).length
				const numberText = '(' + filteredPresetsCount + '/' + learnedButtonsCount + ')'
				self.log('debug', 'Learn Mode feedback: ' + learnMode + ' ' + numberText)
				if (learnMode) {
					return {
						bgcolor: 0x012bfc, // blue
						color: 0xfffff,
						text: 'Learning Save? ' + numberText,
					}
				} else {
					if (learnedButtonsCount < filteredPresetsCount) {
						return {
							bgcolor: 0xe6d700, // yellow
							color: 0xfffff,
							text: 'Learn Presets ' + numberText,
						}
					} else {
						return {
							bgcolor: 0x002800,
							color: 0xfffff,
							text: 'Learn Presets ' + numberText,
						}
					}
				}
			},
		},
		autoPreset: {
			name: 'Auto Preset',
			type: 'advanced',
			options: [],
			callback: async (feedback, _) => {
				const thisButton: AutoConfiguredButton = {
					id: feedback.controlId,
				}
				const preset = getPresetToButton(presets, thisButton)
				let presetLabel = ''
				if (preset) {
					presetLabel = preset?.name ?? 'Unknown'
					if (isDisplayDeviceName(thisButton)) {
						presetLabel += '\n(' + getDisplayableDeviceNamesFromPreset(preset, videoDeviceChoices) + ')'
					}
				}
				const [index, bank] = getIndexOfButton(thisButton)
				const learningMode = self.getVariableValue('learningMode')
				if (learningMode != 'disabled') {
					// LEARNING MODE
					if (index > -1) {
						if (bank == learningMode) {
							// learned for this bank
							return {
								bgcolor: 0x00ff00,
								color: 0x000000,
								text: '#' + index,
							}
						} else {
							// learned for another bank
							return {
								bgcolor: 0xffff00,
								color: 0x000000,
								text: 'Overwrite?',
							}
						}
					} else {
						return {
							bgcolor: 0xff0000,
							color: 0xfffff,
							text: 'Learning',
						}
					}
				} else {
					// LIVE MODE
					if (index > -1) {
						if (preset == undefined) {
							return await displayLOGO(feedback)
						} else {
							const active = isPresetActive(self, Number(preset.id))
							const live = isPresetLive(self, deviceId2SwitcherInput, presets, Number(preset.id))
							if (active) {
								if (live) {
									// dark red bg, grey text
									return {
										bgcolor: 0x640000,
										color: 0x969696,
										text: presetLabel,
									}
								} else {
									// red bg, white text
									return {
										bgcolor: 0xff0000,
										color: 0xfffff,
										text: presetLabel,
									}
								}
							} else {
								if (live) {
									// black bg, grey text
									return {
										bgcolor: getColorByInstrument(preset?.metadata?.instrument ?? 'Unknown'),
										color: 0x8c8c8c,
										text: presetLabel,
									}
								} else {
									// black bg, white text
									return {
										bgcolor: getColorByInstrument(preset?.metadata?.instrument ?? 'Unknown'),
										color: 0xfffff,
										text: presetLabel,
									}
								}
							}
						}
					} else {
						return await displayLOGO(feedback)
					}
				}
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
	})
}
async function displayLOGO(feedback: CompanionFeedbackAdvancedEvent) {
	const img = await Jimp.read('dist/static/icon.png')
	const png64 = await img
		?.scaleToFit(feedback.image?.width ?? 72, feedback.image?.height ?? 72)
		.getBase64Async('image/png')
	if (png64 == undefined) {
		return {
			text: 'Auto Preset',
			bgcolor: 0x000000,
			color: 0xfffff,
		}
	} else {
		return {
			png64,
			text: '',
		}
	}
}
