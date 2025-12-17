import { DropdownChoice } from '@companion-module/base'
import { ShotSize, TrackingMode } from './api/types.js'
import type { MiruSuiteModuleInstance } from './main.js'
import {
	createDeviceOptions,
	getDeviceSelector,
	getFaceSelector,
	getInstrumentGroupSelector,
	getPresetSelector,
	createFaceOptions,
	getPresetChoices,
} from './scripts/helpers.js'
import {
	AutoConfiguredButton,
	addAutoButton as learnAutoButton,
	clearLearnedButtons,
	getIndexOfButton,
	getPresetToButton,
	setSelectedDevices,
	clearAllAutoButtons,
	setSelectedInstruments,
	setDisplayDeviceName,
} from './scripts/autolearning.js'

export function UpdateActions(self: MiruSuiteModuleInstance): void {
	const backend = self.backend
	const store = self.store
	const faceChoices: DropdownChoice[] = createFaceOptions(self)
	const videoDevices = store.getVideoDevices()
	const videoDeviceOptions: DropdownChoice[] = createDeviceOptions(videoDevices)
	const audioDeviceOptions: DropdownChoice[] = createDeviceOptions(store.getAudioDevices())
	const presetChoices: DropdownChoice[] = getPresetChoices(self, videoDeviceOptions)
	const presets = store.getPresets()

	self.setActionDefinitions({
		setShotSize: {
			name: 'Set Shot Size',
			description: 'Set the shot size for a device.',
			options: [
				{
					id: 'size',
					type: 'dropdown',
					label: 'Size',
					choices: [
						{ id: 'CLOSE_UP', label: 'Close' },
						{ id: 'MEDIUM', label: 'Medium' },
						{ id: 'WIDE', label: 'Wide' },
					],
					default: 'WIDE',
				},
				getDeviceSelector(self, videoDeviceOptions),
			],
			async callback(event) {
				const size = event.options.size as ShotSize
				const deviceId = Number(event.options.deviceId)
				const device = store.getDeviceById(deviceId)
				self.log('info', 'Setting shot size for device ' + deviceId + ' to ' + size)
				await backend?.setShotSize(device, size)
			},
		},
		toggleDirector: {
			name: 'Toggle Director',
			description:
				'Enables/disables the director. Use this if you want to temporarily disable tracking. This action needs a director to be installed on the device.',
			options: [getDeviceSelector(self, videoDeviceOptions)],
			async callback(event) {
				const deviceId = Number(event.options.deviceId)
				const device = store.getDeviceById(deviceId)
				self.log('info', 'Toggling director for device ' + deviceId)
				await backend?.toggleDirector(device)
			},
		},
		setDirector: {
			name: 'Enable/Disable Director',
			description:
				'Enable or disable the director for a device. This action needs a director to be installed on the device.',
			options: [
				getDeviceSelector(self, videoDeviceOptions),
				{
					id: 'enabled',
					type: 'dropdown',
					label: 'Enable',
					choices: [
						{ id: 'true', label: 'Enable' },
						{ id: 'false', label: 'Disable' },
					],
					default: 'true',
				},
			],
			async callback(event) {
				const deviceId = Number(event.options.deviceId)
				const device = store.getDeviceById(deviceId)
				const enable = event.options.enabled == 'true'
				self.log('info', 'Setting director for device ' + deviceId + ' to ' + enable)
				await backend?.toggleDirector(device, enable)
			},
		},
		setTrackingMode: {
			name: 'Set Tracking Mode',
			description:
				'Set the tracking mode for a device. The person option is only used in SINGLE mode. This action needs a head tracking director to be installed on the device.',
			options: [
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Mode',
					choices: [
						{ id: 'ALL', label: 'ALL' },
						{ id: 'MANUAL', label: 'MANUAL' },
						{ id: 'SINGLE', label: 'SINGLE' },
					],
					default: 'ALL',
				},
				getFaceSelector(self, faceChoices),
				getDeviceSelector(self, videoDeviceOptions),
			],
			async callback(event) {
				const mode = event.options.mode as TrackingMode
				const deviceId = Number(event.options.deviceId)
				const device = store.getDeviceById(deviceId)
				const person = Number(event.options.person)
				self.log('info', 'Setting tracking mode for device ' + deviceId + ' to ' + mode + ' with person ' + person)
				await backend?.setTrackingMode(device, mode, person)
			},
		},
		learnTargetFace: {
			name: 'Learn Target Face',
			description:
				'Learn the face of the current target person. Use this action to teach MiruSuite the face of a person. This action needs a person tracker to be installed on the device.',
			options: [getDeviceSelector(self, videoDeviceOptions)],
			async callback(event) {
				const deviceId = Number(event.options.deviceId)
				const device = store.getDeviceById(deviceId)
				self.log('info', 'Learning face for device ' + deviceId)
				await backend?.learnTargetFace(device)
			},
		},
		playPreset: {
			name: 'Play Preset',
			description: 'Play a preset. ',
			options: [
				getPresetSelector(self, presetChoices),
				{
					id: 'force',
					type: 'checkbox',
					label: 'Force play (even if camera is live)',
					default: false,
				},
			],
			async callback(event) {
				const presetId = Number(event.options.preset)
				const force = event.options.force as boolean
				self.log('info', 'Playing preset ' + presetId + ' with force=' + force)
				await backend?.playPreset(presetId, force)
			},
		},
		playActivePreset: {
			name: 'Play Active Preset',
			description:
				'Re-apply the active preset of a camera. Use this action if you want to return a camera to its active preset if it has moved away.',
			options: [
				getDeviceSelector(self, videoDeviceOptions),
				{
					id: 'force',
					type: 'checkbox',
					label: 'Force play (even if camera is live)',
					default: false,
				},
			],
			async callback(event) {
				const deviceId = Number(event.options.deviceId)
				const force = event.options.force as boolean
				self.log('info', 'Re-applying preset of device ' + deviceId + ' with force=' + force)
				await backend?.playActivePreset(deviceId, force)
			},
		},
		overwritePreset: {
			name: 'Overwrite Preset',
			description: 'Overwrite a preset with the current device position',
			options: [getPresetSelector(self, presetChoices)],
			async callback(event) {
				const presetId = Number(event.options.preset)
				self.log('info', 'Overwriting preset ' + presetId)
				await backend?.overwritePreset(presetId)
			},
		},
		learnAutoButtons: {
			name: 'Learn Auto Preset Buttons',
			description:
				'1. Press this button to start learning. 2. Press your auto preset buttons in the order you want them to be used. 3. Press this button again to finish the learning. Available presets for the configured devices will be automatically arranged on the learned buttons. WARNING: When changing the configuration of this button, you will need to repeat the learning process.',
			options: [
				getDeviceSelector(self, videoDeviceOptions, true, 'Select devices'),
				getInstrumentGroupSelector(),
				{
					id: 'displayName',
					type: 'checkbox',
					label: 'Display Device Names',
					default: 'false',
				},
			],
			async callback(event) {
				if (self.getVariableValue('learningMode') === 'disabled') {
					let devices = []
					if (event.options.deviceIds instanceof String) {
						devices = (event.options.deviceIds as string).split(',').map((id) => Number(id.trim()))
					} else {
						devices = event.options.deviceIds as number[]
					}
					self.log('debug', 'Learning auto preset buttons for ' + event.controlId)
					self.log('debug', 'Selected devices: ' + JSON.stringify(devices))
					if (devices.length === 0) {
						self.log('warn', 'No devices selected')
						return
					}
					self.setVariableValues({ learningMode: event.controlId })
					clearLearnedButtons(self, event.controlId)
					setSelectedDevices(self, event.controlId, devices)
					setDisplayDeviceName(self, event.controlId, event.options.displayName as boolean)
					const instrumentGroups = event.options.instrumentGroups as string[]
					if (!instrumentGroups || instrumentGroups.includes('All')) {
						setSelectedInstruments(self, event.controlId, [])
					} else {
						setSelectedInstruments(self, event.controlId, instrumentGroups)
					}
					self.checkFeedbacks('learnMode', 'autoPreset')
				} else {
					self.log('debug', 'Stopping learning auto preset buttons for ' + event.controlId + '...')
					self.setVariableValues({ learningMode: 'disabled' })
					self.checkFeedbacks('learnMode', 'autoPreset')
				}
			},
		},
		playAutoPreset: {
			name: 'Play Auto Preset',
			description: 'Play the automatically linked preset',
			options: [],
			async callback(event) {
				const thisButton: AutoConfiguredButton = {
					id: event.controlId,
				}
				const [index, bank] = getIndexOfButton(thisButton)
				const learningMode = String(self.getVariableValue('learningMode'))
				if (learningMode != 'disabled') {
					// Learning mode
					if (index > -1 && bank === learningMode) {
						// Already learned by this bank
						return
					}
					learnAutoButton(self, learningMode, {
						id: event.controlId,
					})
				} else {
					self.log('info', 'Playing auto preset...')
					const preset = getPresetToButton(presets, thisButton)
					if (preset === undefined) {
						self.log('warn', 'Preset not set for button ' + index)
						return
					}
					const presetId = Number(preset?.id ?? -1)
					await backend?.playPreset(presetId, false)
				}
				self.checkFeedbacks('autoPreset', 'learnMode')
			},
		},
		overwriteAutoPreset: {
			name: 'Overwrite Auto Preset',
			description: 'Overwrite the automatically linked preset with the current position',
			options: [],
			async callback(event) {
				const thisButton: AutoConfiguredButton = {
					id: event.controlId,
				}
				const [index] = getIndexOfButton(thisButton)
				const learningMode = String(self.getVariableValue('learningMode'))
				if (learningMode !== 'disabled') {
					// do nothing
					return
				}
				self.log('debug', 'Overwriting auto preset...')
				const preset = getPresetToButton(presets, thisButton)
				if (preset == undefined) {
					self.log('warn', 'Preset not set for button ' + index)
					return
				}
				const presetId = Number(preset?.id ?? -1)
				await backend?.overwritePreset(presetId)
				self.checkFeedbacks('autoPreset', 'learnMode')
			},
		},
		clearAllAutoButtons: {
			name: 'Clear All Auto Buttons',
			description: 'Clear all auto button data. This action is only for debugging purposes.',
			options: [],
			async callback() {
				clearAllAutoButtons(self)
				self.checkFeedbacks('learnMode', 'autoPreset')
			},
		},
		triggerMovement: {
			name: 'Trigger move',
			description:
				'Execute a preset or random move on an auto-move director. This action needs an auto-move director to be installed on the device.',
			options: [
				getDeviceSelector(self, videoDeviceOptions),
				{
					id: 'type',
					type: 'dropdown',
					label: 'Movement type',
					choices: [
						{ id: 'preset', label: 'Nearby preset' },
						{ id: 'random', label: 'Random direction' },
					],
					default: 'preset',
				},
			],
			async callback(event) {
				const deviceId = Number(event.options.deviceId)
				if (event.options.type === 'preset') {
					self.log('info', 'Triggering preset transition move for device ' + deviceId)
					await backend?.triggerPresetTransitionMove(deviceId)
				} else if (event.options.type === 'random') {
					self.log('info', 'Triggering random move for device ' + deviceId)
					await backend?.triggerRandomMove(deviceId)
				}
			},
		},
		triggerReturnToHome: {
			name: 'Return to home',
			description: 'Return device to home position. This action needs a PTZ controller to be installed on the device.',
			options: [getDeviceSelector(self, videoDeviceOptions)],
			async callback(event) {
				const deviceId = Number(event.options.deviceId)
				await backend?.triggerReturnToHome(deviceId)
			},
		},
		exitSteadyMode: {
			name: 'Exit steady mode',
			description:
				'Exit steady mode of device. This action needs a head tracking director to be installed on the device.',
			options: [getDeviceSelector(self, videoDeviceOptions)],
			async callback(event) {
				const deviceId = Number(event.options.deviceId)
				await backend?.exitSteadyMode(deviceId)
			},
		},
		stopAutoMove: {
			name: 'Stop move',
			description:
				'Stop auto-movement of device. This action needs an auto-move director to be installed on the device.',
			options: [getDeviceSelector(self, videoDeviceOptions)],
			async callback(event) {
				const deviceId = Number(event.options.deviceId)
				await backend?.stopAutoMove(deviceId)
			},
		},
		toggleAutoCut: {
			name: 'Toggle Auto Cut',
			description: 'Enable, disable or toggle AutoCut. You first need to correctly setup AutoCut in MiruSuite.',
			options: [
				{
					id: 'mode',
					label: 'Mode (on/off/toggle)',
					type: 'dropdown',
					choices: [
						{
							id: 'on',
							label: 'On',
						},
						{
							id: 'off',
							label: 'Off',
						},
						{
							id: 'toggle',
							label: 'Toggle',
						},
					],
					default: '',
				},
			],
			callback: async (event) => {
				switch (event.options.mode) {
					case 'on':
						await backend?.setAutoCut(true)
						break
					case 'off':
						await backend?.setAutoCut(false)
						break
					case 'toggle':
						await backend?.toggleAutoCut()
						break
				}
			},
		},
		cutToInput: {
			name: 'Cut',
			description: 'Cut to an input of the connected switcher.',
			options: [
				{
					id: 'input',
					type: 'textinput',
					label: 'Input',
					default: '',
				},
			],
			async callback(event) {
				await backend?.cutTo(event.options.input?.toString() ?? '')
			},
		},
		updateTargetShotSizeConfig: {
			name: 'Increase Target Shot Size (Config)',
			description: 'Increase the target shot size of a selected shot size',
			options: [
				{
					id: 'size',
					type: 'dropdown',
					label: 'Size',
					choices: [
						{ id: 'CLOSE_UP', label: 'Close' },
						{ id: 'MEDIUM', label: 'Medium' },
						{ id: 'WIDE', label: 'Wide' },
					],
					default: 'WIDE',
				},
				{
					id: 'step',
					type: 'number',
					label: 'Step size',
					default: 0.02,
					min: 0.005,
					max: 0.1,
				},
				{
					id: 'increment',
					type: 'dropdown',
					label: 'Increment / Decrement',
					choices: [
						{ id: '1', label: 'Increment' },
						{ id: '-1', label: 'Decrement' },
					],
					default: '1',
				},
			],
			async callback(event) {
				const size = event.options.size as ShotSize
				const increment = Number(event.options.increment)
				const step = Number(event.options.step)
				self.log('info', 'Updating target shot size for size ' + size + ' by ' + increment + ' with step ' + step)
				await backend?.updateTargetShotSizeConfig(size, increment === 1, step)
			},
		},
		setOverrideDominantSpeaker: {
			name: 'Set Dominant Speaker Override',
			description: 'Set the dominant speaker override to a specific device or clear the override.',
			options: [
				getDeviceSelector(self, audioDeviceOptions),
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Mode',
					choices: [
						{ id: 'enable', label: 'Enable Override' },
						{ id: 'disable', label: 'Disable Override' },
						{ id: 'toggle', label: 'Toggle Override' },
					],
					default: 'toggle',
				},
			],
			async callback(event) {
				const deviceId = Number(event.options.deviceId)
				const device = store.getDeviceById(deviceId)
				const mode = event.options.mode
				let override = true
				if (mode === 'disable') {
					override = false
				} else if (mode === 'toggle') {
					override = store.getDominantSpeakerOverride() !== deviceId
				}
				self.log('info', 'Setting dominant speaker override to device ' + deviceId + ': ' + override)
				await backend?.setOverrideDominantSpeaker(device, override)
			},
		},
		adjustFramer: {
			name: 'vMix Framer: Adjust once',
			description: 'Adjust the framer to the target person once.',
			options: [getDeviceSelector(self, videoDeviceOptions)],
			async callback(event) {
				const deviceId = Number(event.options.deviceId)
				const device = store.getDeviceById(deviceId)
				if (device) {
					self.log('info', 'Adjusting framer for device ' + deviceId)
					await backend?.adjustFramer(device)
				} else {
					self.log('warn', 'Device not found: ' + deviceId)
				}
			},
		},
		moveTargetPoint: {
			name: 'Move Tracking Target',
			description:
				'Move the target point of the head tracking director by the given deltas. Requires the head tracking director.',
			options: [
				getDeviceSelector(self, videoDeviceOptions),
				{
					id: 'deltaX',
					type: 'number',
					label: 'Delta X',
					default: 0,
					min: -1,
					max: 1,
				},
				{
					id: 'deltaY',
					type: 'number',
					label: 'Delta Y',
					default: 0,
					min: -1,
					max: 1,
				},
			],
			async callback(event) {
				const deviceId = Number(event.options.deviceId)
				const device = store.getDeviceById(deviceId)
				if (!device) {
					self.log('warn', 'Moving tracking target: Device not found: ' + deviceId)
					return
				}
				const deltaX = Number(event.options.deltaX)
				const deltaY = Number(event.options.deltaY)
				self.log(
					'info',
					'Moving tracking target for device ' + deviceId + ' by deltaX: ' + deltaX + ', deltaY: ' + deltaY,
				)
				await backend?.moveTargetPoint(device, deltaX, deltaY)
			},
		},
		updateSensitivity: {
			name: 'Update Sensitivity',
			description: 'Update the sensitivity of a head tracking director.',
			options: [
				getDeviceSelector(self, videoDeviceOptions),
				{
					id: 'deltaSensitivity',
					type: 'number',
					label: 'Sensitivity',
					default: 0.1,
					min: -0.3,
					max: 0.3,
					step: 0.01,
				},
			],
			async callback(event) {
				const deviceId = Number(event.options.deviceId)
				const device = store.getDeviceById(deviceId)
				if (!device) {
					self.log('warn', 'Updating sensitivity: Device not found: ' + deviceId)
					return
				}
				const deltaSensitivity = Number(event.options.deltaSensitivity)
				self.log('info', 'Updating sensitivity for device ' + deviceId + ' by ' + deltaSensitivity)
				await backend?.updateSensitivity(device, deltaSensitivity)
			},
		},
	})
}
