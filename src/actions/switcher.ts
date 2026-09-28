import type { MiruSuiteModuleInstance } from '../main.js'
import type { CompanionActionEvent } from '@companion-module/base'

type Actions = Record<string, any>

export function GetSwitcherActions(self: MiruSuiteModuleInstance): Actions {
	const backend = self.backend
	return {
		cutToInput: {
			name: 'Set Program Input',
			description: 'Cut directly to a named input on the connected switcher.',
			options: [{ id: 'input', type: 'textinput', label: 'Input', default: '' }],
			async callback(event: CompanionActionEvent) {
				const input = event.options.input
				await backend?.cutTo(typeof input === 'string' ? input : '')
			},
		},
		cutSwitcher: {
			name: 'Cut Program and Preview',
			description:
				'Swap the switcher Program and Preview buses. MiruSuite may reject the cut while a camera is moving.',
			options: [],
			async callback() {
				await backend?.cutSwitcher()
			},
		},
		triggerTransition: {
			name: 'Trigger Configured Transition',
			description: 'Run the transition configured in MiruSuite.',
			options: [],
			async callback() {
				await backend?.triggerTransition()
			},
		},
	}
}
