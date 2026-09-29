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
		const legacyConfig = props.config as (ModuleConfig & { password?: string }) | null
		const hasLegacyPassword = legacyConfig !== null && Object.prototype.hasOwnProperty.call(legacyConfig, 'password')
		const updatedConfig: ModuleConfig | null = hasLegacyPassword
			? {
					host: legacyConfig?.host ?? '127.0.0.1',
					port: legacyConfig?.port ?? 8080,
					username: legacyConfig?.username ?? '',
				}
			: null
		const updatedSecrets: ModuleSecrets | null = hasLegacyPassword
			? { ...(props.secrets ?? {}), password: legacyConfig?.password ?? '' }
			: null

		return {
			updatedConfig,
			updatedSecrets,
			updatedActions: [],
			updatedFeedbacks,
		}
	},
]
