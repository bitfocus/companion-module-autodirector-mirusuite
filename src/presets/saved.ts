import { combineRgb, type DropdownChoice } from '@companion-module/base'
import type { CategorizedPresets as CompanionPresetDefinitions } from './helpers.js'

export function addPlayPresetPreset(presets: CompanionPresetDefinitions, preset: DropdownChoice): void {
	presets['playPreset-' + preset.id] = {
		type: 'simple',
		category: 'Presets',
		name: preset.label ?? 'Unknown',
		style: {
			text: preset.label ?? 'Unknown',
			size: 'auto',
			bgcolor: combineRgb(0, 0, 0),
			color: combineRgb(255, 255, 255),
		},
		steps: [
			{
				down: [],
				up: [
					{
						actionId: 'playPreset',
						options: {
							preset: preset.id,
						},
					},
				],
				1000: [
					{
						actionId: 'overwritePreset',
						options: {
							preset: preset.id,
						},
					},
				],
			},
		],
		feedbacks: [
			{
				feedbackId: 'activePreset',
				options: {
					preset: preset.id,
				},
				style: {
					bgcolor: combineRgb(255, 0, 0),
				},
			},
		],
	}
}
