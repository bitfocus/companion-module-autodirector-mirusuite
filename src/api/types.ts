import type { InputValue } from '@companion-module/base'
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

export function toShotSize(value: InputValue | undefined): ShotSize | undefined {
	if (value == 'WIDE') return 'WIDE'
	if (value == 'MEDIUM') return 'MEDIUM'
	if (value == 'CLOSE_UP') return 'CLOSE_UP'
	return undefined
}

export function toTrackingMode(value: InputValue | undefined): TrackingMode | undefined {
	if (value == 'SINGLE') return 'SINGLE'
	if (value == 'ALL') return 'ALL'
	if (value == 'MANUAL') return 'MANUAL'
	return undefined
}
