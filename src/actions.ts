import type { MiruSuiteModuleInstance } from './main.js'
import { GetAutoCutActions } from './actions/autocut.js'
import { GetCameraActions } from './actions/camera.js'
import { GetSwitcherActions } from './actions/switcher.js'
import { GetProjectActions } from './actions/projects.js'
import { GetGamepadActions } from './actions/gamepad.js'
import { GetOrchestraActions } from './actions/orchestra.js'

export function UpdateActions(self: MiruSuiteModuleInstance): void {
	self.setActionDefinitions({
		...GetCameraActions(self),
		...GetAutoCutActions(self),
		...GetSwitcherActions(self),
		...GetProjectActions(self),
		...GetGamepadActions(self),
		...GetOrchestraActions(self),
	})
}
