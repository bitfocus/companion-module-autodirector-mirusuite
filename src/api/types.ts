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

export function toShotSize(value: any): ShotSize | undefined {
	if (['WIDE', 'MEDIUM', 'CLOSE_UP'].includes(value)) {
		return value
	}
	return undefined
}

export function toTrackingMode(value: any): TrackingMode | undefined {
	if (['ALL', 'MANUAL', 'SINGLE'].includes(value)) {
		return value
	}
	return undefined
}
