import type { MiruSuiteModuleInstance } from '../main.js'
import { action, button, feedback, type CategorizedPresets } from './helpers.js'

export function getProjectPresets(self: MiruSuiteModuleInstance): CategorizedPresets {
	const presets: CategorizedPresets = {}
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
