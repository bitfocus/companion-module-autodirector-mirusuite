import type { MiruSuiteModuleInstance } from '../main.js'
import { action, button, type LegacyPresets } from './helpers.js'

export function getCameraWorkflowPresets(self: MiruSuiteModuleInstance): LegacyPresets {
	const presets: LegacyPresets = {}
	for (const device of self.store.getVideoDevices()) {
		if (device.id === undefined || device.components?.headTrackingDirector == null) continue
		presets[`correctFraming-${device.id}`] = button('Person Tracking', 'Correct\nFraming Once', [
			action('correctFraming', { deviceId: device.id }),
		])
	}
	return presets
}
