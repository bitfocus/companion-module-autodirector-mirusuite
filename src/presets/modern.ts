import {
	combineRgb,
	type CompanionPresetDefinitions as ModernPresetDefinitions,
	type CompanionPresetSection,
} from '@companion-module/base'
import type { MiruSuiteModuleInstance } from '../main.js'
import type { MiruSuiteInstanceTypes } from '../instance-types.js'
import type { LegacyPresets as CompanionPresetDefinitions } from './helpers.js'

const LARGE_PRESET_ICONS = new Set([
	'+',
	'-',
	'−',
	'↖',
	'⬆',
	'↗',
	'⬅',
	'➡',
	'↙',
	'⬇',
	'↘',
	'➕',
	'➖',
	'↑',
	'↓',
	'←',
	'→',
	'↔',
	'↕',
	'⏻',
])

export function convertLegacyPresets(
	self: MiruSuiteModuleInstance,
	legacyPresets: CompanionPresetDefinitions,
): {
	structure: CompanionPresetSection<MiruSuiteInstanceTypes>[]
	definitions: ModernPresetDefinitions<MiruSuiteInstanceTypes>
} {
	type Target = { id: number; sectionName: string; name: string }
	type Group = { id: string; type: 'simple'; name: string; presets: string[] }
	type Section = { id: string; name: string; groups: Map<string, Group> }

	const videoDevices = new Map(
		self.store
			.getVideoDevices()
			.flatMap((device) =>
				device.id === undefined
					? []
					: [
							[
								device.id,
								{ id: device.id, sectionName: 'Video', name: device.name ?? `Device ${device.id}` } as Target,
							],
						],
			),
	)
	const audioDevices = new Map(
		self.store
			.getAudioDevices()
			.flatMap((device) =>
				device.id === undefined
					? []
					: [
							[
								device.id,
								{ id: device.id, sectionName: 'Audio', name: device.name ?? `Device ${device.id}` } as Target,
							],
						],
			),
	)
	const framerDevices = new Map(
		self.store
			.getVMixFramerDevices()
			.flatMap((device) =>
				device.id === undefined
					? []
					: [
							[
								device.id,
								{ id: device.id, sectionName: 'vMix Framer', name: device.name ?? `Device ${device.id}` } as Target,
							],
						],
			),
	)
	const allDeviceMaps = [videoDevices, audioDevices, framerDevices]
	const sections = new Map<string, Section>()
	const definitions: ModernPresetDefinitions<MiruSuiteInstanceTypes> = {}

	for (const [presetId, legacy] of Object.entries(legacyPresets)) {
		if (!legacy || legacy.type !== 'button') continue
		const category = String(legacy.category ?? 'General')
		const target = getLegacyPresetTarget(self, presetId, legacy, category, allDeviceMaps)
		const deviceLabel = getLegacyPresetDeviceLabel(self, presetId, legacy, target, videoDevices)
		const sectionName = target ? `${target.sectionName}: ${target.name}` : 'Application'
		const sectionId = target
			? `device-${target.sectionName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${target.id}`
			: 'module-wide'
		const displayGroup = category === 'Presets' ? 'Saved Presets' : category
		const groupId = `${sectionId}-${displayGroup.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
		let section = sections.get(sectionId)
		if (!section) {
			section = { id: sectionId, name: sectionName, groups: new Map() }
			sections.set(sectionId, section)
		}
		let group = section.groups.get(groupId)
		if (!group) {
			group = { id: groupId, type: 'simple', name: displayGroup, presets: [] }
			section.groups.set(groupId, group)
		}
		group.presets.push(presetId)
		definitions[presetId] = createModernPreset(legacy, deviceLabel, getPresetArrowAsset(presetId))
	}

	const structure: CompanionPresetSection<MiruSuiteInstanceTypes>[] = [...sections.values()].map((section) => ({
		id: section.id,
		name: section.name,
		definitions: [...section.groups.values()],
	}))
	return { structure, definitions }
}

function getLegacyPresetDeviceLabel(
	self: MiruSuiteModuleInstance,
	presetId: string,
	legacy: any,
	target: { id: number; sectionName: string; name: string } | undefined,
	videoDevices: Map<number, { id: number; sectionName: string; name: string }>,
): string {
	if (presetId.startsWith('playPreset-')) {
		const preset = self.store.getPresetById(Number(presetId.slice('playPreset-'.length)))
		const names = [
			...new Set(
				(preset?.commands ?? [])
					.map((command) => (command.deviceId === undefined ? undefined : videoDevices.get(command.deviceId)?.name))
					.filter((name): name is string => Boolean(name)),
			),
		]
		if (names.length > 0) return names.join(', ')
	}
	if (target) return target.name

	const lines = String(legacy.style?.text ?? '')
		.split('\n')
		.map((line) => line.trim())
	const lastLine = lines[lines.length - 1] ?? ''
	const parenthetical = lastLine.match(/^\((.+)\)$/)
	if (parenthetical) return parenthetical[1].trim()
	const trailingParenthetical = lastLine.match(/\(([^()]+)\)\s*$/)
	if (trailingParenthetical) return trailingParenthetical[1].trim()
	return ''
}

function getLegacyPresetTarget(
	self: MiruSuiteModuleInstance,
	presetId: string,
	legacy: any,
	category: string,
	deviceMaps: Map<number, { id: number; sectionName: string; name: string }>[],
): { id: number; sectionName: string; name: string } | undefined {
	const [videoDevices, audioDevices, framerDevices] = deviceMaps
	const suffixMatch = presetId.match(/-(\d+)$/)
	const suffixId = suffixMatch ? Number(suffixMatch[1]) : undefined
	if (category === 'vMix Framer' && suffixId !== undefined) return framerDevices?.get(suffixId)
	if (category === 'AutoCut' && suffixId !== undefined) return audioDevices?.get(suffixId)

	const actionDeviceId = findOptionValue(legacy.steps, 'deviceId')
	if (actionDeviceId !== undefined) {
		for (const map of deviceMaps) {
			const target = map.get(actionDeviceId)
			if (target) return target
		}
	}

	if (presetId.startsWith('playPreset-')) {
		const preset = self.store.getPresetById(Number(presetId.slice('playPreset-'.length)))
		const ids = [
			...new Set(
				(preset?.commands ?? []).map((command) => command.deviceId).filter((id): id is number => id !== undefined),
			),
		]
		return ids.length === 1 ? videoDevices?.get(ids[0]) : undefined
	}

	if (suffixId !== undefined) {
		for (const map of deviceMaps) {
			const target = map.get(suffixId)
			if (target) return target
		}
	}
	return undefined
}

function findOptionValue(value: any, key: string): number | undefined {
	if (!value || typeof value !== 'object') return undefined
	if (!Array.isArray(value) && Object.prototype.hasOwnProperty.call(value, key)) {
		const parsed = Number(value[key])
		if (Number.isFinite(parsed)) return parsed
	}
	for (const child of Object.values(value)) {
		const found = findOptionValue(child, key)
		if (found !== undefined) return found
	}
	return undefined
}

function createModernPreset(legacy: any, deviceName = '', arrowAsset?: string): any {
	const { title, footer } = getPresetTextParts(String(legacy.style?.text ?? ''), deviceName)
	const simple = { ...legacy, type: 'simple' }
	delete simple.category
	if (simple.style) simple.style = { ...simple.style, text: [title, footer].filter(Boolean).join('\n') }
	if (simple.options?.rotaryActions !== undefined) {
		const { rotaryActions: _rotaryActions, ...supportedOptions } = simple.options
		simple.options = supportedOptions
		if (Object.keys(supportedOptions).length === 0) delete simple.options
	}

	const iconLayout = getIconLayout(title)
	if (!iconLayout && !arrowAsset && !footer) return simple

	const textColor = legacy.style?.color ?? combineRgb(255, 255, 255)
	const backgroundColor = legacy.style?.bgcolor ?? combineRgb(0, 0, 0)
	const elements: any[] = [
		{ type: 'box', id: 'background', x: 0, y: 0, width: 100, height: 100, color: backgroundColor },
	]
	if (arrowAsset) {
		elements.push({
			type: 'image',
			id: 'icon',
			x: 8,
			y: 2,
			width: 84,
			height: footer ? 76 : 96,
			base64Image: { isExpression: true, value: `$(autodirector-mirusuite:ptz_arrow_${arrowAsset})` },
			fillMode: 'fit',
			halign: 'center',
			valign: 'center',
		})
	} else if (iconLayout) {
		elements.push({
			type: 'text',
			id: 'icon',
			x: 3,
			y: 0,
			width: 94,
			height: iconLayout.label ? 60 : footer ? 78 : 100,
			text: iconLayout.icon,
			fontsize: 110,
			fontsizeAllowShrink: true,
			weight: 'bold',
			halign: 'center',
			valign: 'center',
			color: textColor,
		})
		if (iconLayout.label) {
			elements.push({
				type: 'text',
				id: 'text',
				x: 4,
				y: 60,
				width: 92,
				height: footer ? 19 : 38,
				text: iconLayout.label,
				fontsize: 200,
				fontsizeAllowShrink: true,
				halign: 'center',
				valign: 'center',
				color: textColor,
			})
		}
	} else {
		elements.push({
			type: 'text',
			id: 'text',
			x: 4,
			y: 2,
			width: 92,
			height: footer ? 76 : 96,
			text: asGraphicText(title),
			fontsize: 200,
			fontsizeAllowShrink: true,
			halign: 'center',
			valign: 'center',
			color: textColor,
		})
	}
	if (footer) {
		elements.push({
			type: 'text',
			id: 'device',
			x: 4,
			y: 80,
			width: 92,
			height: 20,
			text: asGraphicText(footer),
			fontsize: 200,
			fontsizeAllowShrink: true,
			halign: 'center',
			valign: 'center',
			color: textColor,
		})
	}
	const layered = {
		type: 'layered',
		name: legacy.name,
		canvas: { decoration: 'none' },
		elements,
		steps: legacy.steps,
		feedbacks: (legacy.feedbacks ?? []).map((feedback: any) => {
			const styleOverrides: any[] = []
			if (feedback.style?.bgcolor !== undefined) {
				styleOverrides.push({
					elementId: 'background',
					elementProperty: 'color',
					override: { isExpression: false, value: feedback.style.bgcolor },
				})
			}
			if (feedback.style?.color !== undefined) {
				for (const elementId of ['icon', 'text', 'device']) {
					if (elements.some((element) => element.id === elementId && element.type === 'text')) {
						styleOverrides.push({
							elementId,
							elementProperty: 'color',
							override: { isExpression: false, value: feedback.style.color },
						})
					}
				}
			}
			if (feedback.feedbackId === 'directorStatus') {
				styleOverrides.push({
					elementId: 'background',
					elementProperty: 'color',
					override: { isExpression: false, value: 'bgcolor' },
				})
				for (const elementId of ['icon', 'text', 'device']) {
					if (elements.some((element) => element.id === elementId && element.type === 'text')) {
						styleOverrides.push({
							elementId,
							elementProperty: 'color',
							override: { isExpression: false, value: 'color' },
						})
					}
				}
			}
			const { style: _style, ...definition } = feedback
			return { ...definition, styleOverrides }
		}),
	}
	return { type: 'alternatives', variants: [layered, simple] }
}

function getPresetTextParts(text: string, deviceLabel: string): { title: string; footer: string } {
	const lines = text
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
	let footer = deviceLabel.trim()
	const lastLine = lines[lines.length - 1] ?? ''
	const parenthetical = lastLine.match(/^\((.+)\)$/)
	const trailingParenthetical = lastLine.match(/\(([^()]+)\)\s*$/)
	if (!footer && parenthetical) footer = parenthetical[1].trim()
	if (!footer && trailingParenthetical) footer = trailingParenthetical[1].trim()
	if (lastLine.includes('$(autodirector-mirusuite:manual_move_speed)')) footer = lastLine
	if (footer && lines.length > 0) {
		const normalizedFooter = footer
			.replace(/^\(|\)$/g, '')
			.trim()
			.toLocaleLowerCase()
		const cleanedLastLine = lastLine
			.replace(/^\(|\)$/g, '')
			.replace(/\(([^()]+)\)\s*$/, '')
			.trim()
			.toLocaleLowerCase()
		if (
			parenthetical ||
			lastLine === footer ||
			cleanedLastLine === normalizedFooter ||
			lastLine.includes('$(autodirector-mirusuite:manual_move_speed)')
		) {
			lines.pop()
		} else {
			for (let index = lines.length - 1; index >= 0; index--) {
				if (
					lines[index]
						.replace(/^\(|\)$/g, '')
						.trim()
						.toLocaleLowerCase() === normalizedFooter
				)
					lines.splice(index, 1)
			}
		}
	}
	if (trailingParenthetical && !parenthetical && lines.length > 0) {
		const lastIndex = lines.length - 1
		lines[lastIndex] = lines[lastIndex].replace(/\s*\(([^()]+)\)\s*$/, '').trim()
		if (!lines[lastIndex]) lines.pop()
	}
	return { title: lines.join('\n'), footer }
}

function getIconLayout(text: string): { icon: string; label: string } | undefined {
	const lines = text
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
	if (lines.length === 0) return undefined
	let iconLine = lines[0].replace(/\uFE0F/g, '')
	let prefixLabel = ''
	if (iconLine.startsWith('Target ')) {
		prefixLabel = 'Target'
		iconLine = iconLine.slice('Target '.length).replace(/\uFE0F/g, '')
	} else {
		const prefixIcon = [...LARGE_PRESET_ICONS].find((icon) => iconLine.startsWith(`${icon} `))
		if (prefixIcon) {
			prefixLabel = iconLine.slice(prefixIcon.length).trim()
			iconLine = prefixIcon
		}
	}
	if (!LARGE_PRESET_ICONS.has(iconLine)) return undefined
	const labelLines = lines.slice(1)
	if (prefixLabel) labelLines.unshift(prefixLabel)
	return { icon: iconLine, label: labelLines.join(' ') }
}

function asGraphicText(text: string): string | { isExpression: true; value: string } {
	return text.includes('$(') ? { isExpression: true, value: text } : text
}

function getPresetArrowAsset(presetId: string): string | undefined {
	const match = presetId.match(/^ptzMove-(topLeft|top|topRight|left|right|bottomLeft|bottom|bottomRight)-\d+$/)
	if (!match) return undefined
	const directionToAsset: Record<string, string> = {
		topLeft: 'nw',
		top: 'n',
		topRight: 'ne',
		left: 'w',
		right: 'e',
		bottomLeft: 'sw',
		bottom: 's',
		bottomRight: 'se',
	}
	return directionToAsset[match[1]]
}
