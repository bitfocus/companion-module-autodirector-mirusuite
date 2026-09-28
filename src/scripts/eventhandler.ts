import { InstanceStatus } from '@companion-module/base'
import EventSource from 'eventsource'
import type { GUIUpdate, State } from '../api/types.js'
import type MiruSuiteModuleInstance from '../main.js'

export class EventHandler {
	private guiSource: EventSource | null = null
	private stateSource: EventSource | null = null
	private stateStreamOpened = false

	constructor(
		private readonly self: MiruSuiteModuleInstance,
		private readonly host: string,
		private readonly port: number,
		private readonly username: string,
		private readonly password: string,
	) {}

	connect(): void {
		this.close()
		const normalizedHost = this.host.trim() === 'localhost' ? '127.0.0.1' : this.host.trim()
		const baseUrl = `http://${normalizedHost}:${this.port}`
		const headers: Record<string, string> = {}
		if (this.username && this.password) {
			headers.Authorization = `Basic ${Buffer.from(`${this.username}:${this.password}`).toString('base64')}`
		}

		this.self.log('debug', `Connecting MiruSuite GUI event stream at ${baseUrl}/api/stream/gui`)
		const source = new EventSource(`${baseUrl}/api/stream/gui`, { headers })
		this.guiSource = source
		source.onmessage = (event: { data: string }) => {
			void this.handleMessage(event.data)
		}
		source.onerror = () => {
			this.self.connectionState = 'Disconnected'
			this.self.updateStatus(InstanceStatus.ConnectionFailure, 'MiruSuite event stream disconnected')
			this.self.store.clearLiveState()
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
		source.onopen = () => {
			if (this.self.connectionState !== 'Connected') {
				this.self.connectionState = 'Connected'
				this.self.updateStatus(InstanceStatus.Ok)
				void this.self.updateConfiguration()
			}
		}

		this.self.log('debug', `Connecting MiruSuite live state stream at ${baseUrl}/api/state`)
		const stateSource = new EventSource(`${baseUrl}/api/state`, { headers })
		this.stateSource = stateSource
		stateSource.onopen = () => this.handleStateStreamOpen()
		stateSource.onmessage = (event: { data: string }) => {
			void this.handleStateMessage(event.data)
		}
		stateSource.onerror = () => {
			this.self.store.clearLiveState()
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
			this.self.log('warn', 'MiruSuite live state stream disconnected; waiting for automatic reconnect')
		}
	}

	close(): void {
		this.guiSource?.close()
		this.guiSource = null
		this.stateSource?.close()
		this.stateSource = null
		this.stateStreamOpened = false
	}

	private async handleMessage(rawData: string): Promise<void> {
		try {
			const data = JSON.parse(rawData) as GUIUpdate
			switch (data.type) {
				case 'DEVICES_UPDATED':
				case 'PERSONS_UPDATED':
				case 'PROJECT_UPDATED':
					await this.self.updateConfiguration()
					break
				case 'COMPONENTS_UPDATED': {
					await this.self.updateConfiguration()
					break
				}
				case 'ACTIVE_PRESET_UPDATED':
					await this.self.store.loadActivePresetMap()
					this.self.updateVariableValues()
					this.self.checkFeedbacks('activePreset')
					break
				case 'SWITCHER_STATE_UPDATED':
					if (await this.self.store.loadLiveInputs()) this.self.updateDefinitions()
					this.self.updateVariableValues()
					this.self.checkFeedbacks('liveDevice', 'liveInput', 'switcherBusInput')
					break
				case 'AUTO_CUT_UPDATED':
					await this.self.store.loadDevices()
					await this.self.store.loadAutoCutEnabled()
					await this.self.store.loadDominantSpeaker()
					this.self.updateVariableValues()
					this.self.checkFeedbacks('autoCut', 'dominantSpeaker', 'enabledComponentType')
					break
				case 'AUTO_CUT_SPEAKER_OVERRIDE_UPDATED':
					await this.self.store.loadOverrideDominantSpeaker()
					this.self.updateVariableValues()
					this.self.checkFeedbacks('dominantSpeakerOverride')
					break
				case 'GAMEPAD_SELECTED_DEVICE_UPDATED':
					await this.self.store.loadGamepadSelectedDevice()
					this.self.updateVariableValues()
					this.self.checkFeedbacks('gamepadSelectedDevice')
					break
				case 'ORCHESTRA_SETTINGS_UPDATED':
					this.self.store.setOrchestraSettings(await this.self.backend!.loadOrchestraSettings())
					this.self.updateVariableValues()
					this.self.checkFeedbacks('orchestraSetting', 'orchestraDeviceEnabled')
					break
			}
			this.self.connectionState = 'Connected'
			this.self.updateStatus(InstanceStatus.Ok)
			this.self.updateVariableValues()
		} catch (error) {
			this.self.log('error', `Error handling MiruSuite event: ${String(error)}`)
		}
	}

	private async handleStateMessage(rawData: string): Promise<void> {
		try {
			const parsed = JSON.parse(rawData) as State | State[]
			const states = Array.isArray(parsed) ? parsed : [parsed]
			let refreshDominantSpeaker = false
			for (const state of states) {
				if (!state || typeof state !== 'object' || !('target' in state)) continue
				this.self.store.applyLiveState(state)
				if (state.target === 'autoCutEvent' && state.type === 'AUDIO_CHANGED') refreshDominantSpeaker = true
			}
			if (refreshDominantSpeaker) await this.self.store.loadDominantSpeaker()
			this.self.updateVariableValues()
			this.self.checkFeedbacks(
				'controllerConnected',
				'framingStable',
				'autoCutState',
				'musicFollower',
				'dominantSpeaker',
			)
		} catch (error) {
			this.self.log('error', `Error handling MiruSuite live state: ${String(error)}`)
		}
	}

	private handleStateStreamOpen(): void {
		if (this.stateStreamOpened) {
			void this.self.updateConfiguration().catch((error) => {
				this.self.log('warn', `Could not refresh state after reconnect: ${String(error)}`)
			})
		}
		this.stateStreamOpened = true
	}
}
