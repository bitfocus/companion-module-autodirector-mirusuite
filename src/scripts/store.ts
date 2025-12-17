import { MiruSuiteModuleInstance } from '../main.js'
import type { ActivePreset, Device, FaceIdEntity, PresetEntity } from '../api/types.js'
import { getDirectorType, getInputComponentType } from './helpers.js'
import Backend from '../api/backend.js'

export class Store {
	private self: MiruSuiteModuleInstance
	private devices: Device[] = []
	private activePresetMap: { [name: string]: ActivePreset } = {}
	private presets: PresetEntity[] = []
	private liveInputs: string[] = []
	private faces: FaceIdEntity[] = []
	private autoCutEnabled = false
	private dominantSpeakerOverride: number | null = null

	constructor(self: MiruSuiteModuleInstance) {
		this.self = self
	}

	get backend(): Backend {
		if (this.self.backend) {
			return this.self.backend
		}
		throw new Error('Backend not initialized')
	}

	async loadDevices(): Promise<boolean> {
		const data = await this.backend.loadDevices()
		const newVideoDevices = this._getVideoDevicesFromData(data)
			.map((device) => device.id + 'type: ' + getInputComponentType(device) + 'director: ' + getDirectorType(device))
			.sort()
		const oldVideoDevices = this.getVideoDevices()
			.map(
				(device) => device.id + 'components: ' + getInputComponentType(device) + 'director: ' + getDirectorType(device),
			)
			.sort()
		this.self.log('debug', 'New video devices: ' + JSON.stringify(newVideoDevices))
		this.self.log('debug', 'Old video devices: ' + JSON.stringify(oldVideoDevices))
		const videoDevicesChanged = JSON.stringify(newVideoDevices) !== JSON.stringify(oldVideoDevices)
		this.devices = data ?? []
		return videoDevicesChanged
	}

	getDeviceById(id: number): Device | undefined {
		return this.devices.find((device) => device.id === id)
	}

	getVideoDevices(): Device[] {
		return this.devices.filter((device) => getInputComponentType(device) === 'VIDEO')
	}

	_getVideoDevicesFromData(_data: Device[] | undefined): Device[] {
		return this.devices.filter((device) => getInputComponentType(device) === 'VIDEO')
	}

	getAudioDevices(): Device[] {
		return this.devices.filter((device) => getInputComponentType(device) === 'AUDIO')
	}

	getVMixFramerDevices(): Device[] {
		return this.devices.filter((device) => !!device.components?.vMixFramer)
	}

	async loadActivePresetMap(): Promise<void> {
		this.activePresetMap = await this.backend.loadActivePresetMap()
	}

	getActivePresetMap(): { [name: string]: ActivePreset } {
		return this.activePresetMap
	}

	async loadPresets(): Promise<void> {
		this.presets = await this.backend.listPresets()
	}

	getPresets(): PresetEntity[] {
		return this.presets
	}

	async loadLiveInputs(): Promise<void> {
		this.liveInputs = await this.backend.getLiveInputs()
	}

	getLiveInputs(): string[] {
		return this.liveInputs
	}

	async loadFaces(): Promise<void> {
		this.faces = await this.backend.listFaces()
	}

	getFaces(): FaceIdEntity[] {
		return this.faces
	}

	async loadAutoCutEnabled(): Promise<void> {
		this.autoCutEnabled = await this.backend.isAutoCutRunning()
	}

	isAutoCutRunning(): boolean {
		return this.autoCutEnabled
	}

	async loadOverrideDominantSpeaker(): Promise<void> {
		this.dominantSpeakerOverride = await this.backend.loadOverrideDominantSpeaker()
	}

	getDominantSpeakerOverride(): number | null {
		return this.dominantSpeakerOverride
	}
}
