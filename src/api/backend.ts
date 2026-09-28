/* eslint-disable n/no-unsupported-features/node-builtins */
import Jimp from 'jimp'
import { InstanceStatus } from '@companion-module/base'
import { MiruSuiteModuleInstance } from '../main.js'
import { getComponentOfType } from '../scripts/helpers.js'
import createClient, { type Client } from 'openapi-fetch'
import { paths } from './openapi.js'
import type {
	ActivePreset,
	Device,
	DeviceSummary,
	FaceIdEntity,
	GamepadSelectedDevice,
	MusicFollowerState,
	MusicPiece,
	OrchestraBooleanSetting,
	OrchestraSettings,
	PresetEntity,
	ProjectLoadImpact,
	ProjectSummary,
	Setlist,
	SwitcherState,
	ShotSize,
	TrackingMode,
} from './types.js'

export default class Backend {
	private self: MiruSuiteModuleInstance
	private baseUrl: string | undefined = undefined
	private _client: Client<paths> | undefined = undefined

	get client(): Client<paths> {
		if (this._client === undefined) {
			throw new Error('Client not initialized')
		}
		return this._client
	}

	constructor(self: MiruSuiteModuleInstance) {
		this.self = self
	}

	async setup(serverIP: string, serverPort: number, username: string = '', password: string = ''): Promise<void> {
		this.self.updateStatus(InstanceStatus.Connecting)
		try {
			serverIP = serverIP.trim()
			if (serverIP === 'localhost') {
				serverIP = '127.0.0.1'
			}
			this.baseUrl = `http://${serverIP}:${serverPort}`
			this.self.log('debug', `Setting up backend for base url ${this.baseUrl}`)
			// We override the fetch function to update connection status and throw in case of errors
			const checkedFetch: typeof fetch = async (input, init) => {
				try {
					const response = await fetch(input, init)
					const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
					const projectLoadConflict =
						response.status === 409 && new URL(requestUrl, this.baseUrl).pathname === '/api/projects/load'
					if (!response.ok && !projectLoadConflict) {
						throw new Error(`MiruSuite returned ${response.status} ${response.statusText}`)
					}
					if (projectLoadConflict) return response
					this.self.connectionState = 'Connected'
					this.self.updateStatus(InstanceStatus.Ok)
					if (this.self.store.hasConfiguration) this.self.updateVariableValues()
					return response
				} catch (error) {
					this.self.connectionState = 'Disconnected'
					this.self.updateStatus(InstanceStatus.ConnectionFailure)
					this.self.store.clearLiveState()
					if (this.self.store.hasConfiguration) {
						this.self.updateVariableValues()
						this.self.checkFeedbacks(
							'liveDevice',
							'liveInput',
							'switcherBusInput',
							'controllerConnected',
							'framingStable',
							'musicFollower',
							'autoCut',
							'autoCutState',
							'dominantSpeaker',
							'dominantSpeakerOverride',
						)
					}
					throw error
				}
			}
			let headers = undefined
			if (username && password) {
				headers = {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: 'Basic ' + Buffer.from(username + ':' + password).toString('base64'),
				}
			} else {
				headers = {
					'Content-Type': 'application/json',
					Accept: 'application/json',
				}
			}

			this._client = createClient<paths>({
				baseUrl: this.baseUrl,
				fetch: checkedFetch,
				headers: headers,
			})
			this.self.log('debug', 'Backend setup complete')
		} catch (error) {
			this.self.log('error', 'Error setting up backend' + error)
			this.self.updateStatus(InstanceStatus.ConnectionFailure)
			throw error
		}
	}

	async loadDevices(): Promise<Device[]> {
		const response = await this.client.GET('/api/devices')
		return response.data ?? []
	}

	async loadProjects(): Promise<ProjectSummary[]> {
		const response = await this.client.GET('/api/projects')
		return response.data ?? []
	}

	async loadActiveProject(): Promise<ProjectSummary | null> {
		const response = await this.client.GET('/api/projects/active')
		return response.data ? { id: response.data.id, name: response.data.name } : null
	}

	async loadGamepadSelectedDevice(): Promise<GamepadSelectedDevice> {
		const response = await this.client.GET('/api/gamepad/selected-device')
		return response.data ?? { deviceId: null }
	}

	async setGamepadSelectedDevice(deviceId: number | null): Promise<void> {
		await this.client.PUT('/api/gamepad/selected-device', { body: { deviceId } })
	}

	async loadDominantSpeaker(): Promise<DeviceSummary | null> {
		const response = await this.client.GET('/api/autocut/dominantSpeaker')
		return response.data ?? null
	}

