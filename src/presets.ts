import type { DropdownChoice } from '@companion-module/base'
import type { MiruSuiteModuleInstance } from './main.js'
import type { LegacyPresets as CompanionPresetDefinitions } from './presets/helpers.js'
import { convertLegacyPresets } from './presets/modern.js'
import {
	addExitSteadyModePreset,
	addLearnTargetFacePreset,
	addMoveTargetButtonPresets,
	addMoveTargetRotaryPresets,
	addReApplyPreset,
	addReturnToHomeButton,
	addShotSizePreset,
	addStopAutoMovePreset,
	addTrackingModePreset,
	addTriggerMovementPreset,
	addUpdateSensitivityPresets,
	addUpdateSensitivityRotaryPresets,
	disableDirectorPreset,
	enableDirectorPreset,
	toggleDirectorPreset,
} from './presets/legacy-camera.js'
import {
	addConfigureTargetShotSizes,
	addOverrideDominantSpeakerPreset,
	addToggleAutoCutAudioPreset,
	addTriggerAutoCut,
} from './presets/legacy-autocut.js'
import { addManualMoveSpeedPresets, addPTZDirectionPresets, addPTZZoomPresets } from './presets/ptz.js'
import { addPlayPresetPreset } from './presets/saved.js'
import { addVMixFramerPresets } from './presets/vmix.js'
import { getCameraWorkflowPresets } from './presets/camera.js'
import { getGamepadPresets } from './presets/gamepad.js'
import { getOrchestraPresets } from './presets/orchestra.js'
import { getProjectPresets } from './presets/projects.js'
import { getSwitcherPresets } from './presets/switcher.js'
import {
	createDeviceOptions,
	createFaceOptions,
	getPresetChoices,
	getComponentOfType,
	getDeviceById,
	hasPTZController,
} from './scripts/helpers.js'

export function UpdatePresets(self: MiruSuiteModuleInstance): void {
	const faceChoices: DropdownChoice[] = createFaceOptions(self)
	const videoDeviceChoices: DropdownChoice[] = createDeviceOptions(self.store.getVideoDevices())
	const audioDeviceChoices: DropdownChoice[] = createDeviceOptions(self.store.getAudioDevices())
	const vmixFramerDeviceChoices: DropdownChoice[] = createDeviceOptions(self.store.getVMixFramerDevices())
	const devicePresets: DropdownChoice[] = getPresetChoices(self, videoDeviceChoices)

	self.log(
		'debug',
		'Updating presets with ' + videoDeviceChoices.length + ' devices and ' + devicePresets.length + ' device presets',
	)
	const presets: CompanionPresetDefinitions = {}

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
		if (videoDevice != null && getComponentOfType(videoDevice, 'CONTROLLER') != null) {
			addReturnToHomeButton(presets, videoDeviceChoices, deviceId)
			addReApplyPreset(presets, videoDeviceChoices, deviceId)
		}
		if (hasPTZController(videoDevice)) {
			addPTZDirectionPresets(presets, videoDeviceChoices, deviceId)
			addPTZZoomPresets(presets, videoDeviceChoices, deviceId)
		}
	}
	for (const choice of audioDeviceChoices) {
		const deviceId = Number(choice.id)
		addOverrideDominantSpeakerPreset(presets, audioDeviceChoices, deviceId)
		if (getDeviceById(self.store.getAudioDevices(), deviceId)?.components?.audioAutoCut) {
			addToggleAutoCutAudioPreset(presets, audioDeviceChoices, deviceId)
		}
	}
	for (const choice of vmixFramerDeviceChoices) {
		const deviceId = Number(choice.id)
		addVMixFramerPresets(presets, vmixFramerDeviceChoices, deviceId)
	}
	if (videoDeviceChoices.some((choice) => hasPTZController(self.store.getDeviceById(Number(choice.id))))) {
		addManualMoveSpeedPresets(presets)
	}
	for (const devicePreset of devicePresets) {
		addPlayPresetPreset(presets, devicePreset)
	}
	addTriggerAutoCut(presets)
	addConfigureTargetShotSizes(presets)
	Object.assign(
		presets,
		getProjectPresets(self),
		getSwitcherPresets(self),
		getCameraWorkflowPresets(self),
		getGamepadPresets(self),
		getOrchestraPresets(self),
	)
	const { structure, definitions } = convertLegacyPresets(self, presets)
	self.setPresetDefinitions(structure, definitions)
}
