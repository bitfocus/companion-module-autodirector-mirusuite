import { InstanceStatus } from '@companion-module/base'
import EventSource from 'eventsource'
import type { GUIUpdate } from '../api/types.js'
import type MiruSuiteModuleInstance from '../main.js'

export class EventHandler {
	private source: EventSource | null = null

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
		const url = `http://${normalizedHost}:${this.port}/api/stream/gui`
		const headers: Record<string, string> = {}
		if (this.username && this.password) {
			headers.Authorization = `Basic ${Buffer.from(`${this.username}:${this.password}`).toString('base64')}`
		}

		this.self.log('debug', `Connecting MiruSuite event stream at ${url}`)
		const source = new EventSource(url, { headers })
		this.source = source
		source.onmessage = (event: { data: string }) => {
			void this.handleMessage(event.data)
		}
		source.onerror = () => {
			this.self.connectionState = 'Disconnected'
			this.self.updateStatus(InstanceStatus.ConnectionFailure, 'MiruSuite event stream disconnected')
			this.self.updateVariableValues()
		}
	}

	close(): void {
		this.source?.close()
		this.source = null
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
					await this.self.store.loadLiveInputs()
					this.self.updateVariableValues()
					this.self.checkFeedbacks('liveDevice', 'liveInput')
					break
				case 'AUTO_CUT_UPDATED':
					await this.self.store.loadAutoCutEnabled()
					this.self.updateVariableValues()
					this.self.checkFeedbacks('autoCut')
					break
				case 'AUTO_CUT_SPEAKER_OVERRIDE_UPDATED':
					await this.self.store.loadOverrideDominantSpeaker()
					this.self.updateVariableValues()
					this.self.checkFeedbacks('dominantSpeakerOverride')
					break
			}
			this.self.connectionState = 'Connected'
			this.self.updateStatus(InstanceStatus.Ok)
			this.self.updateVariableValues()
		} catch (error) {
			this.self.log('error', `Error handling MiruSuite event: ${String(error)}`)
		}
	}
}