	async loadOrchestraSettings(): Promise<OrchestraSettings> {
		const response = await this.client.GET('/api/config/orchestra-settings')
		return response.data ?? {}
	}

	async updateOrchestraSettings(patch: Partial<OrchestraSettings>): Promise<OrchestraSettings> {
		const current = await this.loadOrchestraSettings()
		const updated = { ...current, ...patch }
		return this.saveOrchestraSettings(updated)
	}

	async toggleOrchestraSetting(setting: OrchestraBooleanSetting): Promise<OrchestraSettings> {
		const current = await this.loadOrchestraSettings()
		const updated = { ...current, [setting]: current[setting] !== true }
		return this.saveOrchestraSettings(updated)
	}

	private async saveOrchestraSettings(updated: OrchestraSettings): Promise<OrchestraSettings> {
		await this.client.PUT('/api/config/orchestra-settings', { body: updated })
		this.self.store.setOrchestraSettings(updated)
		this.self.updateVariableValues()
		this.self.checkFeedbacks('orchestraSetting')
		return updated
	}

	async loadMusicPieces(): Promise<MusicPiece[]> {
		const response = await this.client.GET('/api/orchestra/pieces')
		return response.data ?? []
	}

	async loadSetlists(): Promise<Setlist[]> {
		const response = await this.client.GET('/api/orchestra/setlists')
		return response.data ?? []
	}

	async loadMusicFollowerState(deviceId: number): Promise<MusicFollowerState> {
		const response = await this.client.GET('/api/devices/{deviceId}/music-follower/state', {
			params: { path: { deviceId } },
		})
		if (!response.data) throw new Error(`No Music Follower state returned for device ${deviceId}`)
		return response.data
	}

	async setMusicFollowerPiece(deviceId: number, pieceId: number): Promise<void> {
		await this.client.PUT('/api/devices/{deviceId}/music-follower/selection/piece', {
			params: { path: { deviceId } },
			body: { pieceId },
		})
	}

	async setMusicFollowerSetlistEntry(deviceId: number, setlistId: number, entryId: number): Promise<void> {
		await this.client.PUT('/api/devices/{deviceId}/music-follower/selection/setlist-entry', {
			params: { path: { deviceId } },
			body: { setlistId, entryId },
		})
	}

	async musicFollowerNext(deviceId: number): Promise<void> {
		await this.client.POST('/api/devices/{deviceId}/music-follower/next', { params: { path: { deviceId } } })
	}

	async musicFollowerPrevious(deviceId: number): Promise<void> {
		await this.client.POST('/api/devices/{deviceId}/music-follower/previous', { params: { path: { deviceId } } })
	}

	async musicFollowerReset(deviceId: number): Promise<void> {
		await this.client.POST('/api/devices/{deviceId}/music-follower/reset', { params: { path: { deviceId } } })
	}

	async correctFraming(id: number): Promise<void> {
		await this.client.POST('/api/devices/{id}/director/framing/correct', { params: { path: { id } } })
	}

	async cutSwitcher(): Promise<void> {
		await this.client.POST('/api/switcher/cut')
	}

	async triggerTransition(): Promise<void> {
		await this.client.POST('/api/switcher/transition')
	}

	async loadProject(
		id: number,
		confirmInterruptions: boolean,
	): Promise<{ loaded: boolean; impact?: ProjectLoadImpact }> {
		let response = await this.client.PUT('/api/projects/load', { params: { query: { id } } })
		if (response.response.status === 409) {
			const impact = response.error
			if (!confirmInterruptions || !impact?.confirmationToken) return { loaded: false, impact }
			response = await this.client.PUT('/api/projects/load', {
				params: { query: { id, confirm: true, confirmationToken: impact.confirmationToken } },
			})
			if (!response.response.ok) throw new Error(`Project load failed with HTTP ${response.response.status}`)
			return { loaded: true, impact }
		}
		if (!response.response.ok) throw new Error(`Project load failed with HTTP ${response.response.status}`)
		return { loaded: true }
	}

	/**
	 * Enables, disables or toggles the component with the given type of a device.
	 * @param device device to update
	 * @param enabled true = enable, false = disable, undefined = toggle
	 * @returns after completion
	 */
	async toggleComponent(
		device: Device | undefined,
		enabled?: boolean,
		type: 'INPUT' | 'CONTROLLER' | 'DIRECTOR' | 'AUTO_CUT' | 'MUSIC_FOLLOWER' = 'DIRECTOR',
	): Promise<void> {
		if (device === undefined) {
			return
		}
		const componentId = getComponentOfType(device, type)
		if (componentId === undefined) {
			this.self.log('warn', 'Device ' + device.name + ' has no ' + type.toLowerCase() + ' component')
			return
		}

		enabled ??= device.feedback?.[componentId]?.state !== 'RUNNING'
		await this.client.POST(enabled ? '/api/devices/{id}/{component}/enable' : '/api/devices/{id}/{component}/disable', {
			params: { path: { id: device.id ?? -1, component: componentId } },
		})
	}

