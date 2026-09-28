import { action, button, type LegacyPresets } from './helpers.js'

export function getSwitcherPresets(): LegacyPresets {
	return {
		cutSwitcher: button('Switcher', 'CUT', [action('cutSwitcher', {})]),
		triggerTransition: button('Switcher', 'Transition', [action('triggerTransition', {})]),
	}
}
