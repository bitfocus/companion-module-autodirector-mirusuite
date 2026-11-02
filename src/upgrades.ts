import type {
	CompanionStaticUpgradeProps,
	CompanionStaticUpgradeResult,
	CompanionStaticUpgradeScript,
	CompanionUpgradeContext,
} from '@companion-module/base'
import type { ModuleConfig, ModuleSecrets } from './config.js'

export const UpgradeScripts: CompanionStaticUpgradeScript<ModuleConfig, ModuleSecrets>[] = [
	(
		_: CompanionUpgradeContext<ModuleConfig>,
		props: CompanionStaticUpgradeProps<ModuleConfig, ModuleSecrets>,
	): CompanionStaticUpgradeResult<ModuleConfig, ModuleSecrets> => {
		const updatedFeedbacks = props.feedbacks
			.filter((feedback) => feedback.feedbackId === 'enabledDirector')
			.map((feedback) => ({
				...feedback,
				feedbackId: 'enabledComponentType',
				options: {
					...feedback.options,
					componentType: feedback.options.componentType ?? { isExpression: false, value: 'DIRECTOR' },
				},
			}))
		return {
			updatedConfig: null,
			updatedActions: [],
			updatedFeedbacks,
		}
	},
	(
		_: CompanionUpgradeContext<ModuleConfig>,
		props: CompanionStaticUpgradeProps<ModuleConfig, ModuleSecrets>,
	): CompanionStaticUpgradeResult<ModuleConfig, ModuleSecrets> => {
		const legacyConfig = props.config
		const hasLegacyPassword = legacyConfig !== null && Object.prototype.hasOwnProperty.call(legacyConfig, 'password')
		const updatedConfig: ModuleConfig | null = hasLegacyPassword
			? {
					host: legacyConfig?.host ?? '127.0.0.1',
					port: legacyConfig?.port ?? 8080,
					username: legacyConfig?.username ?? '',
				}
			: null
		const password =
			legacyConfig && 'password' in legacyConfig && typeof legacyConfig.password === 'string'
				? legacyConfig.password
				: ''
		const updatedSecrets: ModuleSecrets | null = hasLegacyPassword
			? { ...(props.secrets ?? {}), password: props.secrets?.password ?? password }
			: null

		return {
			updatedConfig,
			updatedSecrets,
			updatedActions: [],
			updatedFeedbacks: [],
		}
	},
]
