import type { JsonValue } from '@companion-module/base'
import type { components } from './openapi.js'

export type Device = components['schemas']['Device']
export type ComponentId = components['schemas']['ComponentId']
export type ComponentFeedback = components['schemas']['ComponentFeedback']
export type ComponentState = components['schemas']['ComponentState']
export type PresetEntity = components['schemas']['PresetEntity']
export type ActivePreset = components['schemas']['ActivePreset']
export type FaceIdEntity = components['schemas']['FaceIdEntity']
export type ShotSize = components['schemas']['ShotSize']
export type TrackingMode = components['schemas']['TrackingMode']
export type GUIUpdate = components['schemas']['GUIUpdate']
export type ProjectEntity = components['schemas']['ProjectEntity']
export type ProjectSummary = components['schemas']['ProjectSummary']
export type ProjectLoadImpact = components['schemas']['ProjectLoadImpact']
export type DeviceSummary = components['schemas']['DeviceSummary']
export type GamepadSelectedDevice = components['schemas']['GamepadSelectedDevice']
export type OrchestraSettings = components['schemas']['OrchestraSettings']
export type OrchestraBooleanSetting =
	| 'movePreviewCameras'
	| 'saveCameraGain'
	| 'saveDirectorSettings'
	| 'autoMoveCameras'
export type MusicPiece = components['schemas']['MusicPiece']
export type Setlist = components['schemas']['Setlist']
export type MusicFollowerState = components['schemas']['MusicFollowerStateDto']
export type State = components['schemas']['State']
export type SwitcherState = components['schemas']['SwitcherState']
export type ControllerState = components['schemas']['ControllerState']

export function toShotSize(value: JsonValue | undefined): ShotSize | undefined {
	if (value == 'WIDE') return 'WIDE'
	if (value == 'MEDIUM') return 'MEDIUM'
	if (value == 'CLOSE_UP') return 'CLOSE_UP'
	return undefined
}

export function toTrackingMode(value: JsonValue | undefined): TrackingMode | undefined {
	if (value == 'SINGLE') return 'SINGLE'
	if (value == 'ALL') return 'ALL'
	if (value == 'MANUAL') return 'MANUAL'
	return undefined
}
