import type { MiruSuiteModuleInstance } from '../main.js'
import { action, button, feedback, type CategorizedPresets } from './helpers.js'

export function getGamepadPresets(self: MiruSuiteModuleInstance): CategorizedPresets {
	const presets: CategorizedPresets = {}
	for (const device of self.store.getVideoDevices()) {
		if (device.id === undefined) continue
		presets[`gamepadCamera-${device.id}`] = button(
			'Gamepad',
			`Gamepad\n${device.name ?? `Device ${device.id}`}`,
			[action('setGamepadDevice', { deviceId: device.id })],
			[feedback('gamepadSelectedDevice', { deviceId: device.id })],
		)
	}
	return presets
}
