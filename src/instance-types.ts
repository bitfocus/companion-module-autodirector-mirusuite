import type { InstanceTypes } from '@companion-module/base'
import type { ModuleConfig, ModuleSecrets } from './config.js'

export interface MiruSuiteInstanceTypes extends InstanceTypes {
	config: ModuleConfig
	secrets: ModuleSecrets
}
