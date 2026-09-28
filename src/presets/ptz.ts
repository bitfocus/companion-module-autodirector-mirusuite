import { combineRgb, type DropdownChoice } from '@companion-module/base'
import type { LegacyPresets as CompanionPresetDefinitions } from './helpers.js'
import { getDeviceNameFromVideoDeviceChoices } from '../scripts/helpers.js'

export function addManualMoveSpeedPresets(presets: CompanionPresetDefinitions): void {
	for (const direction of ['increase', 'decrease'] as const) {
		const isIncrease = direction === 'increase'
		const icon = isIncrease ? '+' : '-'
		const title = `${icon}\nMovement Speed\n$(autodirector-mirusuite:manual_move_speed)`
		presets[`manualMoveSpeed-${direction}`] = {
			type: 'button',
			category: 'PTZ',
			name: `${isIncrease ? 'Increase' : 'Decrease'} Manual Movement Speed`,
			style: {
				text: title,
				size: 'auto',
				bgcolor: combineRgb(0, 0, 0),
				color: combineRgb(255, 255, 255),
			},
			steps: [
				{
					down: [
						{
							actionId: isIncrease ? 'increaseMoveSpeed' : 'decreaseMoveSpeed',
							options: { step: 0.05 },
						},
					],
					up: [],
				},
			],
			feedbacks: [],
		}
	}
}

export function addPTZDirectionPresets(
	presets: CompanionPresetDefinitions,
	videoDeviceChoices: DropdownChoice[],
	deviceId: number,
): void {
	const diagonalSpeed = 1 / Math.sqrt(2)
	const directions = [
		{ id: 'topLeft', label: '↖', pan: -diagonalSpeed, tilt: diagonalSpeed },
		{ id: 'top', label: '↑', pan: 0, tilt: 1 },
		{ id: 'topRight', label: '↗', pan: diagonalSpeed, tilt: diagonalSpeed },
		{ id: 'left', label: '←', pan: -1, tilt: 0 },
		{ id: 'right', label: '→', pan: 1, tilt: 0 },
		{ id: 'bottomLeft', label: '↙', pan: -diagonalSpeed, tilt: -diagonalSpeed },
		{ id: 'bottom', label: '↓', pan: 0, tilt: -1 },
		{ id: 'bottomRight', label: '↘', pan: diagonalSpeed, tilt: -diagonalSpeed },
	]
	const deviceName = getDeviceNameFromVideoDeviceChoices(videoDeviceChoices, deviceId)

	for (const direction of directions) {
		const text = direction.label + '\n' + deviceName
		presets['ptzMove-' + direction.id + '-' + deviceId] = {
			type: 'button',
			category: 'PTZ',
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
							actionId: 'moveCamera',
							options: {
								deviceId: deviceId,
								pan: direction.pan,
								tilt: direction.tilt,
								zoom: 0,
							},
						},
					],
					up: [
						{
							actionId: 'moveCamera',
							options: {
								deviceId: deviceId,
								pan: 0,
								tilt: 0,
								zoom: 0,
							},
						},
					],
				},
			],
			feedbacks: [],
		}
	}
}

export function addPTZZoomPresets(
	presets: CompanionPresetDefinitions,
	videoDeviceChoices: DropdownChoice[],
	deviceId: number,
): void {
	const zoomDirections = [
		{ id: 'in', label: '+', zoom: 1 },
		{ id: 'out', label: '-', zoom: -1 },
	]
	const deviceName = getDeviceNameFromVideoDeviceChoices(videoDeviceChoices, deviceId)

	for (const direction of zoomDirections) {
		const text = direction.label + '\n' + deviceName
		presets['ptzZoom-' + direction.id + '-' + deviceId] = {
			type: 'button',
			category: 'PTZ',
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
							actionId: 'moveCamera',
							options: {
								deviceId: deviceId,
								pan: 0,
								tilt: 0,
								zoom: direction.zoom,
							},
						},
					],
					up: [
						{
							actionId: 'moveCamera',
							options: {
								deviceId: deviceId,
								pan: 0,
								tilt: 0,
								zoom: 0,
							},
						},
					],
				},
			],
			feedbacks: [],
		}
	}
}
