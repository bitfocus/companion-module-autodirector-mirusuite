import { CompanionPresetDefinitions, DropdownChoice, combineRgb } from '@companion-module/base'
import { MiruSuiteModuleInstance } from './main.js'
import type { ShotSize, TrackingMode } from './api/types.js'
import {
	createDeviceOptions,
	getDeviceNameFromVideoDeviceChoices,
	createFaceOptions,
	getPresetChoices,
	shotSizeToLabel,
} from './scripts/helpers.js'

export function UpdatePresets(self: MiruSuiteModuleInstance): void {
	const faceChoices: DropdownChoice[] = createFaceOptions(self)
	const videoDeviceChoices: DropdownChoice[] = createDeviceOptions(self.store.getVideoDevices())
	const audioDeviceChoices: DropdownChoice[] = createDeviceOptions(self.store.getAudioDevices())
	const vmixFramerDeviceChoices: DropdownChoice[] = createDeviceOptions(self.store.getVMixFramerDevices())
	const devicePresets: DropdownChoice[] = getPresetChoices(self, videoDeviceChoices)

	self.log(
		'debug',
		'Updating presets with ' + videoDeviceChoices.length + ' devices and ' + devicePresets.length + ' presets',
	)
	const presets: CompanionPresetDefinitions = {}

	if (videoDeviceChoices.length === 0) {
		videoDeviceChoices.push({ id: '0', label: 'Dummy device' })
	}
	for (const choice of videoDeviceChoices) {
		const deviceId = Number(choice.id)
		const videoDevice = self.store.getDeviceById(deviceId)
		if (
			videoDevice?.components?.autoMoveDirector != null ||
			videoDevice?.components?.headTrackingDirector != null ||
			videoDevice?.components?.lectureDirector != null
		) {
			toggleDirectorPreset(presets, videoDeviceChoices, deviceId)
			enableDirectorPreset(presets, videoDeviceChoices, deviceId)
			disableDirectorPreset(presets, videoDeviceChoices, deviceId)
		}
		if (videoDevice?.components?.autoMoveDirector != null) {
			addTriggerMovementPreset(presets, videoDeviceChoices, deviceId, 'random')
			addTriggerMovementPreset(presets, videoDeviceChoices, deviceId, 'preset')
			addStopAutoMovePreset(presets, videoDeviceChoices, deviceId)
		}
		if (videoDevice?.components?.headTrackingDirector != null) {
			addExitSteadyModePreset(presets, videoDeviceChoices, deviceId)
			addShotSizePreset(presets, 'WIDE', videoDeviceChoices, deviceId)
			addShotSizePreset(presets, 'MEDIUM', videoDeviceChoices, deviceId)
			addShotSizePreset(presets, 'CLOSE_UP', videoDeviceChoices, deviceId)
			addTrackingModePreset(presets, 'ALL', faceChoices, videoDeviceChoices, deviceId)
			addTrackingModePreset(presets, 'MANUAL', faceChoices, videoDeviceChoices, deviceId)
			if (faceChoices.length > 0) {
				addTrackingModePreset(presets, 'SINGLE', faceChoices, videoDeviceChoices, deviceId)
			}
			addLearnTargetFacePreset(presets, videoDeviceChoices, deviceId)
			addMoveTargetButtonPresets(presets, videoDeviceChoices, deviceId)
			addMoveTargetRotaryPresets(presets, videoDeviceChoices, deviceId)
			addUpdateSensitivityPresets(presets, videoDeviceChoices, deviceId)
			addUpdateSensitivityRotaryPresets(presets, videoDeviceChoices, deviceId)
		}
		if (videoDevice?.components?.lectureDirector != null) {
			addExitSteadyModePreset(presets, videoDeviceChoices, deviceId)
		}
		addReturnToHomeButton(presets, videoDeviceChoices, deviceId)
		addReApplyPreset(presets, videoDeviceChoices, deviceId)
	}
	for (const choice of audioDeviceChoices) {
		const deviceId = Number(choice.id)
		addOverrideDominantSpeakerPreset(presets, audioDeviceChoices, deviceId)
	}
	for (const choice of vmixFramerDeviceChoices) {
		const deviceId = Number(choice.id)
		addVMixFramerAdjustFramePreset(presets, vmixFramerDeviceChoices, deviceId)
	}
	for (const devicePreset of devicePresets) {
		self.log('info', 'Adding preset ' + devicePreset.label)
		addPlayPresetPreset(presets, devicePreset)
	}
	addLearningModePreset(presets)
	addAutoPresetButton(presets)
	addClearAllLearnedButtonData(presets)
	addTriggerAutoCut(presets)
	addConfigureTargetShotSizes(presets)
	self.setPresetDefinitions(presets)
}

function addShotSizePreset(
	presets: CompanionPresetDefinitions,
	shotSize: ShotSize,
	videoDeviceChoices: DropdownChoice[],
	deviceId: number,
) {
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

function toggleDirectorPreset(
	presets: CompanionPresetDefinitions,
	videoDeviceChoices: DropdownChoice[],
	deviceId: number,
) {
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

function enableDirectorPreset(
	presets: CompanionPresetDefinitions,
	videoDeviceChoices: DropdownChoice[],
	deviceId: number,
) {
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
				feedbackId: 'enabledDirector',
				options: {
					deviceId: deviceId,
				},
				style: {
					bgcolor: combineRgb(0, 255, 0),
					color: combineRgb(0, 0, 0),
				},
			},
		],
	}
}

