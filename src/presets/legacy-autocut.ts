import { combineRgb, type DropdownChoice } from '@companion-module/base'
import type { ShotSize } from '../api/types.js'
import type { LegacyPresets as CompanionPresetDefinitions } from './helpers.js'
import { shotSizeToLabel } from '../scripts/helpers.js'

export function addTriggerAutoCut(presets: CompanionPresetDefinitions): void {
	presets['toggleAutoCut'] = {
		type: 'button',
		category: 'AutoCut',
		name: 'Toggle AutoCut',
		style: {
			text: '⏻ AutoCut',
			size: 'auto',
			bgcolor: combineRgb(0, 0, 0),
			color: combineRgb(255, 255, 255),
		},
		steps: [
			{
				down: [
					{
						actionId: 'toggleAutoCut',
						options: {
							mode: 'toggle',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'autoCut',
				options: {},
				style: {
					bgcolor: combineRgb(255, 0, 0),
				},
			},
		],
	}
}

export function addOverrideDominantSpeakerPreset(
	presets: CompanionPresetDefinitions,
	audioDeviceChoices: DropdownChoice[],
	deviceId: number,
): void {
	presets['overrideDominantSpeaker-' + deviceId] = {
		type: 'button',
		category: 'AutoCut',
		name: 'Override Dominant Speaker',
		style: {
			text: 'Override\n' + audioDeviceChoices.find((d) => Number(d.id) === deviceId)?.label,
			size: 'auto',
			bgcolor: combineRgb(0, 0, 0),
			color: combineRgb(255, 255, 255),
		},
		steps: [
			{
				down: [
					{
						actionId: 'setOverrideDominantSpeaker',
						options: {
							mode: 'toggle',
							deviceId: deviceId,
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'dominantSpeakerOverride',
				options: {
					deviceId: deviceId,
				},
				style: {
					bgcolor: combineRgb(255, 255, 255),
					color: combineRgb(0, 0, 0),
				},
			},
		],
	}
}

export function addToggleAutoCutAudioPreset(
	presets: CompanionPresetDefinitions,
	audioDeviceChoices: DropdownChoice[],
	deviceId: number,
): void {
	presets['toggleAudioAutoCut-' + deviceId] = {
		type: 'button',
		category: 'AutoCut',
		name: 'Toggle AutoCut Audio',
		style: {
			text: 'Toggle\n' + audioDeviceChoices.find((d) => Number(d.id) === deviceId)?.label,
			size: 'auto',
			bgcolor: combineRgb(0, 0, 0),
			color: combineRgb(255, 255, 255),
		},
		steps: [
			{
				down: [
					{
						actionId: 'setComponent',
						options: {
							deviceId: deviceId,
							componentType: 'AUTO_CUT',
							enabled: 'toggle',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'enabledComponentType',
				options: {
					deviceId: deviceId,
					componentType: 'AUTO_CUT',
				},
				style: {
					bgcolor: combineRgb(0, 255, 0),
					color: combineRgb(0, 0, 0),
				},
			},
		],
	}
}

export function addConfigureTargetShotSizes(presets: CompanionPresetDefinitions): void {
	const shotSizes: ShotSize[] = ['WIDE', 'MEDIUM', 'CLOSE_UP']
	for (const shotSize of shotSizes) {
		// Add increase and decrease buttons for each shot size
		const increaseText = '+\n' + shotSizeToLabel(shotSize)
		presets['increaseShotSize-' + shotSize] = {
			type: 'button',
			category: 'Person Tracking',
			name: increaseText,
			style: {
				text: increaseText,
				size: 'auto',
				bgcolor: combineRgb(0, 0, 0),
				color: combineRgb(255, 255, 255),
			},
			steps: [
				{
					down: [
						{
							actionId: 'updateTargetShotSizeConfig',
							options: {
								size: shotSize,
								increment: 1,
								step: 0.02,
							},
						},
					],
					up: [],
				},
			],
			feedbacks: [],
		}
		const decreaseText = '-\n' + shotSizeToLabel(shotSize)
		presets['decreaseShotSize-' + shotSize] = {
			type: 'button',
			category: 'Person Tracking',
			name: decreaseText,
			style: {
				text: decreaseText,
				size: 'auto',
				bgcolor: combineRgb(0, 0, 0),
				color: combineRgb(255, 255, 255),
			},
			steps: [
				{
					down: [
						{
							actionId: 'updateTargetShotSizeConfig',
							options: {
								size: shotSize,
								increment: -1,
								step: 0.02,
							},
						},
					],
					up: [],
				},
			],
			feedbacks: [],
		}
	}
}
