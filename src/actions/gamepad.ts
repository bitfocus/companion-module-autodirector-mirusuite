import type { MiruSuiteModuleInstance } from '../main.js'
import type { CompanionActionEvent } from '@companion-module/base'
import { createDeviceOptions } from '../scripts/helpers.js'

type Actions = Record<string, any>

export function GetGamepadActions(self: MiruSuiteModuleInstance): Actions {
	const devices = createDeviceOptions(self.store.getVideoDevices())
	const choices = [{ id: -1, label: 'Clear selection' }, ...devices]
	return {
		setGamepadDevice: {
			name: 'Set Gamepad Camera',
			description: 'Select the shared camera controlled by the MiruSuite gamepad, or clear the selection.',
			options: [
				{
					id: 'deviceId',
					type: 'dropdown',
					label: 'Camera',
					choices,
					default: self.store.getGamepadDeviceId() ?? -1,
				},
			],
			async callback(event: CompanionActionEvent) {
				const selected = Number(event.options.deviceId)
				if (
					selected !== -1 &&
					(!Number.isInteger(selected) || !self.store.getVideoDevices().some((device) => device.id === selected))
				) {
					self.log('warn', `Cannot assign gamepad: video device ${selected} is not available`)
					return
				}
				await self.backend?.setGamepadSelectedDevice(selected < 0 ? null : selected)
				await self.store.loadGamepadSelectedDevice()
				self.updateVariableValues()
				self.checkFeedbacks('gamepadSelectedDevice')
			},
		},
	}
}
