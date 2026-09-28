import { combineRgb } from '@companion-module/base'

export type LegacyPresets = Record<string, any>

export function button(category: string, text: string, down: any[], feedbacks: any[] = []): any {
	return {
		type: 'button',
		category,
		name: text.replaceAll('\n', ' '),
		style: { bgcolor: combineRgb(0, 0, 0), color: combineRgb(255, 255, 255), text, size: 'auto' },
		steps: [{ down, up: [] }],
		feedbacks,
	}
}

export function action(actionId: string, options: Record<string, string | number | boolean>): any {
	return { actionId, options }
}

export function feedback(
	feedbackId: string,
	options: Record<string, string | number>,
	style = activeStyle(),
): Record<string, any> {
	return { feedbackId, options, style }
}

export function activeStyle(): Record<string, number> {
	return { bgcolor: combineRgb(0, 128, 0), color: combineRgb(255, 255, 255) }
}
