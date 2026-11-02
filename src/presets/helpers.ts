import {
	combineRgb,
	type CompanionSimplePresetDefinition,
	type CompanionPresetAction,
	type CompanionPresetFeedback,
	type CompanionPresetOptionValues,
	type CompanionFeedbackButtonStyleResult,
} from '@companion-module/base'
import type { MiruSuiteInstanceTypes, ActionSchemas, FeedbackSchemas } from '../instance-types.js'

export type CategorizedPreset = CompanionSimplePresetDefinition<MiruSuiteInstanceTypes> & {
	category: string
	graphic?: { image: string; caption: string }
}
export type CategorizedPresets = Record<string, CategorizedPreset>

export function button(
	category: string,
	text: string,
	down: CompanionPresetAction<ActionSchemas>[],
	feedbacks: CompanionPresetFeedback<FeedbackSchemas>[] = [],
): CategorizedPreset {
	return {
		type: 'simple',
		category,
		name: text.replaceAll('\n', ' '),
		style: { bgcolor: combineRgb(0, 0, 0), color: combineRgb(255, 255, 255), text, size: 'auto' },
		steps: [{ down, up: [] }],
		feedbacks,
	}
}
export function action<K extends keyof ActionSchemas>(
	actionId: K,
	options: CompanionPresetOptionValues<ActionSchemas[K]['options']>,
): { actionId: K; options: CompanionPresetOptionValues<ActionSchemas[K]['options']> } {
	return { actionId, options }
}
export function feedback<
	K extends {
		[P in keyof FeedbackSchemas]: FeedbackSchemas[P]['type'] extends 'boolean' ? P : never
	}[keyof FeedbackSchemas],
>(
	feedbackId: K,
	options: CompanionPresetOptionValues<FeedbackSchemas[K]['options']>,
	style = activeStyle(),
): {
	feedbackId: K
	options: CompanionPresetOptionValues<FeedbackSchemas[K]['options']>
	style: CompanionFeedbackButtonStyleResult
} {
	return { feedbackId, options, style }
}
export function activeStyle(): CompanionFeedbackButtonStyleResult {
	return { bgcolor: combineRgb(0, 128, 0), color: combineRgb(255, 255, 255) }
}
