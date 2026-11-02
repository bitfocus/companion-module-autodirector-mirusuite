import type { MiruSuiteModuleInstance } from '../main.js'
import { action, button, type CategorizedPresets } from './helpers.js'

export function getCameraWorkflowPresets(self: MiruSuiteModuleInstance): CategorizedPresets {
	const presets: CategorizedPresets = {}
	for (const device of self.store.getVideoDevices()) {
		if (device.id === undefined || device.components?.headTrackingDirector == null) continue
		presets[`correctFraming-${device.id}`] = button('Person Tracking', 'Correct\nFraming Once', [
			action('correctFraming', { deviceId: device.id }),
		])
	}
	return presets
}
