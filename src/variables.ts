import type { JsonValue } from '@companion-module/base'
import { readFileSync } from 'node:fs'
import type { MiruSuiteModuleInstance } from './main.js'
import { getInputComponentType } from './scripts/helpers.js'

export function UpdateVariableDefinitions(self: MiruSuiteModuleInstance): void {
	const definitions: Record<string, { name: string }> = {
		connection: { name: 'Connection status' },
		device_count: { name: 'Configured devices' },
		video_device_count: { name: 'Video devices' },
		audio_device_count: { name: 'Audio devices' },
		preset_count: { name: 'Available presets' },
		live_inputs: { name: 'Live inputs' },
		dominant_speaker_override: { name: 'Dominant speaker override' },
		autocut_active: { name: 'AutoCut active' },
		manual_move_speed: { name: 'Manual camera movement speed (%)' },
	}
	for (const direction of ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']) {
		definitions[`ptz_arrow_${direction}`] = { name: `PTZ arrow graphic: ${direction.toUpperCase()}` }
	}

	for (const device of self.store.getDevices()) {
		if (device.id === undefined) continue
		const prefix = `device_${device.id}`
		const name = device.name ?? `Device ${device.id}`
		definitions[`${prefix}_name`] = { name: `${name}: Name` }
		definitions[`${prefix}_type`] = { name: `${name}: Input type` }
		definitions[`${prefix}_switcher_input`] = { name: `${name}: Switcher input` }
		definitions[`${prefix}_live`] = { name: `${name}: Live` }
		definitions[`${prefix}_director_state`] = { name: `${name}: Director state` }
		definitions[`${prefix}_active_preset_id`] = { name: `${name}: Active preset ID` }
		definitions[`${prefix}_active_preset_name`] = { name: `${name}: Active preset` }
		definitions[`${prefix}_tracking_mode`] = { name: `${name}: Tracking mode` }
		definitions[`${prefix}_target_face_id`] = { name: `${name}: Target face ID` }
		definitions[`${prefix}_shot_size`] = { name: `${name}: Shot size` }
		definitions[`${prefix}_sensitivity`] = { name: `${name}: Sensitivity` }
		definitions[`${prefix}_vmix_framer_state`] = { name: `${name}: vMix Framer state` }
		definitions[`${prefix}_autocut_state`] = { name: `${name}: AutoCut state` }
	}

	self.setVariableDefinitions(definitions)
	if (!self.ptzArrowImagesInitialized) {
		const arrowValues: Record<string, string> = {}
		for (const direction of ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']) {
			const base64 = readFileSync(new URL(`./static/arrows/${direction}.png`, import.meta.url)).toString('base64')
			arrowValues[`ptz_arrow_${direction}`] = `data:image/png;base64,${base64}`
		}
		self.setVariableValues({ ...buildVariableValues(self), ...arrowValues })
		self.ptzArrowImagesInitialized = true
	} else {
		self.setVariableValues(buildVariableValues(self))
	}
}

export function UpdateVariableValues(self: MiruSuiteModuleInstance): void {
	self.setVariableValues(buildVariableValues(self))
}

function buildVariableValues(self: MiruSuiteModuleInstance): Record<string, JsonValue> {
	const devices = self.store.getDevices()
	const videoDevices = self.store.getVideoDevices()
	const audioDevices = self.store.getAudioDevices()
	const liveInputs = self.store.getLiveInputs()
	const activePresets = self.store.getActivePresetMap()
	const values: Record<string, JsonValue> = {
		connection: self.connectionState,
		device_count: devices.length,
		video_device_count: videoDevices.length,
		audio_device_count: audioDevices.length,
		preset_count: self.store.getPresets().length,
		live_inputs: liveInputs.join(', '),
		dominant_speaker_override: self.store.getDominantSpeakerOverride() ?? -1,
		autocut_active: self.store.isAutoCutRunning(),
		manual_move_speed: `${Math.round(self.manualMoveSpeed * 100)}%`,
	}

	for (const device of devices) {
		if (device.id === undefined) continue
		const prefix = `device_${device.id}`
		const directorId = Object.keys(device.feedback ?? {}).find((id) => id.startsWith('DIRECTOR'))
		const activePreset = activePresets[String(device.id)]
		const activePresetEntity = activePreset?.id === undefined ? undefined : self.store.getPresetById(activePreset.id)
		const personTracker = device.components?.personTracker
		const directorSettings = device.components?.headTrackingDirector
		const autocutState = device.feedback?.['AUTO_CUT_AUDIO']?.state ?? device.feedback?.['AUTO_CUT']?.state
		values[`${prefix}_name`] = device.name ?? ''
		values[`${prefix}_type`] = getInputComponentType(device) ?? ''
		values[`${prefix}_switcher_input`] = device.switcherInput ?? ''
		values[`${prefix}_live`] =
			device.switcherInput !== undefined && device.switcherInput !== null && liveInputs.includes(device.switcherInput)
		values[`${prefix}_director_state`] = directorId ? (device.feedback?.[directorId]?.state ?? 'OFF') : 'OFF'
		values[`${prefix}_active_preset_id`] = activePreset?.id ?? -1
		values[`${prefix}_active_preset_name`] = activePresetEntity?.name ?? ''
		values[`${prefix}_tracking_mode`] = personTracker?.trackingMode ?? ''
		values[`${prefix}_target_face_id`] = personTracker?.targetFaceId ?? -1
		values[`${prefix}_shot_size`] = directorSettings?.targetShotSize ?? ''
		values[`${prefix}_sensitivity`] = directorSettings?.sensitivity ?? -1
		values[`${prefix}_vmix_framer_state`] = device.feedback?.['FRAMER_VMIX']?.state ?? 'OFF'
		values[`${prefix}_autocut_state`] = autocutState ?? 'OFF'
	}
	return values
}