	async toggleVMixFramer(device: Device | undefined, enabled?: boolean): Promise<void> {
		if (device === undefined) {
			return
		}
		const framer = device.components?.vMixFramer
		if (framer == null) {
			return
		}
		enabled ??= device.feedback?.['FRAMER_VMIX']?.state !== 'RUNNING'
		await this.client.POST(enabled ? '/api/devices/{id}/{component}/enable' : '/api/devices/{id}/{component}/disable', {
			params: { path: { id: device.id ?? -1, component: 'FRAMER_VMIX' } },
		})
	}

	async setShotSize(device: Device | undefined, shotSize: ShotSize): Promise<void> {
		if (device === undefined) {
			return
		}
		const settings = device.components?.headTrackingDirector
		if (settings !== null && settings !== undefined) {
			await this.client.PUT('/api/devices/{id}', {
				params: { path: { id: device.id ?? -1 } },
				body: {
					patch: {
						headTrackingDirector: { ...settings, targetShotSize: shotSize },
					},
				},
			})
		}
	}

	async listFaces(): Promise<FaceIdEntity[]> {
		const response = await this.client.GET('/api/faces/persistent')
		return response?.data ?? []
	}

	async learnTargetFace(device: Device | undefined): Promise<void> {
		await this.client.POST('/api/devices/{id}/tracker/learn', {
			params: { path: { id: device?.id ?? -1 } },
		})
	}

	async listPresets(): Promise<PresetEntity[]> {
		const response = await this.client.GET('/api/projects/active')
		if (response?.data !== undefined) {
			const project = response.data
			const presets = project.presets ?? []
			// Remove preview images to save memory
			return presets.map((p) => ({ ...p, previewBase64: undefined }))
		}
		return []
	}

	async playPreset(id: number, force: boolean): Promise<void> {
		await this.client.POST('/api/projects/active/presets/{id}/play', {
			params: { path: { id }, query: { force } },
		})
	}

	async playActivePreset(device: number, force: boolean): Promise<void> {
		await this.client.POST('/api/projects/active/presets/reapply/{device}', {
			params: { path: { device }, query: { force } },
		})
	}

	async overwritePreset(id: number): Promise<void> {
		await this.client.POST('/api/projects/active/presets/{id}/overwrite', {
			params: { path: { id } },
		})
	}

	async loadActivePresetMap(): Promise<{ [key: number]: ActivePreset }> {
		const response = await this.client.GET('/api/projects/active/presets/active')
		return response?.data ?? {}
	}

	async setTrackingMode(device: Device | undefined, mode: TrackingMode, targetFaceId: number): Promise<void> {
		if (device === undefined) {
			return
		}
		const personTracker = device.components?.personTracker
		if (personTracker !== undefined && personTracker !== null) {
			await this.client.PUT('/api/devices/{id}', {
				params: { path: { id: device.id ?? -1 } },
				body: { patch: { personTracker: { ...personTracker, trackingMode: mode, targetFaceId } } },
			})
		}
	}

	async loadPreviewImage(personId: number): Promise<Jimp | undefined> {
		try {
			return await Jimp.read(`${this.baseUrl}/api/faces/${personId}/img`)
		} catch (error) {
			this.self.log('warn', 'Error loading preview image for person' + personId + ' - ' + error)
			return undefined
		}
	}

	async getSwitcherState(): Promise<SwitcherState> {
		const response = await this.client.GET('/api/switcher')
		const state = response.data ?? {}
		if (state.connectionStatus !== 'CONNECTED') {
			this.self.log('debug', 'Switcher not connected')
			return { ...state, programs: [], preview: [] }
		}
		return state
	}

	async getLiveInputs(): Promise<string[]> {
		return (await this.getSwitcherState()).programs ?? []
	}

	async setPreview(input: string): Promise<void> {
		await this.client.POST('/api/switcher/preview/{input}', {
			params: { path: { input } },
		})
	}

	async triggerRandomMove(id: number): Promise<void> {
		await this.client.POST('/api/devices/{id}/director/automove', {
			params: { path: { id } },
		})
	}

	async triggerPresetTransitionMove(id: number): Promise<void> {
		await this.client.POST('/api/devices/{id}/director/presetmove', {
			params: { path: { id } },
		})
	}

	async stopAutoMove(id: number): Promise<void> {
		await this.client.POST('/api/devices/{id}/director/stop', {
			params: { path: { id } },
		})
	}

