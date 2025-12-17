/* eslint-disable n/no-unsupported-features/node-builtins */
import Jimp from 'jimp'
import { InstanceStatus } from '@companion-module/base'
import { MiruSuiteModuleInstance } from '../main.js'
import { getComponentOfType } from '../scripts/helpers.js'
import createClient, { type Client } from 'openapi-fetch'
import { paths } from './openapi.js'
import type { ActivePreset, Device, FaceIdEntity, PresetEntity, ShotSize, TrackingMode } from './types.js'

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
				const response = await fetch(input, init)
				if (!response.ok) {
					this.self.updateStatus(InstanceStatus.ConnectionFailure)
					this.self.log('error', 'Backend returned code ' + response.status + ' - ' + response.statusText)
				}
				this.self.updateStatus(InstanceStatus.Ok)
				return response
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

	/**
	 * Enables, disables or toggles the director component of a device.
	 * @param device device to update
	 * @param enabled true = enable, false = disable, undefined = toggle
	 * @returns after completion
	 */
	async toggleDirector(device: Device | undefined, enabled?: boolean): Promise<void> {
		if (device === undefined) {
			return
		}
		const directorId = getComponentOfType(device, 'DIRECTOR')
		if (!directorId) {
			return
		}
		enabled ??= device.feedback[(directorId ?? '') as string]?.state !== 'RUNNING'
		await this.client.POST(enabled ? '/api/devices/{id}/{component}/enable' : '/api/devices/{id}/{component}/disable', {
			params: { path: { id: device.id ?? -1, component: directorId } },
		})
	}

	async setShotSize(device: Device | undefined, shotSize: ShotSize): Promise<void> {
		if (device === undefined) {
			return
		}
		const settings = device.components?.headTrackingDirector
		if (settings !== null && settings !== undefined) {
			settings.targetShotSize = shotSize
			await this.client.PUT('/api/devices/{id}', {
				params: { path: { id: device.id ?? -1 } },
				body: {
					patch: {
						headTrackingDirector: settings,
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
		const { personTracker } = device.components
		if (personTracker !== undefined && personTracker !== null) {
			personTracker.trackingMode = mode
			personTracker.targetFaceId = targetFaceId
			await this.client.PUT('/api/devices/{id}', {
				params: { path: { id: device.id ?? -1 } },
				body: { patch: { personTracker } },
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

	async getLiveInputs(): Promise<string[]> {
		const response = await this.client.GET('/api/switcher')
		if (response.data?.connectionStatus !== 'CONNECTED') {
			this.self.log('warn', 'Switcher not connected')
			return []
		}
		return response.data.programs ?? []
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
