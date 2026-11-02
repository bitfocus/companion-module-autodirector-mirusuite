import type { InstanceTypes } from '@companion-module/base'
import type { ModuleConfig, ModuleSecrets } from './config.js'

export type ActionSchemas = {
	setShotSize: { options: { size?: string | number; deviceId?: string | number } }
	toggleDirector: { options: { deviceId?: string | number } }
	setDirector: { options: { deviceId?: string | number; enabled?: string | number } }
	setComponent: { options: { deviceId?: string | number; componentType?: string | number; enabled?: string | number } }
	setTrackingMode: { options: { mode?: string | number; person?: string | number; deviceId?: string | number } }
	correctFraming: { options: { deviceId?: string | number } }
	learnTargetFace: { options: { deviceId?: string | number } }
	playPreset: { options: { preset?: string | number; force?: boolean } }
	playActivePreset: { options: { deviceId?: string | number; force?: boolean } }
	overwritePreset: { options: { preset?: string | number } }
	triggerMovement: { options: { deviceId?: string | number; type?: string | number } }
	triggerReturnToHome: { options: { deviceId?: string | number } }
	moveCamera: { options: { deviceId?: string | number; pan?: number; tilt?: number; zoom?: number } }
	increaseMoveSpeed: { options: { step?: number } }
	decreaseMoveSpeed: { options: { step?: number } }
	exitSteadyMode: { options: { deviceId?: string | number } }
	stopAutoMove: { options: { deviceId?: string | number } }
	updateTargetShotSizeConfig: { options: { size?: string | number; step?: number; increment?: string | number } }
	adjustFramer: { options: { deviceId?: string | number } }
	toggleVMixFramer: { options: { deviceId?: string | number } }
	setVMixFramer: { options: { deviceId?: string | number; enabled?: string | number } }
	moveTargetPoint: { options: { deviceId?: string | number; deltaX?: number; deltaY?: number } }
	updateSensitivity: { options: { deviceId?: string | number; deltaSensitivity?: number } }
	toggleAutoCut: { options: { mode?: string | number } }
	setOverrideDominantSpeaker: { options: { deviceId?: string | number; mode?: string | number } }
	cutToInput: { options: { input?: string } }
	setPreviewInput: { options: { input?: string } }
	cutSwitcher: { options: Record<string, never> }
	triggerTransition: { options: Record<string, never> }
	loadProject: {
		options: {
			projectId?: string | number
			confirmInterruptions?: boolean
			enableDevices?: boolean
			restoreAutoCut?: boolean
			restoreSwitcher?: boolean
		}
	}
	setGamepadDevice: { options: { deviceId?: string | number } }
	startMusicFollower: { options: { deviceId?: string | number } }
	stopMusicFollower: { options: { deviceId?: string | number } }
	selectMusicPiece: { options: { deviceId?: string | number; pieceId?: string | number } }
	selectMusicSetlistEntry: { options: { deviceId?: string | number; entry?: string | number } }
	musicFollowerNext: { options: { deviceId?: string | number } }
	musicFollowerPrevious: { options: { deviceId?: string | number } }
	musicFollowerReset: { options: { deviceId?: string | number } }
	toggleOrchestraDevice: { options: { deviceId?: string | number } }
	setOrchestraSetting: {
		options: {
			setting?: string | number
			booleanValue?: string | number
			numberValue?: number
			deviceIds?: (string | number)[]
		}
	}
}

export type FeedbackSchemas = {
	enabledComponentType: { type: 'boolean'; options: { deviceId?: string | number; componentType?: string | number } }
	directorStatus: { type: 'advanced'; options: { deviceId?: string | number } }
	trackingMode: {
		type: 'advanced'
		options: { mode?: string | number; person?: string | number; deviceId?: string | number }
	}
	shotSize: { type: 'boolean'; options: { size?: string | number; deviceId?: string | number } }
	activePreset: { type: 'boolean'; options: { preset?: string | number } }
	liveDevice: { type: 'boolean'; options: { deviceId?: string | number } }
	liveInput: { type: 'boolean'; options: { input?: string } }
	switcherBusInput: { type: 'boolean'; options: { bus?: string | number; input?: string } }
	autoCut: { type: 'boolean'; options: Record<string, never> }
	dominantSpeakerOverride: { type: 'boolean'; options: { deviceId?: string | number } }
	vMixFramerEnabled: { type: 'boolean'; options: { deviceId?: string | number } }
	controllerConnected: { type: 'boolean'; options: { deviceId?: string | number } }
	framingStable: { type: 'boolean'; options: { deviceId?: string | number } }
	dominantSpeaker: { type: 'boolean'; options: { deviceId?: string | number } }
	activeProject: { type: 'boolean'; options: { projectId?: string | number } }
	gamepadSelectedDevice: { type: 'boolean'; options: { deviceId?: string | number } }
	autoCutState: { type: 'boolean'; options: { state?: string | number } }
	musicFollower: { type: 'boolean'; options: { status?: string | number; deviceId?: string | number } }
	musicFollowerPieceSelected: { type: 'boolean'; options: { deviceId?: string | number; pieceId?: number } }
	musicFollowerSetlistEntrySelected: {
		type: 'boolean'
		options: { deviceId?: string | number; setlistId?: number; entryId?: number }
	}
	orchestraSetting: { type: 'boolean'; options: { setting?: string | number; value?: string } }
	orchestraDeviceEnabled: { type: 'boolean'; options: { deviceId?: string | number } }
}

export interface MiruSuiteInstanceTypes extends InstanceTypes {
	config: ModuleConfig
	secrets: ModuleSecrets
	actions: ActionSchemas
	feedbacks: FeedbackSchemas
}
