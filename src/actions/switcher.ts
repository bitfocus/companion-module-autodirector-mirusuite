import type { MiruSuiteModuleInstance } from '../main.js'
import type { CompanionActionEvent } from '@companion-module/base'

type Actions = Record<string, any>

export function GetSwitcherActions(self: MiruSuiteModuleInstance): Actions {
	const backend = self.backend
	const switcherInputs = self.store.getSwitcherInputs?.() ?? []
	const switcherInputChoices = switcherInputs
		.filter((input) => input.id !== undefined)
		.map((input) => ({ id: input.id!, label: input.name ?? input.id! }))
	const inputOption = () => ({
		id: 'input',
		type: switcherInputChoices.length > 0 ? 'dropdown' : 'textinput',
		label: 'Input',
		default: switcherInputChoices[0]?.id ?? '',
		...(switcherInputChoices.length > 0 ? { choices: switcherInputChoices } : {}),
	})
	const selectedInput = (event: CompanionActionEvent): string => {
		const selected = typeof event.options.input === 'string' ? event.options.input : ''
		if (!selected) return ''
		if (switcherInputChoices.length > 0 && !switcherInputChoices.some((choice) => String(choice.id) === selected)) {
			self.log('warn', `Cannot set switcher input: ${JSON.stringify(selected)} is no longer available`)
			return ''
		}
		return selected
	}
	return {
		cutToInput: {
			name: 'Set Program Input',
			description: 'Cut directly to a named input on the connected switcher.',
			options: [inputOption()],
			async callback(event: CompanionActionEvent) {
				const input = selectedInput(event)
				if (input) await backend?.cutTo(input)
			},
		},
		setPreviewInput: {
			name: 'Set Preview Input',
			description: 'Set the Preview bus to a named input on the connected switcher.',
			options: [inputOption()],
			async callback(event: CompanionActionEvent) {
				const input = selectedInput(event)
				if (input) await backend?.setPreview(input)
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
