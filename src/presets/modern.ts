import type {
	CompanionPresetDefinitions,
	CompanionPresetSection,
	CompanionPresetGroupSimple,
} from '@companion-module/base'
import type { MiruSuiteInstanceTypes } from '../instance-types.js'
import type { MiruSuiteModuleInstance } from '../main.js'
import type { CategorizedPresets } from './helpers.js'

/** Organize native API 2.1 presets without parsing button text. */
export function organizePresets(
	self: MiruSuiteModuleInstance,
	presets: CategorizedPresets,
): {
	structure: CompanionPresetSection<MiruSuiteInstanceTypes>[]
	definitions: CompanionPresetDefinitions<MiruSuiteInstanceTypes>
} {
	const definitions: CompanionPresetDefinitions<MiruSuiteInstanceTypes> = {}
	const sections = new Map<
		string,
		{ name: string; groups: Map<string, CompanionPresetGroupSimple<MiruSuiteInstanceTypes>> }
	>()
	for (const [id, { category, graphic, ...preset }] of Object.entries(presets)) {
		const actions = preset.steps.flatMap((step) => [
			...step.down,
			...step.up,
			...(step.rotate_left ?? []),
			...(step.rotate_right ?? []),
		])
		const deviceIds = new Set<number>()
		for (const action of actions) {
			if ('deviceId' in action.options) deviceIds.add(Number(action.options.deviceId))
			if (action.actionId === 'playPreset') {
				const savedPreset = self.store.getPresetById(Number(action.options.preset))
				for (const command of savedPreset?.commands ?? []) {
					if (command.deviceId !== undefined) deviceIds.add(command.deviceId)
				}
			}
		}
		// A preset targeting several devices belongs to the application section.
		const deviceId = deviceIds.size === 1 ? [...deviceIds][0] : undefined
		const device = deviceId === undefined ? undefined : self.store.getDeviceById(deviceId)
		const sectionId = device ? `device-${device.id}` : 'module-wide'
		let section = sections.get(sectionId)
		if (!section) {
			section = { name: device ? (device.name ?? `Device ${device.id}`) : 'Application', groups: new Map() }
			sections.set(sectionId, section)
		}
		definitions[id] = graphic
			? {
					type: 'alternatives',
					variants: [
						{
							type: 'layered',
							name: preset.name,
							steps: preset.steps,
							feedbacks: [],
							elements: [
								{ type: 'box', id: 'background', x: 0, y: 0, width: 100, height: 100, color: 0 },
								{
									type: 'image',
									id: 'arrow',
									x: 8,
									y: 2,
									width: 84,
									height: 76,
									base64Image: graphic.image,
									fillMode: 'fit',
									halign: 'center',
									valign: 'center',
								},
								{
									type: 'text',
									id: 'device',
									x: 4,
									y: 80,
									width: 92,
									height: 20,
									text: graphic.caption,
									fontsize: 200,
									fontsizeAllowShrink: true,
									halign: 'center',
									valign: 'center',
									color: 0xffffff,
								},
							],
						},
						preset,
					],
				}
			: preset
		let group = section.groups.get(category)
		if (!group) {
			group = { id: `${sectionId}-${category}`, type: 'simple', name: category, presets: [] }
			section.groups.set(category, group)
		}
		group.presets.push(id)
	}
	return {
		structure: [...sections].map(([id, section]) => ({
			id,
			name: section.name,
			definitions: [...section.groups.values()],
		})),
		definitions,
	}
}
