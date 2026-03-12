import { InstanceBase, InstanceStatus, runEntrypoint, SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateVariableDefinitions } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions } from './actions.js'
import { UpdateFeedbacks } from './feedbacks.js'
import Backend from './api/backend.js'
import { UpdatePresets } from './presets.js'
import setupEventHandler from './scripts/eventhandler.js'
import { updateAutoConfiguredButtons } from './scripts/autolearning.js'
import { Store } from './scripts/store.js'

export class MiruSuiteModuleInstance extends InstanceBase<ModuleConfig> {
	config!: ModuleConfig // Setup in init()

	backend: Backend | null = null
	store: Store = new Store(this)

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.log('debug', 'Initializing')
		this.config = config
		this.backend = new Backend(this)
		await this.backend.setup(config.host, config.port, config.username, config.password)
		this.updateVariableDefinitions() // export variable definitions
		try {
			await this.updateConfiguration()
			setupEventHandler(this, config.host, config.port)
		} catch (e) {
			this.log('error', 'Error updating configuration - ' + e)
		}
	}

	// When module gets deleted
	async destroy(): Promise<void> {
		this.log('debug', 'Destroying module')
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.log('debug', 'Config updated')
		if (config.host !== this.config.host || config.port !== this.config.port) {
			await this.init(config)
		}
	}

	async updateConfiguration(): Promise<void> {
		this.log('debug', 'Updating configuration with host ' + this.config.host + ' and port ' + this.config.port)
		let offlineMode = false
		try {
			if (this.backend === null) {
				this.log('error', 'Backend not initialized')
				return
			}
			await this.store.loadDevices()
			await this.store.loadFaces()
			await this.store.loadActivePresetMap()
			await this.store.loadPresets()
			await this.store.loadLiveInputs()
			await this.store.loadAutoCutEnabled()
			updateAutoConfiguredButtons(this)
			this.updateStatus(InstanceStatus.Ok)
		} catch (error) {
			this.log('error', 'Error fetching available fields - ' + error)
			offlineMode = true
			this.log('warn', 'Running in offline mode')
			this.updateStatus(InstanceStatus.ConnectionFailure)
		}
		this.setVariableValues({
			offlineMode: JSON.stringify(offlineMode),
			learningMode: 'disabled',
		})
		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updatePresets() // export presets
		this.checkFeedbacks(
			'autoPreset',
			'learnMode',
			'enabledComponentType',
			'directorStatus',
			'trackingMode',
			'shotSize',
			'liveDevice',
			'liveInput',
			'autoCut',
		)
	}

	// Return config fields for web config
	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	updateActions(): void {
		UpdateActions(this)
	}

	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}

	updatePresets(): void {
		UpdatePresets(this)
	}
}

runEntrypoint(MiruSuiteModuleInstance, UpgradeScripts)
