import { MiruSuiteModuleInstance } from '../main.js'
import type {
	ActivePreset,
	Device,
	DeviceSummary,
	FaceIdEntity,
	GamepadSelectedDevice,
	MusicFollowerState,
	MusicPiece,
	OrchestraSettings,
	PresetEntity,
	ProjectSummary,
	Setlist,
	State,
	SwitcherState,
} from '../api/types.js'
import { getDirectorType, getInputComponentType } from './helpers.js'
import Backend from '../api/backend.js'

export class Store {
	private self: MiruSuiteModuleInstance
	private devices: Device[] = []
	private activePresetMap: { [name: string]: ActivePreset } = {}
	private presets: PresetEntity[] = []
	private switcherState: SwitcherState = {}
	private faces: FaceIdEntity[] = []
	private autoCutEnabled = false
	private dominantSpeakerOverride: number | null = null
	private dominantSpeaker: DeviceSummary | null = null
	private projects: ProjectSummary[] = []
	private activeProject: ProjectSummary | null = null
	private gamepadDeviceId: number | null = null
	private orchestraSettings: OrchestraSettings = {}
	private musicPieces: MusicPiece[] = []
	private setlists: Setlist[] = []
	private musicFollowerStates = new Map<number, MusicFollowerState>()
	private liveStates = new Map<string, State>()
	private autoCutStateReceivedAt: number | null = null
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

	async loadDevices(): Promise<void> {
		this.devices = await this.backend.loadDevices()
		this.pruneLiveStates(this.devices)
	}

	get hasConfiguration(): boolean {
		return this.configurationLoaded
	}

