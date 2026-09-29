import type { MiruSuiteModuleInstance } from '../main.js'
import { action, button, feedback, type LegacyPresets } from './helpers.js'

export function getProjectPresets(self: MiruSuiteModuleInstance): LegacyPresets {
	const presets: LegacyPresets = {}
	for (const project of self.store.getProjects()) {
		if (project.id === undefined) continue
		presets[`loadProject-${project.id}`] = button(
			'Projects',
			project.name ?? `Project ${project.id}`,
			[
				action('loadProject', {
					projectId: project.id,
					confirmInterruptions: true,
					enableDevices: true,
					restoreAutoCut: true,
					restoreSwitcher: true,
				}),
			],
			[feedback('activeProject', { projectId: project.id })],
		)
	}
	return presets
}
