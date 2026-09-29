import { combineRgb } from '@companion-module/base'
import type { MiruSuiteModuleInstance } from '../main.js'
import { action, button, feedback, type LegacyPresets } from './helpers.js'

export function getSwitcherPresets(self?: MiruSuiteModuleInstance): LegacyPresets {
	const presets: LegacyPresets = {
		cutSwitcher: button('Switcher', 'CUT', [action('cutSwitcher', {})]),
		triggerTransition: button('Switcher', 'Transition', [action('triggerTransition', {})]),
	}
	const inputs = self?.store.getSwitcherInputs?.() ?? []
	for (const input of inputs) {
		if (!input.id) continue
		const id = input.id
		const name = input.name ?? id
		const encodedId = encodeURIComponent(id)
		const programPreset = button(
			'Switcher',
			`Program: ${name}`,
			[action('cutToInput', { input: id })],
			[
				feedback(
					'switcherBusInput',
					{ bus: 'program', input: id },
					{
						bgcolor: combineRgb(255, 0, 0),
						color: combineRgb(255, 255, 255),
					},
				),
			],
		)
		programPreset.style.bgcolor = combineRgb(64, 0, 0)
		presets[`switcherProgram-${encodedId}`] = programPreset

		const previewPreset = button(
			'Switcher',
			`Preview: ${name}`,
			[action('setPreviewInput', { input: id })],
			[
				feedback(
					'switcherBusInput',
					{ bus: 'preview', input: id },
					{
						bgcolor: combineRgb(0, 255, 0),
						color: combineRgb(255, 255, 255),
					},
				),
			],
		)
		previewPreset.style.bgcolor = combineRgb(0, 64, 0)
		presets[`switcherPreview-${encodedId}`] = previewPreset
	}
	return presets
}