	async triggerReturnToHome(id: number): Promise<void> {
		await this.client.POST('/api/devices/{id}/controller/control', {
			params: { path: { id } },
			body: { returnToHome: true },
		})
	}

	async moveCamera(id: number, panSpeed: number, tiltSpeed: number, zoomSpeed: number): Promise<void> {
		await this.client.POST('/api/devices/{id}/controller/control', {
			params: { path: { id } },
			body: { panSpeed, tiltSpeed, zoomSpeed },
		})
	}

	async isAutoCutRunning(): Promise<boolean> {
		const response = await this.client.GET('/api/autocut')
		return response.data?.running ?? false
	}

	async setAutoCut(activate: boolean): Promise<void> {
		await this.client.PUT(activate ? '/api/autocut/start' : '/api/autocut/stop')
	}

	async toggleAutoCut(): Promise<void> {
		const enabled = this.self.store.isAutoCutRunning()
		await this.client.PUT(enabled ? '/api/autocut/stop' : '/api/autocut/start')
	}

	async cutTo(input: string): Promise<void> {
		await this.client.POST('/api/switcher/program/{input}', {
			params: { path: { input } },
		})
	}

	async exitSteadyMode(id: number): Promise<void> {
		await this.client.POST('/api/devices/{id}/director/steady/exit', {
			params: { path: { id } },
		})
	}

	/**
	 * Increment or decrement the target head height associated with a shot size.
	 * @param shotSize Shot size to update
	 * @param increment If true, increase the head height, if false, decrease it by step
	 * @param step The amount to increase/decrease
	 */
	async updateTargetShotSizeConfig(shotSize: ShotSize, increment: boolean, step: number): Promise<void> {
		const response = await this.client.GET('/api/config/shotsize')
		if (response.data !== undefined) {
			let size = response.data[shotSize]
			if (increment) {
				size += step
			} else {
				size -= step
			}
			size = Math.max(0, Math.min(1, size))
			this.self.log('debug', 'Updating shot size ' + shotSize + ' to ' + size)

			await this.client.POST('/api/config/shotsize', {
				params: {
					query: {
						size: shotSize,
						diagonal: size,
					},
				},
			})
		}
	}

	async loadOverrideDominantSpeaker(): Promise<number | null> {
		const response = await this.client.GET('/api/autocut/overrideDominantSpeaker')
		return response.data?.id ?? null
	}

	async setOverrideDominantSpeaker(device: Device | undefined, override: boolean): Promise<void> {
		await this.client.POST('/api/autocut/overrideDominantSpeaker', {
			params: {
				query: {
					audioDeviceId: device?.id ?? -1,
					override: override,
				},
			},
		})
	}

	/**
	 * Adjust the crop frame to the target person once.
	 * @param device device to adjust framer for
	 */
	async adjustFramer(device: Device): Promise<void> {
		await this.client.POST('/api/devices/{id}/framer/adjust', {
			params: { path: { id: device.id ?? -1 } },
		})
	}

	/**
	 * Move the target point of the head tracking director by the given deltas.
	 * Requires a head tracking director component.
	 * @param device device to move target point for
	 * @param deltaX amount to move in x direction
	 * @param deltaY amount to move in y direction
	 */
	async moveTargetPoint(device: Device, deltaX: number, deltaY: number): Promise<void> {
		const settings = device.components?.headTrackingDirector
		if (settings === null || settings === undefined) {
			return
		}
		const x = Math.max(0, Math.min(1, (settings.target?.x ?? 0.5) + deltaX))
		const y = Math.max(0, Math.min(1, (settings.target?.y ?? 0.5) + deltaY))
		await this.client.PUT('/api/devices/{id}', {
			params: { path: { id: device.id ?? -1 } },
			body: {
				patch: {
					headTrackingDirector: {
						...settings,
						target: {
							x: x,
							y: y,
						},
					},
				},
			},
		})
	}

	/**
	 * Update the sensitivity of the head tracking director by the given delta.
	 * @param device  device to update sensitivity for
	 * @param deltaSensitivity amount to change sensitivity by
	 */
	async updateSensitivity(device: Device, deltaSensitivity: number): Promise<void> {
		const settings = device.components?.headTrackingDirector
		if (settings === null || settings === undefined) {
			return
		}
		const sensitivity = Math.max(0.2, Math.min(0.8, (settings.sensitivity ?? 0.5) + deltaSensitivity))
		await this.client.PUT('/api/devices/{id}', {
			params: { path: { id: device.id ?? -1 } },
			body: {
				patch: {
					headTrackingDirector: {
						...settings,
						sensitivity: sensitivity,
					},
				},
			},
		})
	}
}
