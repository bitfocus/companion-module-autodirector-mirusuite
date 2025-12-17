import { DropdownChoice } from '@companion-module/base'
import type { ComponentFeedback, ComponentId, Device, PresetEntity, ShotSize } from '../api/types.js'
import { MiruSuiteModuleInstance } from '../main.js'
import { getInstrumentGroups } from './metadata.js'
export type DeviceId2SwitcherInput = { [key: number]: string }

/**
 * Create a list of choices for selecting a face
 * @param self
 * @returns list of available faces
 */
export function createFaceOptions(self: MiruSuiteModuleInstance): DropdownChoice[] {
	const faces = self.store.getFaces()
	const faceChoices: { id: number; label: string }[] = []
	for (const face of faces) {
		faceChoices.push({ id: face.id ?? 0, label: face.name ?? '' })
	}
	return faceChoices
}

/**
 * Create a list of choice for selecting a device
 * @param devices
 * @returns
 */
export function createDeviceOptions(devices: Device[]): DropdownChoice[] {
	const deviceChoices: { id: number; label: string }[] = []
	for (const device of devices) {
		deviceChoices.push({
			id: device.id ?? -1,
			label: device.name ?? 'Unknown',
		})
	}
	return deviceChoices
}

/**
 * Extract the device name from a list of video device choices
 * @param videoDeviceChoices all available video devices
 * @param deviceId of the device
 * @returns name of the device or "Unknown"
 */
export function getDeviceNameFromVideoDeviceChoices(videoDeviceChoices: DropdownChoice[], deviceId: number): string {
	return videoDeviceChoices.find((device) => device.id === deviceId)?.label ?? 'Unknown'
}

/**
 * Extract the displayable device names from a preset. Combines the device names if a preset is attached to multiple devices
 * @param preset to get the device names for
 * @param videoDeviceChoices all available video devices
 * @returns
 */
export function getDisplayableDeviceNamesFromPreset(
	preset: PresetEntity | undefined,
	videoDeviceChoices: DropdownChoice[],
): string {
	if (!preset) {
		return 'Unknown'
	}
	return (
		preset.commands
			?.map((command) => getDeviceNameFromVideoDeviceChoices(videoDeviceChoices, command.deviceId ?? -1))
			.filter(onlyUnique)
			.join(', ') ?? 'Unknown'
	)
}
function onlyUnique(value: any, index: any, array: any) {
	return array.indexOf(value) === index
}

export function getPresetChoices(
	self: MiruSuiteModuleInstance,
	videoDeviceChoices: DropdownChoice[],
): DropdownChoice[] {
	try {
		const presets = self.store.getPresets()
		presets.sort((a, b) => {
			const deviceIdA = a.commands?.map((command) => command.deviceId)[0] ?? -1
			const deviceIdB = b.commands?.map((command) => command.deviceId)[0] ?? -1
			return deviceIdA - deviceIdB
		})
		const presetChoices: { id: number; label: string }[] = []
		for (const preset of presets) {
			presetChoices.push({
				id: preset.id ?? -1,
				label:
					(preset.name ?? 'Unkown name') +
					'\n (' +
					getDisplayableDeviceNamesFromPreset(preset, videoDeviceChoices) +
					')',
			})
		}
		return presetChoices
	} catch (error) {
		console.warn('Presets not available', error)
		return []
	}
}

export function getPresetSelector(self: MiruSuiteModuleInstance, presetChoices: DropdownChoice[]): any {
	const offlineMode = self.getVariableValue('offlineMode') === 'true'
	if (offlineMode) {
		return {
			id: 'preset',
			type: 'number',
			label: 'Preset',
			default: 0,
			min: 0,
			max: 10000,
		}
	} else {
		return {
			id: 'preset',
			type: 'dropdown',
			label: 'Preset',
			default: presetChoices[0]?.id ?? -1,
			choices: presetChoices,
		}
	}
}

export function getDeviceSelector(
	self: MiruSuiteModuleInstance,
	deviceChoices: DropdownChoice[],
	multi = false,
	title = 'Device',
): any {
	const offlineMode = self.getVariableValue('offlineMode') === 'true'
	if (offlineMode || deviceChoices.length === 0) {
		let suffix = ''
		if (multi) {
			suffix = ' (comma separated)'
		}
		return {
			id: multi ? 'deviceIds' : 'deviceId',
			type: 'textinput',
			label: title + suffix,
			default: '',
			tooltip: 'To select a device, you first need to create a device in MiruSuite and add a video input to it.',
		}
	} else {
		return {
			id: multi ? 'deviceIds' : 'deviceId',
			type: multi ? 'multidropdown' : 'dropdown',
			label: title,
			default: deviceChoices[0]?.id ?? -1,
			choices: deviceChoices,
			tooltip:
				'You can select multiple devices. To make a device available, you first need to create a device in MiruSuite and add a video input to it.',
		}
	}
}