function disableDirectorPreset(
	presets: CompanionPresetDefinitions,
	videoDeviceChoices: DropdownChoice[],
	deviceId: number,
) {
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
				feedbackId: 'enabledDirector',
				options: {
					deviceId: deviceId,
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

function addTriggerMovementPreset(
	presets: CompanionPresetDefinitions,
	videoDeviceChoices: DropdownChoice[],
	deviceId: number,
	type: 'random' | 'preset',
) {
	let text = ''
	if (type == 'random') {
		text = 'Random Move\n'
	} else {
		text = 'Preset Move\n'
	}
	text += '(' + getDeviceNameFromVideoDeviceChoices(videoDeviceChoices, deviceId) + ')'
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

function addStopAutoMovePreset(
	presets: CompanionPresetDefinitions,
	videoDeviceChoices: DropdownChoice[],
	deviceId: number,
) {
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

function addTrackingModePreset(
	presets: CompanionPresetDefinitions,
	mode: TrackingMode,
	faceChoices: DropdownChoice[],
	videoDeviceChoices: DropdownChoice[],
	deviceId: number,
) {
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

function addLearnTargetFacePreset(
	presets: CompanionPresetDefinitions,
	videoDeviceChoices: DropdownChoice[],
	deviceId: number,
) {
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
function addPlayPresetPreset(presets: CompanionPresetDefinitions, preset: DropdownChoice) {
	presets['playPreset-' + preset.id] = {
		type: 'button',
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

function addReApplyPreset(presets: CompanionPresetDefinitions, videoDeviceChoices: DropdownChoice[], deviceId: number) {
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

function addLearningModePreset(presets: CompanionPresetDefinitions) {
	presets['learnAutoButtons'] = {
		type: 'button',
		category: 'Auto Presets',
		name: 'Learn Presets',
		style: {
			text: 'Learn Presets',
			size: 'auto',
			bgcolor: combineRgb(0, 0, 255),
			color: combineRgb(255, 255, 255),
		},
		steps: [
			{
				down: [
					{
						actionId: 'learnAutoButtons',
						options: {},
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'learnMode',
				options: {},
				style: {
					bgcolor: combineRgb(255, 0, 0),
				},
			},
		],
	}
}

function addAutoPresetButton(presets: CompanionPresetDefinitions): CompanionPresetDefinitions {
	presets['autoPreset'] = {
		type: 'button',
		category: 'Auto Presets',
		name: 'Auto Preset Slot',
		style: {
			text: 'Auto Preset Slot',
			size: 'auto',
			bgcolor: combineRgb(0, 0, 0),
			color: combineRgb(255, 255, 255),
		},
		steps: [
			{
				down: [],
				up: [
					{
						actionId: 'playAutoPreset',
						options: {},
					},
				],
				1000: [
					{
						actionId: 'overwriteAutoPreset',
						options: {},
					},
				],
			},
		],
		feedbacks: [
			{
				feedbackId: 'autoPreset',
				options: {},
				style: {
					bgcolor: combineRgb(255, 0, 0),
				},
			},
		],
	}
	return presets
}

function addClearAllLearnedButtonData(presets: CompanionPresetDefinitions) {
	presets['clearAllAutoButtons'] = {
		type: 'button',
		category: 'Auto Presets',
		name: 'Unlearn Presets',
		style: {
			text: 'Unlearn Presets',
			size: 'auto',
			bgcolor: combineRgb(255, 0, 0),
			color: combineRgb(255, 255, 255),
		},
		steps: [
			{
				down: [
					{
						actionId: 'clearAllAutoButtons',
						options: {},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}
}

function addReturnToHomeButton(
	presets: CompanionPresetDefinitions,
	videoDeviceChoices: DropdownChoice[],
	deviceId: number,
) {
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

function addMoveTargetButtonPresets(
	presets: CompanionPresetDefinitions,
	videoDeviceChoices: DropdownChoice[],
	deviceId: number,
) {
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

function addMoveTargetRotaryPresets(
	presets: CompanionPresetDefinitions,
	videoDeviceChoices: DropdownChoice[],
	deviceId: number,
) {
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

function addUpdateSensitivityPresets(
	presets: CompanionPresetDefinitions,
	videoDeviceChoices: DropdownChoice[],
	deviceId: number,
) {
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

function addUpdateSensitivityRotaryPresets(
	presets: CompanionPresetDefinitions,
	videoDeviceChoices: DropdownChoice[],
	deviceId: number,
) {
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

function addTriggerAutoCut(presets: CompanionPresetDefinitions) {
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

function addOverrideDominantSpeakerPreset(
	presets: CompanionPresetDefinitions,
	audioDeviceChoices: DropdownChoice[],
	deviceId: number,
) {
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

function addExitSteadyModePreset(
	presets: CompanionPresetDefinitions,
	videoDeviceChoices: DropdownChoice[],
	deviceId: number,
) {
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

function addConfigureTargetShotSizes(presets: CompanionPresetDefinitions) {
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

function addVMixFramerAdjustFramePreset(
	presets: CompanionPresetDefinitions,
	vmixFramerDeviceChoices: DropdownChoice[],
	deviceId: number,
) {
	presets['vmixFramerAdjustFrame-' + deviceId] = {
		type: 'button',
		category: 'vMix Framer',
		name: 'Adjust Frame',
		style: {
			text: 'Adjust Frame\n' + vmixFramerDeviceChoices.find((d) => Number(d.id) === deviceId)?.label,
			size: 'auto',
			bgcolor: combineRgb(0, 0, 0),
			color: combineRgb(255, 255, 255),
		},
		steps: [
			{
				down: [
					{
						actionId: 'adjustFramer',
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
