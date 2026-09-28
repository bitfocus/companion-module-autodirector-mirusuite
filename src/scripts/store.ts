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
	private configurationLoaded = false

	constructor(self: MiruSuiteModuleInstance) {
		this.self = self
	}

	get backend(): Backend {
		if (this.self.backend) {
			return this.self.backend
		}
		throw new Error('Backend not initialized')
	}

	getDeviceById(id: number): Device | undefined {
		return this.devices.find((device) => device.id === id)
	}

	getDevices(): Device[] {
		return this.devices
	}

	get hasConfiguration(): boolean {
		return this.configurationLoaded
	}

	async loadConfiguration(): Promise<boolean> {
		const [devices, faces, activePresetMap, presets] = await Promise.all([
			this.backend.loadDevices(),
			this.backend.listFaces(),
			this.backend.loadActivePresetMap(),
			this.backend.listPresets(),
		])
		const [liveInputs, autoCutEnabled, dominantSpeakerOverride] = await Promise.allSettled([
			this.backend.getLiveInputs(),
			this.backend.isAutoCutRunning(),
			this.backend.loadOverrideDominantSpeaker(),
		])
		const optionalRefreshes = [
			['live inputs', liveInputs],
			['AutoCut state', autoCutEnabled],
			['dominant speaker override', dominantSpeakerOverride],
		] as const
		for (const [name, result] of optionalRefreshes) {
			if (result.status === 'rejected') {
				this.self.log('warn', `Could not refresh ${name}; keeping the last known value: ${String(result.reason)}`)
			}
		}
		const oldSignature = this.getDefinitionSignature(this.devices)
		const newSignature = this.getDefinitionSignature(devices)

		// Commit only after every endpoint succeeds so a disconnect cannot publish a partial catalog.
		this.devices = devices
		this.faces = faces
		this.activePresetMap = activePresetMap
		this.presets = presets
		if (liveInputs.status === 'fulfilled') this.liveInputs = liveInputs.value
		if (autoCutEnabled.status === 'fulfilled') this.autoCutEnabled = autoCutEnabled.value
		if (dominantSpeakerOverride.status === 'fulfilled') this.dominantSpeakerOverride = dominantSpeakerOverride.value
		this.configurationLoaded = true
		return oldSignature !== newSignature
	}

	getVideoDevices(): Device[] {
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

	getActivePresetForDevice(deviceId: number): ActivePreset | undefined {
		return this.activePresetMap[String(deviceId)]
	}

	async loadPresets(): Promise<void> {
		this.presets = await this.backend.listPresets()
	}

	getPresets(): PresetEntity[] {
		return this.presets
	}

	getPresetById(id: number): PresetEntity | undefined {
		return this.presets.find((preset) => preset.id === id)
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

	private getDefinitionSignature(devices: Device[]): string {
		return JSON.stringify(
			devices
				.map((device) => ({
					id: device.id,
					name: device.name,
					inputType: getInputComponentType(device),
					directorType: getDirectorType(device),
					switcherInput: device.switcherInput,
					hasController: Object.keys(device.components ?? {}).some((key) => key.toLowerCase().includes('controller')),
					hasVMixFramer: Boolean(device.components?.vMixFramer),
					hasAudioAutoCut: Boolean(device.components?.audioAutoCut),
				}))
				.sort((a, b) => (a.id ?? -1) - (b.id ?? -1)),
		)
	}
}