	async loadConfiguration(): Promise<boolean> {
		const loadSwitcherState = async () =>
			typeof this.backend.getSwitcherState === 'function'
				? this.backend.getSwitcherState()
				: this.backend.getLiveInputs().then((programs) => ({ programs }))
		let [devices, faces, activePresetMap, presets] = await Promise.all([
			this.backend.loadDevices(),
			this.backend.listFaces(),
			this.backend.loadActivePresetMap(),
			this.backend.listPresets(),
		])
		const [
			switcherState,
			autoCutEnabled,
			dominantSpeakerOverride,
			dominantSpeaker,
			projects,
			activeProject,
			gamepadDevice,
			orchestraSettings,
			initialMusicPieces,
			initialSetlists,
			...initialMusicFollowerStates
		] = await Promise.allSettled([
			loadSwitcherState(),
			this.backend.isAutoCutRunning(),
			this.backend.loadOverrideDominantSpeaker(),
			this.backend.loadDominantSpeaker(),
			this.backend.loadProjects(),
			this.backend.loadActiveProject(),
			this.backend.loadGamepadSelectedDevice(),
			this.backend.loadOrchestraSettings(),
			this.backend.loadMusicPieces(),
			this.backend.loadSetlists(),
			...devices
				.filter((device) => device.id !== undefined && device.components?.musicFollower != null)
				.map(async (device) => this.backend.loadMusicFollowerState(device.id!)),
		])
		let musicPieces = initialMusicPieces
		let setlists = initialSetlists
		let musicFollowerStates = initialMusicFollowerStates
		const optionalRefreshes = [
			['switcher state', switcherState],
			['AutoCut state', autoCutEnabled],
			['dominant speaker override', dominantSpeakerOverride],
			['dominant speaker', dominantSpeaker],
			['projects', projects],
			['active project', activeProject],
			['gamepad selection', gamepadDevice],
			['Orchestra settings', orchestraSettings],
			['music pieces', musicPieces],
			['setlists', setlists],
		] as const
		for (const [name, result] of optionalRefreshes) {
			if (result.status === 'rejected') {
				this.self.log('warn', `Could not refresh ${name}; keeping the last known value: ${String(result.reason)}`)
			}
		}
		const oldSignature = this.getDefinitionSignature(this.devices)
		const newSignature = this.getDefinitionSignature(devices)
		const oldProjectId = this.activeProject?.id
		const newProjectId = activeProject.status === 'fulfilled' ? activeProject.value?.id : oldProjectId
		const projectChanged =
			this.configurationLoaded && activeProject.status === 'fulfilled' && oldProjectId !== newProjectId
		if (projectChanged) {
			// The initial catalog fetch can race the active-project change. Refresh every project-scoped catalog
			// after the new active ID is known, then commit them together below.
			try {
				const refreshedCatalogs = await Promise.all([
					this.backend.loadDevices(),
					this.backend.listFaces(),
					this.backend.loadActivePresetMap(),
					this.backend.listPresets(),
				])
				devices = refreshedCatalogs[0]
				faces = refreshedCatalogs[1]
				activePresetMap = refreshedCatalogs[2]
				presets = refreshedCatalogs[3]
				const refreshedMusicCatalogs = await Promise.all([
					this.backend.loadMusicPieces().then((value) => ({ status: 'fulfilled', value }) as const),
					this.backend.loadSetlists().then((value) => ({ status: 'fulfilled', value }) as const),
				])
				musicPieces = refreshedMusicCatalogs[0]
				setlists = refreshedMusicCatalogs[1]
				musicFollowerStates = await Promise.allSettled(
					devices
						.filter((device) => device.id !== undefined && device.components?.musicFollower != null)
						.map(async (device) => this.backend.loadMusicFollowerState(device.id!)),
				)
			} catch (error) {
				this.self.log('warn', `Could not refresh catalogs for the newly active project: ${String(error)}`)
				throw error
			}
		}
		if (projectChanged) {
			this.clearLiveState()
			this.musicFollowerStates.clear()
		}

		// Commit only after every endpoint succeeds so a disconnect cannot publish a partial catalog.
		this.devices = devices
		this.pruneLiveStates(devices)
		this.faces = faces
		this.activePresetMap = activePresetMap
		this.presets = presets
		if (switcherState.status === 'fulfilled') this.switcherState = switcherState.value
		if (autoCutEnabled.status === 'fulfilled') this.autoCutEnabled = autoCutEnabled.value
		if (dominantSpeakerOverride.status === 'fulfilled') this.dominantSpeakerOverride = dominantSpeakerOverride.value
		if (dominantSpeaker.status === 'fulfilled') this.dominantSpeaker = dominantSpeaker.value
		if (projects.status === 'fulfilled') this.projects = projects.value
		if (activeProject.status === 'fulfilled') this.activeProject = activeProject.value
		if (gamepadDevice.status === 'fulfilled') this.gamepadDeviceId = gamepadDevice.value.deviceId ?? null
		if (orchestraSettings.status === 'fulfilled') this.orchestraSettings = orchestraSettings.value
		if (musicPieces.status === 'fulfilled') this.musicPieces = musicPieces.value
		if (setlists.status === 'fulfilled') this.setlists = setlists.value
		const musicDeviceIds = devices
			.filter((device) => device.id !== undefined && device.components?.musicFollower != null)
			.map((device) => device.id!)
		const musicDeviceIdSet = new Set(musicDeviceIds)
		for (const deviceId of this.musicFollowerStates.keys()) {
			if (!musicDeviceIdSet.has(deviceId)) this.musicFollowerStates.delete(deviceId)
		}
		for (const deviceId of musicDeviceIds) {
			const stateResult = musicFollowerStates.shift()
			if (
				stateResult?.status === 'fulfilled' &&
				(!projectChanged || (newProjectId !== undefined && stateResult.value.projectId === newProjectId))
			) {
				this.musicFollowerStates.set(deviceId, stateResult.value)
			}
		}
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

	async loadLiveInputs(): Promise<boolean> {
		const previousInputs = JSON.stringify(this.getSwitcherInputs())
		this.switcherState =
			typeof this.backend.getSwitcherState === 'function'
				? await this.backend.getSwitcherState()
				: { programs: await this.backend.getLiveInputs() }
		return previousInputs !== JSON.stringify(this.getSwitcherInputs())
	}

	getLiveInputs(): string[] {
		return this.switcherState.programs ?? []
	}

	getPreviewInputs(): string[] {
		return this.switcherState.preview ?? []
	}

	getSwitcherInputs(): NonNullable<SwitcherState['availableInputs']> {
		return this.switcherState.availableInputs ?? []
	}

	getSwitcherState(): SwitcherState {
		return this.switcherState
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

	async loadDominantSpeaker(): Promise<void> {
		this.dominantSpeaker = await this.backend.loadDominantSpeaker()
	}

	getDominantSpeaker(): DeviceSummary | null {
		return this.dominantSpeaker
	}

	getProjects(): ProjectSummary[] {
		return this.projects
	}

	getActiveProject(): ProjectSummary | null {
		return this.activeProject
	}

	getGamepadDeviceId(): number | null {
		return this.gamepadDeviceId
	}

	async loadGamepadSelectedDevice(): Promise<void> {
		const selected: GamepadSelectedDevice = await this.backend.loadGamepadSelectedDevice()
		this.gamepadDeviceId = selected.deviceId ?? null
	}

	getOrchestraSettings(): OrchestraSettings {
		return this.orchestraSettings
	}

	setOrchestraSettings(settings: OrchestraSettings): void {
		this.orchestraSettings = settings
	}

	getMusicPieces(): MusicPiece[] {
		return this.musicPieces
	}

	getSetlists(): Setlist[] {
		return this.setlists
	}

	getMusicFollowerState(deviceId: number): MusicFollowerState | undefined {
		return this.musicFollowerStates.get(deviceId)
	}

	setMusicFollowerState(state: MusicFollowerState): void {
		if (state.deviceId !== undefined) this.musicFollowerStates.set(state.deviceId, state)
	}

	applyLiveState(state: State, receivedAt = Date.now()): void {
		const deviceId = 'deviceId' in state ? state.deviceId : undefined
		this.liveStates.set(`${state.target}:${deviceId ?? 'global'}`, state)
		if (state.target === 'autoCutState') this.autoCutStateReceivedAt = receivedAt
		if (state.target === 'musicFollower') this.setMusicFollowerState(state)
	}

	getLiveState(target: State['target'], deviceId?: number): State | undefined {
		return this.liveStates.get(`${target}:${deviceId ?? 'global'}`)
	}

	getAutoCutRemainingTime(now = Date.now()): number {
		const state = this.getLiveState('autoCutState')
		if (state?.target !== 'autoCutState' || state.remainingTime === undefined) return -1
		if (state.scheduledTime === undefined || state.scheduledTime <= 0 || state.remainingTime < 0) {
			return state.remainingTime
		}
		const remaining = Math.max(0, Math.min(state.remainingTime, state.scheduledTime))
		const elapsedSeconds = this.autoCutStateReceivedAt === null ? 0 : (now - this.autoCutStateReceivedAt) / 1000
		return Math.max(0, remaining - Math.max(0, elapsedSeconds))
	}

	hasAutoCutCountdown(): boolean {
		const state = this.getLiveState('autoCutState')
		return (
			state?.target === 'autoCutState' &&
			state.scheduledTime !== undefined &&
			state.scheduledTime > 0 &&
			state.remainingTime !== undefined &&
			state.remainingTime >= 0 &&
			this.getAutoCutRemainingTime() > 0
		)
	}

	clearLiveState(): void {
		this.liveStates.clear()
		this.musicFollowerStates.clear()
		this.autoCutStateReceivedAt = null
		this.switcherState = { connectionStatus: 'DISCONNECTED', programs: [], preview: [], availableInputs: [] }
		this.autoCutEnabled = false
		this.dominantSpeaker = null
		this.dominantSpeakerOverride = null
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

	private pruneLiveStates(devices: Device[]): void {
		const deviceIds = new Set(devices.flatMap((device) => (device.id === undefined ? [] : [String(device.id)])))
		for (const key of this.liveStates.keys()) {
			const deviceId = key.slice(key.lastIndexOf(':') + 1)
			if (deviceId !== 'global' && !deviceIds.has(deviceId)) this.liveStates.delete(key)
		}
	}
}
