/* eslint n/no-unpublished-import: "off" */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { Store } from '../dist/scripts/store.js'

// Exercise the distributable bundle from an isolated directory with no asset files.
mkdirSync('.yarn', { recursive: true })
const directory = mkdtempSync(resolve('.yarn/package-smoke-'))
execFileSync('tar', ['-xf', resolve(process.argv[2] ?? 'autodirector-mirusuite-1.1.1.tgz'), '-C', directory])
const moduleDirectory = resolve(directory, 'autodirector-mirusuite')
assert.equal(existsSync(resolve(moduleDirectory, 'static/arrows/n.png')), false)
const { MiruSuiteModuleInstance, UpgradeScripts } = await import(
	pathToFileURL(resolve(moduleDirectory, 'main.js')).href
)
const self = {
	connectionState: 'Connected',
	manualMoveSpeed: 0.2,
	log() {},
	setActionDefinitions(value) {
		this.actions = value
	},
	setFeedbackDefinitions(value) {
		this.feedbacks = value
	},
	setVariableDefinitions(value) {
		this.variableDefinitions = value
	},
	setVariableValues(value) {
		this.values = { ...this.values, ...value }
	},
	setPresetDefinitions(structure, definitions) {
		this.structure = structure
		this.presets = definitions
	},
}
self.store = new Store(self)
self.store.devices = [
	{
		id: 7,
		name: 'Camera',
		components: { panasonicController: {}, headTrackingDirector: {} },
		feedback: {
			INPUT_NDI: { state: 'RUNNING' },
			DIRECTOR_HEAD_TRACKING: { state: 'RUNNING' },
			CONTROLLER_PANASONIC: { state: 'RUNNING' },
		},
	},
]
MiruSuiteModuleInstance.prototype.updateDefinitions.call(self)
assert.ok(Object.keys(self.presets).length > 20)
assert.ok(self.values.ptz_arrow_n.startsWith('data:image/png;base64,'))
assert.equal(self.presets['ptzMove-top-7'].variants[0].type, 'layered')
assert.equal(self.presets['ptzMove-top-7'].variants[0].elements[1].base64Image, self.values.ptz_arrow_n)
for (const preset of Object.values(self.presets)) {
	for (const variant of preset.variants ?? [preset]) {
		assert.ok(['simple', 'layered'].includes(variant.type))
		for (const step of variant.steps) {
			for (const action of [...step.down, ...step.up, ...(step.rotate_left ?? []), ...(step.rotate_right ?? [])]) {
				assert.ok(self.actions[action.actionId], `unregistered action ${action.actionId}`)
			}
		}
		for (const feedback of variant.feedbacks) assert.ok(self.feedbacks[feedback.feedbackId])
	}
}
assert.equal(UpgradeScripts.length, 2)
console.log(
	`Packaged bundle smoke test passed: ${Object.keys(self.presets).length} presets, embedded graphics, two upgrade steps`,
)
