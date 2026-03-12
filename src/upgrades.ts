import type {
	CompanionStaticUpgradeProps,
	CompanionStaticUpgradeResult,
	CompanionStaticUpgradeScript,
	CompanionUpgradeContext,
} from '@companion-module/base'
import type { ModuleConfig } from './config.js'

export const UpgradeScripts: CompanionStaticUpgradeScript<ModuleConfig>[] = [
	(
		_: CompanionUpgradeContext<ModuleConfig>,
		props: CompanionStaticUpgradeProps<ModuleConfig>,
	): CompanionStaticUpgradeResult<ModuleConfig> => {
		const updatedFeedbacks = props.feedbacks
			.filter((feedback) => feedback.feedbackId === 'enabledDirector')
			.map((feedback) => ({
				...feedback,
				feedbackId: 'enabledComponentType',
				options: {
					...feedback.options,
					componentType: feedback.options.componentType ?? 'DIRECTOR',
				},
			}))

		return {
			updatedConfig: null,
			updatedActions: [],
			updatedFeedbacks,
		}
	},
]
