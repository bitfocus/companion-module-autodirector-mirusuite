import type { MiruSuiteModuleInstance } from '../main.js'
import type { CompanionActionEvent } from '@companion-module/base'

type Actions = Record<string, any>

export function GetProjectActions(self: MiruSuiteModuleInstance): Actions {
	const projects = self.store.getProjects()
	const projectChoices = projects.map((project) => ({
		id: project.id ?? -1,
		label: project.name ?? `Project ${project.id}`,
	}))
	return {
		loadProject: {
			name: 'Load Project',
			description: 'Load a MiruSuite project and choose which runtime settings and devices to restore.',
			options: [
				{
					id: 'projectId',
					type: 'dropdown',
					label: 'Project',
					choices: projectChoices.length > 0 ? projectChoices : [{ id: -1, label: 'No projects available' }],
					default: projectChoices[0]?.id ?? -1,
				},
				{
					id: 'confirmInterruptions',
					type: 'checkbox',
					label: 'Confirm interruptions reported by MiruSuite',
					default: false,
				},
				{
					id: 'enableDevices',
					type: 'checkbox',
					label: 'Enable devices in the project',
					default: false,
				},
				{
					id: 'restoreAutoCut',
					type: 'checkbox',
					label: 'Restore AutoCut settings',
					default: false,
				},
				{
					id: 'restoreSwitcher',
					type: 'checkbox',
					label: 'Restore switcher settings',
					default: false,
				},
			],
			async callback(event: CompanionActionEvent) {
				const projectId = Number(event.options.projectId)
				if (
					!Number.isInteger(projectId) ||
					projectId < 0 ||
					!self.store.getProjects().some((project) => project.id === projectId)
				) {
					self.log('warn', `Cannot load project: invalid project ID ${JSON.stringify(event.options.projectId)}`)
					return
				}
				const result = await self.backend?.loadProject(projectId, event.options.confirmInterruptions === true, {
					enableDevices: event.options.enableDevices === true,
					restoreAutoCut: event.options.restoreAutoCut === true,
					restoreSwitcher: event.options.restoreSwitcher === true,
				})
				if (result?.impact) {
					const descriptions: string[] = []
					const sources = result.impact.sources?.map(
						(source) => `${source.deviceName ?? 'Device'}: ${source.sourceName ?? 'source'}`,
					)
					if (sources?.length) descriptions.push(`sources that will stop: ${sources.join(', ')}`)
					if (result.impact.switcherWillDisconnect) descriptions.push('the switcher will disconnect')
					const impactText = descriptions.length ? descriptions.join('; ') : 'MiruSuite reported runtime interruptions'
					self.log(result.loaded ? 'info' : 'warn', `Project load interruption impact: ${impactText}`)
				}
				if (!result?.loaded) {
					self.log(
						'warn',
						'Project load requires confirmation. Enable the confirmation option to allow this interruption.',
					)
					return
				}
				await self.updateConfiguration()
			},
		},
	}
}
