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
		active_project_id: { name: 'Active project ID' },
		active_project_name: { name: 'Active project' },
		dominant_speaker_id: { name: 'Detected dominant speaker ID' },
		dominant_speaker_name: { name: 'Detected dominant speaker' },
		gamepad_device_id: { name: 'Gamepad camera ID' },
		gamepad_device_name: { name: 'Gamepad camera' },
		autocut_state: { name: 'AutoCut live state' },
		autocut_substate: { name: 'AutoCut live substate' },
		autocut_remaining_time: { name: 'AutoCut remaining time (seconds)' },
		autocut_live_shots: { name: 'AutoCut live shots' },
		orchestra_move_preview_cameras: { name: 'Orchestra: Move preview cameras' },
		orchestra_move_camera_count: { name: 'Orchestra: Cameras to move' },
		orchestra_save_camera_gain: { name: 'Orchestra: Save camera gain' },
		orchestra_save_director_settings: { name: 'Orchestra: Save director settings' },
		orchestra_auto_move_cameras: { name: 'Orchestra: Auto move cameras' },
		orchestra_audio_callout_prep_lead_seconds: { name: 'Orchestra: Audio callout lead time' },
		orchestra_audio_callout_prep_group_window_seconds: { name: 'Orchestra: Audio callout group window' },
		orchestra_camera_preparation_lead_seconds: { name: 'Orchestra: Camera preparation lead time' },
		orchestra_disabled_device_ids: { name: 'Orchestra: Excluded device IDs' },
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
		definitions[`${prefix}_controller_connection_state`] = { name: `${name}: Controller connection` }
		definitions[`${prefix}_controller_pan_angle`] = { name: `${name}: Controller pan angle` }
		definitions[`${prefix}_controller_tilt_angle`] = { name: `${name}: Controller tilt angle` }
		definitions[`${prefix}_controller_horizontal_fov`] = { name: `${name}: Controller horizontal field of view` }
		definitions[`${prefix}_tracking_person_count`] = { name: `${name}: Tracked person count` }
		definitions[`${prefix}_framing_stable`] = { name: `${name}: Framing stable` }
		definitions[`${prefix}_steady_mode`] = { name: `${name}: Steady mode` }
		definitions[`${prefix}_music_follower_state`] = { name: `${name}: Music Follower component state` }
		definitions[`${prefix}_music_follower_status`] = { name: `${name}: Music Follower status` }
		definitions[`${prefix}_music_follower_position`] = { name: `${name}: Music Follower position (seconds)` }
		definitions[`${prefix}_music_follower_progress`] = { name: `${name}: Music Follower progress` }
		definitions[`${prefix}_music_follower_piece_id`] = { name: `${name}: Music Follower piece ID` }
		definitions[`${prefix}_music_follower_setlist_id`] = { name: `${name}: Music Follower setlist ID` }
		definitions[`${prefix}_music_follower_error`] = { name: `${name}: Music Follower error` }
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
	const autoCutState = self.store.getLiveState('autoCutState')
	const liveShots = self.store.getLiveState('autoCutShotState')
	const autoCut = autoCutState?.target === 'autoCutState' ? autoCutState : undefined
	const shotState = liveShots?.target === 'autoCutShotState' ? liveShots : undefined
	const orchestra = self.store.getOrchestraSettings()
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
		active_project_id: self.store.getActiveProject()?.id ?? -1,
		active_project_name: self.store.getActiveProject()?.name ?? '',
		dominant_speaker_id: self.store.getDominantSpeaker()?.id ?? -1,
		dominant_speaker_name: self.store.getDominantSpeaker()?.name ?? '',
		gamepad_device_id: self.store.getGamepadDeviceId() ?? -1,
		gamepad_device_name: self.store.getDeviceById(self.store.getGamepadDeviceId() ?? -1)?.name ?? '',
		autocut_state: autoCut?.state ?? '',
		autocut_substate: autoCut?.subState ?? '',
		autocut_remaining_time: autoCut?.remainingTime ?? -1,
		autocut_live_shots:
			shotState?.liveShots
				?.map((shot) => shot.name ?? String(shot.id ?? ''))
				.filter(Boolean)
				.join(', ') ?? '',
		orchestra_move_preview_cameras: orchestra.movePreviewCameras ?? false,
		orchestra_move_camera_count: orchestra.moveCameraCount ?? -1,
		orchestra_save_camera_gain: orchestra.saveCameraGain ?? false,
		orchestra_save_director_settings: orchestra.saveDirectorSettings ?? false,
		orchestra_auto_move_cameras: orchestra.autoMoveCameras ?? false,
		orchestra_audio_callout_prep_lead_seconds: orchestra.audioCalloutPrepLeadSeconds ?? -1,
		orchestra_audio_callout_prep_group_window_seconds: orchestra.audioCalloutPrepGroupWindowSeconds ?? -1,
		orchestra_camera_preparation_lead_seconds: orchestra.cameraPreparationLeadSeconds ?? -1,
		orchestra_disabled_device_ids: orchestra.disabledDeviceIds?.join(', ') ?? '',
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
		const controller = self.store.getLiveState('controller', device.id)
		const personTrackerState = self.store.getLiveState('personTracker', device.id)
		const framingStable = self.store.getLiveState('framingStable', device.id)
		const steadyMode = self.store.getLiveState('steadyMode', device.id)
		const music = self.store.getMusicFollowerState(device.id)
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
		values[`${prefix}_controller_connection_state`] =
			controller?.target === 'controller' ? (controller.connectionState ?? '') : ''
		values[`${prefix}_controller_pan_angle`] = controller?.target === 'controller' ? (controller.panAngle ?? -1) : -1
		values[`${prefix}_controller_tilt_angle`] = controller?.target === 'controller' ? (controller.tiltAngle ?? -1) : -1
		values[`${prefix}_controller_horizontal_fov`] =
			controller?.target === 'controller' ? (controller.horizontalFov ?? -1) : -1
		values[`${prefix}_tracking_person_count`] =
			personTrackerState?.target === 'personTracker' ? (personTrackerState.persons?.length ?? 0) : 0
		values[`${prefix}_framing_stable`] =
			framingStable?.target === 'framingStable' ? (framingStable.enabled ?? false) : false
		values[`${prefix}_steady_mode`] = steadyMode?.target === 'steadyMode' ? (steadyMode.enabled ?? false) : false
		values[`${prefix}_music_follower_state`] = device.feedback?.['MUSIC_FOLLOWER']?.state ?? 'OFF'
		values[`${prefix}_music_follower_status`] = music?.status ?? ''
		values[`${prefix}_music_follower_position`] = music?.positionSeconds ?? -1
		values[`${prefix}_music_follower_progress`] = music?.progress ?? -1
		values[`${prefix}_music_follower_piece_id`] = music?.selectedPieceId ?? -1
		values[`${prefix}_music_follower_setlist_id`] = music?.selectedSetlistId ?? -1
		values[`${prefix}_music_follower_error`] = music?.errorMessage ?? ''
	}
	return values
}
