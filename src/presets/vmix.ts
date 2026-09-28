import { combineRgb, type DropdownChoice } from '@companion-module/base'
import type { LegacyPresets as CompanionPresetDefinitions } from './helpers.js'

export function addVMixFramerPresets(
	presets: CompanionPresetDefinitions,
	vmixFramerDeviceChoices: DropdownChoice[],
	deviceId: number,
): void {
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
	presets['vMixFramerToggle-' + deviceId] = {
		type: 'button',
		category: 'vMix Framer',
		name: 'Toggle Framer',
		style: {
			text: 'Toggle Framer\n' + vmixFramerDeviceChoices.find((d) => Number(d.id) === deviceId)?.label,
			size: 'auto',
			bgcolor: combineRgb(0, 0, 0),
			color: combineRgb(255, 255, 255),
		},
		steps: [
			{
				down: [
					{
						actionId: 'toggleVMixFramer',
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
				feedbackId: 'vMixFramerEnabled',
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
	presets['vMixFramerEnable-' + deviceId] = {
		type: 'button',
		category: 'vMix Framer',
		name: 'Enable Framer',
		style: {
			text: 'Enable Framer\n' + vmixFramerDeviceChoices.find((d) => Number(d.id) === deviceId)?.label,
			size: 'auto',
			bgcolor: combineRgb(0, 0, 0),
			color: combineRgb(255, 255, 255),
		},
		steps: [
			{
				down: [
					{
						actionId: 'setVMixFramer',
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
				feedbackId: 'vMixFramerEnabled',
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
	presets['vMixFramerDisable-' + deviceId] = {
		type: 'button',
		category: 'vMix Framer',
		name: 'Disable Framer',
		style: {
			text: 'Disable Framer\n' + vmixFramerDeviceChoices.find((d) => Number(d.id) === deviceId)?.label,
			size: 'auto',
			bgcolor: combineRgb(0, 0, 0),
			color: combineRgb(255, 255, 255),
		},
		steps: [
			{
				down: [
					{
						actionId: 'setVMixFramer',
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
				feedbackId: 'vMixFramerEnabled',
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
