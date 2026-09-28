import { type CompanionActionEvent, type DropdownChoice } from '@companion-module/base'
import type { MiruSuiteModuleInstance } from '../main.js'
import { createDeviceOptions, getDeviceSelector } from '../scripts/helpers.js'

type Actions = Record<string, any>

export function GetAutoCutActions(self: MiruSuiteModuleInstance): Actions {
	const backend = self.backend
	const store = self.store
	const audioDeviceOptions: DropdownChoice[] = createDeviceOptions(store.getAudioDevices())
	return {
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
			callback: async (event: CompanionActionEvent) => {
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
			async callback(event: CompanionActionEvent) {
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
	}
}
