import type { MiruSuiteModuleInstance } from '../main.js'
import { action, button, feedback, type LegacyPresets } from './helpers.js'

export function getGamepadPresets(self: MiruSuiteModuleInstance): LegacyPresets {
	const presets: LegacyPresets = {}
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