export function getFaceSelector(self: MiruSuiteModuleInstance, faceChoices: DropdownChoice[]): any {
	const offlineMode = self.getVariableValue('offlineMode') === 'true'
	if (offlineMode) {
		return {
			id: 'person',
			type: 'number',
			label: 'Person',
			default: 0,
			min: 0,
			max: 10000,
			isVisible: (options: any) => options.mode == 'SINGLE',
		}
	} else {
		return {
			id: 'person',
			type: 'dropdown',
			label: 'Person',
			default: faceChoices[0]?.id ?? -1,
			choices: faceChoices,
			isVisible: (options: any) => options.mode == 'SINGLE',
		}
	}
}

export function getInstrumentGroupSelector(): any {
	const instrumentGroupChoices: DropdownChoice[] = []
	instrumentGroupChoices.push({ id: 'All', label: 'All' })
	for (const instrumentGroup of getInstrumentGroups()) {
		instrumentGroupChoices.push({ id: instrumentGroup, label: instrumentGroup })
	}
	return {
		id: 'instrumentGroups',
		type: 'multidropdown',
		label: 'Instrument groups',
		default: ['All'],
		choices: instrumentGroupChoices,
		tooltip: 'If you like to filter for available instrument groups, select them here.',
	}
}

export function isPresetActive(self: MiruSuiteModuleInstance, targetPresetId: number): boolean {
	for (const key in self.store.getActivePresetMap()) {
		if (self.store.getActivePresetMap()[key].id === targetPresetId) {
			return true
		}
	}
	return false
}

export function isPresetLive(
	self: MiruSuiteModuleInstance,
	deviceId2SwitcherInput: DeviceId2SwitcherInput,
	presets: PresetEntity[],
	targetPresetId: number,
): boolean {
	const preset = presets.find((preset) => preset.id === targetPresetId)
	for (const command of preset?.commands ?? []) {
		if (command.deviceId != undefined) {
			if (isDeviceLive(self, deviceId2SwitcherInput, command.deviceId)) {
				return true
			}
		}
	}
	return false
}

export function isDeviceLive(
	self: MiruSuiteModuleInstance,
	deviceId2SwitcherInput: DeviceId2SwitcherInput,
	deviceId: number,
): boolean {
	const switcherInput = deviceId2SwitcherInput[deviceId] ?? '-1'
	return switcherInput !== '-1' && self.store.getLiveInputs().includes(switcherInput)
}

export function isInputLive(self: MiruSuiteModuleInstance, switcherInput: string): boolean {
	return self.store.getLiveInputs().includes(switcherInput)
}

export function getDeviceIdToSwitcherInputMap(self: MiruSuiteModuleInstance): DeviceId2SwitcherInput {
	const deviceId2SwitcherInput: DeviceId2SwitcherInput = {}
	for (const device of self.store.getVideoDevices()) {
		deviceId2SwitcherInput[device.id ?? -1] = device.switcherInput ?? '-1'
	}
	return deviceId2SwitcherInput
}

export function getComponentFeedback(device: Device, component: ComponentId): ComponentFeedback | undefined {
	return device?.feedback[component]
}

export function getComponentOfType(device: Device, type: 'INPUT' | 'CONTROLLER' | 'DIRECTOR'): ComponentId | undefined {
	return Object.keys(device.feedback).find((component) => component.startsWith(type)) as ComponentId | undefined
}

export function getFeedbackForComponentOfType(
	device: Device,
	type: 'INPUT' | 'CONTROLLER' | 'DIRECTOR',
): ComponentFeedback | undefined {
	const componentId = getComponentOfType(device, type)
	if (componentId) {
		return getComponentFeedback(device, componentId)
	}
	return undefined
}

export function isComponentOfTypeEnabled(device: Device, type: 'INPUT' | 'CONTROLLER' | 'DIRECTOR'): boolean {
	const feedback = getFeedbackForComponentOfType(device, type)
	return feedback !== undefined && feedback?.state !== 'OFF'
}

export function getInputComponentType(device: Device): 'AUDIO' | 'VIDEO' | undefined {
	const inputComponent = getComponentOfType(device, 'INPUT')
	if (inputComponent === undefined) return undefined
	else if (inputComponent === 'INPUT_AUDIO') return 'AUDIO'
	else return 'VIDEO'
}

export function getDirectorType(
	device: Device,
): 'DIRECTOR_HEAD_TRACKING' | 'DIRECTOR_AUTO_MOVE' | 'DIRECTOR_LECTURE' | undefined {
	const directorComponent = getComponentOfType(device, 'DIRECTOR')
	if (directorComponent === undefined) return undefined
	else if (directorComponent === 'DIRECTOR_HEAD_TRACKING') return 'DIRECTOR_HEAD_TRACKING'
	else if (directorComponent === 'DIRECTOR_LECTURE') return 'DIRECTOR_LECTURE'
	else return 'DIRECTOR_AUTO_MOVE'
}

export function shotSizeToLabel(shotSize: ShotSize): string {
	switch (shotSize) {
		case 'WIDE':
			return 'Wide'
		case 'MEDIUM':
			return 'Medium'
		case 'CLOSE_UP':
			return 'Close'
	}
}
