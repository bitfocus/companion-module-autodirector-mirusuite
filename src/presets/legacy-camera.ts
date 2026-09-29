import { combineRgb, type DropdownChoice } from '@companion-module/base'
import type { ShotSize, TrackingMode } from '../api/types.js'
import type { LegacyPresets as CompanionPresetDefinitions } from './helpers.js'
import { getDeviceNameFromVideoDeviceChoices, shotSizeToLabel } from '../scripts/helpers.js'

export function addShotSizePreset(
	presets: CompanionPresetDefinitions,
	shotSize: ShotSize,
	videoDeviceChoices: DropdownChoice[],
	deviceId: number,
): void {
	let text = shotSizeToLabel(shotSize)
	text += ' (' + getDeviceNameFromVideoDeviceChoices(videoDeviceChoices, deviceId) + ')'
	presets['shotSize-' + shotSize + '-' + deviceId] = {
		type: 'button',
		category: 'Person Tracking',
		name: text,
		style: {
			text: text,
			size: 'auto',
			bgcolor: combineRgb(0, 0, 0),
			color: combineRgb(255, 255, 255),
		},
		steps: [
			{
				down: [
					{
						actionId: 'setShotSize',
						options: {
							size: shotSize,
							deviceId: deviceId,
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'shotSize',
				options: {
					deviceId: deviceId,
					size: shotSize,
				},
				style: {
					bgcolor: combineRgb(255, 0, 0),
				},
			},
		],
	}
}

export function toggleDirectorPreset(
	presets: CompanionPresetDefinitions,
	videoDeviceChoices: DropdownChoice[],
	deviceId: number,
): void {
	let text = '⏻ Director'
	text += '\n (' + getDeviceNameFromVideoDeviceChoices(videoDeviceChoices, deviceId) + ')'
	presets['toggledDirector-' + deviceId] = {
		type: 'button',
		category: 'General',
		name: text,
		style: {
			text: text,
			size: 'auto',
			bgcolor: combineRgb(0, 0, 0),
			color: combineRgb(255, 255, 255),
		},
		steps: [
			{
				down: [
					{
						actionId: 'toggleDirector',
						options: {
							deviceId: deviceId,
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'directorStatus',
				options: {
					deviceId: deviceId,
				},
			},
		],
	}
}

export function enableDirectorPreset(
	presets: CompanionPresetDefinitions,
	videoDeviceChoices: DropdownChoice[],
	deviceId: number,
): void {
	let text = 'Enable Director'
	text += '\n (' + getDeviceNameFromVideoDeviceChoices(videoDeviceChoices, deviceId) + ')'
	presets['enableDirector-' + deviceId] = {
		type: 'button',
		category: 'General',
		name: text,
		style: {
			text: text,
			size: 'auto',
			bgcolor: combineRgb(0, 0, 0),
			color: combineRgb(255, 255, 255),
		},
		steps: [
			{
				down: [
					{
						actionId: 'setDirector',
						options: {
							deviceId: deviceId,
							enabled: 'true',
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
					componentType: 'DIRECTOR',
				},
				style: {
					bgcolor: combineRgb(0, 255, 0),
					color: combineRgb(0, 0, 0),
				},
			},
		],
	}
}

export function disableDirectorPreset(
	presets: CompanionPresetDefinitions,
	videoDeviceChoices: DropdownChoice[],
	deviceId: number,
): void {
	let text = 'Disable Director'
	text += '\n (' + getDeviceNameFromVideoDeviceChoices(videoDeviceChoices, deviceId) + ')'
	presets['disableDirector-' + deviceId] = {
		type: 'button',
		category: 'General',
		name: text,
		style: {
			text: text,
			size: 'auto',
			bgcolor: combineRgb(0, 0, 0),
			color: combineRgb(255, 255, 255),
		},
		steps: [
			{
				down: [
					{
						actionId: 'setDirector',
						options: {
							deviceId: deviceId,
							enabled: 'false',
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
					componentType: 'DIRECTOR',
				},
				style: {
					bgcolor: combineRgb(0, 255, 0),
					color: combineRgb(0, 0, 0),
				},
				isInverted: true,
			},
		],
	}
}

export function addTriggerMovementPreset(
	presets: CompanionPresetDefinitions,
	videoDeviceChoices: DropdownChoice[],
	deviceId: number,
	type: 'random' | 'preset',
): void {
	const text = `${type === 'random' ? 'Random Move' : 'Preset Move'}\n(${getDeviceNameFromVideoDeviceChoices(videoDeviceChoices, deviceId)})`
	presets['movement-' + type + '-' + deviceId] = {
		type: 'button',
		category: 'General',
		name: text,
		style: {
			text: text,
			size: 'auto',
			bgcolor: combineRgb(0, 0, 0),
			color: combineRgb(255, 255, 255),
		},
		steps: [
			{
				down: [
					{
						actionId: 'triggerMovement',
						options: {
							deviceId: deviceId,
							type: type,
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}
}

export function addStopAutoMovePreset(
	presets: CompanionPresetDefinitions,
	videoDeviceChoices: DropdownChoice[],
	deviceId: number,
): void {
	const text = 'Stop Move' + '\n (' + getDeviceNameFromVideoDeviceChoices(videoDeviceChoices, deviceId) + ')'
	presets['stop-' + deviceId] = {
		type: 'button',
		category: 'General',
		name: text,
		style: {
			text: text,
			size: 'auto',
			bgcolor: combineRgb(0, 0, 0),
			color: combineRgb(255, 255, 255),
		},
		steps: [
			{
				down: [
					{
						actionId: 'stopAutoMove',
						options: {
							deviceId: deviceId,
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}
}

export function addTrackingModePreset(
	presets: CompanionPresetDefinitions,
	mode: TrackingMode,
	faceChoices: DropdownChoice[],
	videoDeviceChoices: DropdownChoice[],
	deviceId: number,
): void {
	const text = mode + '\n (' + getDeviceNameFromVideoDeviceChoices(videoDeviceChoices, deviceId) + ')'
	presets['trackingMode' + mode + '-' + deviceId] = {
		type: 'button',
		category: 'Person Tracking',
		name: text,
		style: {
			text: text,
			size: 'auto',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
		steps: [
			{
				down: [
					{
						actionId: 'setTrackingMode',
						options: {
							mode: mode,
							person: faceChoices[0]?.id ?? -1,
							deviceId: deviceId,
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'trackingMode',
				options: {
					mode: mode,
					person: faceChoices[0]?.id ?? -1,
					deviceId: deviceId,
				},
			},
		],
	}
}

export function addLearnTargetFacePreset(
	presets: CompanionPresetDefinitions,
	videoDeviceChoices: DropdownChoice[],
	deviceId: number,
): void {
	const text = 'Learn Target Face'
	const name = text + '\n (' + getDeviceNameFromVideoDeviceChoices(videoDeviceChoices, deviceId) + ')'
	presets['learnTargetFace-' + deviceId] = {
		type: 'button',
		category: 'Person Tracking',
		name: name,
		style: {
			text: name,
			size: 'auto',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
		steps: [
			{
				down: [
					{
						actionId: 'learnTargetFace',
						options: {
							deviceId: deviceId,
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}
}

export function addReApplyPreset(
	presets: CompanionPresetDefinitions,
	videoDeviceChoices: DropdownChoice[],
	deviceId: number,
): void {
	const name = getDeviceNameFromVideoDeviceChoices(videoDeviceChoices, deviceId)
	presets['reapplyPreset-' + deviceId] = {
		type: 'button',
		category: 'Presets',
		name: 'Play active preset\n' + name,
		style: {
			text: 'Play active preset\n (' + name + ')',
			size: 'auto',
			bgcolor: combineRgb(0, 0, 0),
			color: combineRgb(255, 255, 255),
		},
		steps: [
			{
				down: [],
				up: [
					{
						actionId: 'playActivePreset',
						options: {
							deviceId: deviceId,
						},
					},
				],
			},
		],
		feedbacks: [],
	}
}

export function addReturnToHomeButton(
	presets: CompanionPresetDefinitions,
	videoDeviceChoices: DropdownChoice[],
	deviceId: number,
): void {
	const text = 'Return\nHome' + '\n (' + getDeviceNameFromVideoDeviceChoices(videoDeviceChoices, deviceId) + ')'
	presets['returnToHome' + deviceId] = {
		type: 'button',
		category: 'General',
		name: text,
		style: {
			text: text,
			size: 'auto',
			bgcolor: combineRgb(0, 0, 0),
			color: combineRgb(255, 255, 255),
		},
		steps: [
			{
				down: [
					{
						actionId: 'triggerReturnToHome',
						options: {
							deviceId: deviceId,
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}
}

export function addExitSteadyModePreset(
	presets: CompanionPresetDefinitions,
	videoDeviceChoices: DropdownChoice[],
	deviceId: number,
): void {
	const text = 'Exit Steady\n (' + getDeviceNameFromVideoDeviceChoices(videoDeviceChoices, deviceId) + ')'
	presets['exitSteadyMode' + deviceId] = {
		type: 'button',
		category: 'Person Tracking',
		name: text,
		style: {
			text: text,
			size: 'auto',
			bgcolor: combineRgb(0, 0, 0),
			color: combineRgb(255, 255, 255),
		},
		steps: [
			{
				down: [
					{
						actionId: 'exitSteadyMode',
						options: {
							deviceId: deviceId,
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}
}

export function addMoveTargetButtonPresets(
	presets: CompanionPresetDefinitions,
	videoDeviceChoices: DropdownChoice[],
	deviceId: number,
): void {
	const directions = ['UP', 'DOWN', 'LEFT', 'RIGHT'] as const
	const directionLabels: Record<(typeof directions)[number], string> = { UP: '↑', DOWN: '↓', LEFT: '←', RIGHT: '→' }
	for (const direction of directions) {
		presets['moveTarget-' + direction + '-' + deviceId] = {
			type: 'button',
			category: 'Person Tracking',
			name:
				'Target ' +
				directionLabels[direction] +
				'\n(' +
				videoDeviceChoices.find((d) => Number(d.id) === deviceId)?.label +
				')',
			style: {
				text:
					'Target ' +
					directionLabels[direction] +
					'\n(' +
					videoDeviceChoices.find((d) => Number(d.id) === deviceId)?.label +
					')',
				size: 'auto',
				bgcolor: combineRgb(0, 0, 0),
				color: combineRgb(255, 255, 255),
			},
			steps: [
				{
					down: [
						{
							actionId: 'moveTargetPoint',
							options: {
								deltaX: direction === 'LEFT' ? -0.02 : direction === 'RIGHT' ? 0.02 : 0,
								deltaY: direction === 'UP' ? -0.02 : direction === 'DOWN' ? 0.02 : 0,
								deviceId: deviceId,
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

export function addMoveTargetRotaryPresets(
	presets: CompanionPresetDefinitions,
	videoDeviceChoices: DropdownChoice[],
	deviceId: number,
): void {
	const axes = ['X', 'Y'] as const
	for (const axis of axes) {
		const icon = axis === 'X' ? '↔' : '↕'
		presets['moveTargetRotary-' + axis + '-' + deviceId] = {
			type: 'button',
			options: { rotaryActions: true },
			category: 'Person Tracking',
			name: 'Target ' + icon + '\n(' + videoDeviceChoices.find((d) => Number(d.id) === deviceId)?.label + ')',
			style: {
				text: 'Target ' + icon + '\n(' + videoDeviceChoices.find((d) => Number(d.id) === deviceId)?.label + ')',
				size: 'auto',
				bgcolor: combineRgb(0, 0, 0),
				color: combineRgb(255, 255, 255),
			},
			steps: [
				{
					down: [],
					up: [],
					rotate_left: [
						{
							actionId: 'moveTargetPoint',
							options: {
								deltaX: axis === 'X' ? -0.02 : 0,
								deltaY: axis === 'Y' ? -0.02 : 0,
								deviceId: deviceId,
							},
						},
					],
					rotate_right: [
						{
							actionId: 'moveTargetPoint',
							options: {
								deltaX: axis === 'X' ? 0.02 : 0,
								deltaY: axis === 'Y' ? 0.02 : 0,
								deviceId: deviceId,
							},
						},
					],
				},
			],
			feedbacks: [],
		}
	}
}

export function addUpdateSensitivityPresets(
	presets: CompanionPresetDefinitions,
	videoDeviceChoices: DropdownChoice[],
	deviceId: number,
): void {
	const directions = ['INCREASE', 'DECREASE'] as const
	for (const direction of directions) {
		const text =
			(direction === 'INCREASE' ? '+\n' : '-\n') +
			'Sensitivity' +
			'\n (' +
			getDeviceNameFromVideoDeviceChoices(videoDeviceChoices, deviceId) +
			')'
		presets['updateSensitivity-' + direction + '-' + deviceId] = {
			type: 'button',
			category: 'Person Tracking',
			name: text,
			style: {
				text: text,
				size: 'auto',
				bgcolor: combineRgb(0, 0, 0),
				color: combineRgb(255, 255, 255),
			},
			steps: [
				{
					down: [
						{
							actionId: 'updateSensitivity',
							options: {
								deltaSensitivity: direction === 'INCREASE' ? 0.02 : -0.02,
								deviceId: deviceId,
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

export function addUpdateSensitivityRotaryPresets(
	presets: CompanionPresetDefinitions,
	videoDeviceChoices: DropdownChoice[],
	deviceId: number,
): void {
	const text = 'Sensitivity' + '\n (' + getDeviceNameFromVideoDeviceChoices(videoDeviceChoices, deviceId) + ')'
	presets['updateSensitivityRotary-' + deviceId] = {
		type: 'button',
		options: { rotaryActions: true },
		category: 'Person Tracking',
		name: text,
		style: {
			text: text,
			size: 'auto',
			bgcolor: combineRgb(0, 0, 0),
			color: combineRgb(255, 255, 255),
		},
		steps: [
			{
				down: [],
				up: [],
				rotate_left: [
					{
						actionId: 'updateSensitivity',
						options: {
							deltaSensitivity: -0.02,
							deviceId: deviceId,
						},
					},
				],
				rotate_right: [
					{
						actionId: 'updateSensitivity',
						options: {
							deltaSensitivity: 0.02,
							deviceId: deviceId,
						},
					},
				],
			},
		],
		feedbacks: [],
	}
}
