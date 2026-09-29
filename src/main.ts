import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import Backend from './api/backend.js'
import { UpdateActions } from './actions.js'
import { GetConfigFields, type ModuleConfig, type ModuleSecrets } from './config.js'
import { UpdateFeedbacks } from './feedbacks.js'
import type { MiruSuiteInstanceTypes } from './instance-types.js'
import { UpdatePresets } from './presets.js'
import { EventHandler } from './scripts/eventhandler.js'
import { Store } from './scripts/store.js'
import { UpdateVariableDefinitions, UpdateVariableValues } from './variables.js'

export class MiruSuiteModuleInstance extends InstanceBase<MiruSuiteInstanceTypes> {
	config!: ModuleConfig
	secrets!: ModuleSecrets
	backend: Backend | null = null
	store: Store = new Store(this)
	connectionState = 'Connecting'
	manualMoveSpeed = 0.2
	ptzArrowImagesInitialized = false
	private eventHandler: EventHandler | null = null
	private autoCutVariableTimer: ReturnType<typeof setInterval> | null = null

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig, _isFirstInit: boolean, secrets: ModuleSecrets = {}): Promise<void> {
		this.config = config
		this.secrets = secrets
		await this.connect()
	}

	async destroy(): Promise<void> {
		this.eventHandler?.close()
		this.eventHandler = null
		if (this.autoCutVariableTimer !== null) clearInterval(this.autoCutVariableTimer)
		this.autoCutVariableTimer = null
		this.backend = null
	}

	async configUpdated(config: ModuleConfig, secrets: ModuleSecrets = {}): Promise<void> {
		this.config = config
		this.secrets = secrets
		await this.connect()
	}

	private async connect(): Promise<void> {
		this.eventHandler?.close()
		this.eventHandler = null
		this.backend = new Backend(this)
		this.connectionState = 'Connecting'
		await this.backend.setup(this.config.host, this.config.port, this.config.username, this.secrets.password ?? '')

		try {
			await this.updateConfiguration()
		} catch (error) {
			this.log('error', `Error loading MiruSuite configuration: ${String(error)}`)
			this.connectionState = 'Disconnected'
			this.updateStatus(InstanceStatus.ConnectionFailure)
			if (this.store.hasConfiguration) this.updateVariableValues()
		}

		this.eventHandler = new EventHandler(
			this,
			this.config.host,
			this.config.port,
			this.config.username,
			this.secrets.password ?? '',
		)
		this.eventHandler.connect()
	}

	async updateConfiguration(): Promise<void> {
		if (!this.backend) throw new Error('Backend not initialized')
		try {
			await this.store.loadConfiguration()
		} catch (error) {
			this.connectionState = 'Disconnected'
			this.updateStatus(InstanceStatus.ConnectionFailure)
			if (this.store.hasConfiguration) this.updateVariableValues()
			throw error
		}
		this.connectionState = 'Connected'
		this.updateStatus(InstanceStatus.Ok)
		this.updateDefinitions()
		this.updateVariableValues()
		this.checkFeedbacks(
			'enabledComponentType',
			'directorStatus',
			'trackingMode',
			'shotSize',
			'activePreset',
			'liveDevice',
			'liveInput',
			'switcherBusInput',
			'autoCut',
			'autoCutState',
			'dominantSpeakerOverride',
			'dominantSpeaker',
			'activeProject',
			'gamepadSelectedDevice',
			'controllerConnected',
			'framingStable',
			'musicFollower',
			'orchestraSetting',
			'vMixFramerEnabled',
		)
	}

	updateDefinitions(): void {
		UpdateActions(this)
		UpdateFeedbacks(this)
		UpdateVariableDefinitions(this)
		UpdatePresets(this)
	}

	updateVariableValues(): void {
		UpdateVariableValues(this)
		this.syncAutoCutVariableTimer()
	}

	private syncAutoCutVariableTimer(): void {
		if (this.store.hasAutoCutCountdown()) {
			if (this.autoCutVariableTimer === null) {
				this.autoCutVariableTimer = setInterval(() => {
					if (!this.store.hasAutoCutCountdown()) {
						if (this.autoCutVariableTimer !== null) clearInterval(this.autoCutVariableTimer)
						this.autoCutVariableTimer = null
						this.updateVariableValues()
						return
					}
					UpdateVariableValues(this)
				}, 1000)
			}
		} else if (this.autoCutVariableTimer !== null) {
			clearInterval(this.autoCutVariableTimer)
			this.autoCutVariableTimer = null
		}
	}

	adjustManualMoveSpeed(delta: number): void {
		const nextSpeed = this.manualMoveSpeed + delta
		this.manualMoveSpeed = Math.round(Math.min(1, Math.max(0.01, nextSpeed)) * 100) / 100
		this.updateVariableValues()
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}
}

export default MiruSuiteModuleInstance
export { UpgradeScripts } from './upgrades.js'
