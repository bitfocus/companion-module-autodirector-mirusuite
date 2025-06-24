import Conf from 'conf'
import { MiruSuiteModuleInstance } from '../main.js'
import { PresetEntity } from '../api/types.js'
import { getGroupForInstrument, presetSortFn } from './metadata.js'

const config = new Conf({ projectName: 'companion-MiruSuite' })

export interface AutoConfiguredButton {
	id: string
}

export interface AutoConfiguredBank {
	buttons: AutoConfiguredButton[]
	devices: number[]
	instrumentGroups: string[]
	displayDeviceName: boolean
}

export interface AutoConfiguredBankMap {
	[key: string]: AutoConfiguredBank
}

/**
 * Save the selected devices for a bank
 * @param self
 * @param bank controlId of learn button. All settings and buttons get attached to that string
 * @param devices device ids
 */
export function setSelectedDevices(self: MiruSuiteModuleInstance, bank: string, devices: number[]): void {
	const autoMap: AutoConfiguredBankMap = config.get('autoConfiguredMap', {}) as AutoConfiguredBankMap
	autoMap[bank] = {
		buttons: autoMap[bank].buttons,
		devices: devices,
		instrumentGroups: autoMap[bank].instrumentGroups,
		displayDeviceName: autoMap[bank].displayDeviceName,
	}
	saveAutoConfiguredButtons(self, autoMap)
}

/**
 * Save the selected instruments
 * @param self
 * @param bank controlId of learn button. All settings and buttons get attached to that string
 * @param instrumentGroups that should be visible for that button
 */
export function setSelectedInstruments(self: MiruSuiteModuleInstance, bank: string, instrumentGroups: string[]): void {
	const autoMap: AutoConfiguredBankMap = config.get('autoConfiguredMap', {}) as AutoConfiguredBankMap
	autoMap[bank] = {
		buttons: autoMap[bank].buttons,
		devices: autoMap[bank].devices,
		instrumentGroups: instrumentGroups,
		displayDeviceName: autoMap[bank].displayDeviceName,
	}
	saveAutoConfiguredButtons(self, autoMap)
}

/**
 * Save the selected display device name setting
 * @param self
 * @param bank controlId of learn button. All settings and buttons get attached to that string
 * @param displayDeviceName if the device name should be shown
 */
export function setDisplayDeviceName(self: MiruSuiteModuleInstance, bank: string, displayDeviceName: boolean): void {
	const autoMap: AutoConfiguredBankMap = config.get('autoConfiguredMap', {}) as AutoConfiguredBankMap
	autoMap[bank] = {
		buttons: autoMap[bank].buttons,
		devices: autoMap[bank].devices,
		instrumentGroups: autoMap[bank].instrumentGroups,
		displayDeviceName: displayDeviceName,
	}
	saveAutoConfiguredButtons(self, autoMap)
}

/**
 * Retrieves the preset that is dynamically linked to that button.
 * @param presets list of all existing presets
 * @param btn containing the id of the button
 * @returns the linked preset if existing, otherwise undefined
 */
export function getPresetToButton(presets: PresetEntity[], btn: AutoConfiguredButton): PresetEntity | undefined {
	const [index, bank] = getIndexOfButton(btn)
	const filteredPresets = getFilteredPresets(presets, bank)
	if (index === -1) {
		return undefined
	}
	return filteredPresets[index]
}

/**
 * Retrieves the index of the button in the bank. The order is based on the order the user has linked the buttons.
 *
 * If the button is not found, -1 is returned.
 * @param btn
 * @returns
 */
export function getIndexOfButton(btn: AutoConfiguredButton): [number, string] {
	const autoMap = config.get('autoConfiguredMap', {}) as AutoConfiguredBankMap
	const banks = Object.keys(autoMap)
	for (const bank of banks) {
		const index = autoMap[bank].buttons.findIndex((b) => b.id === btn.id)
		if (index !== -1) {
			return [index, bank]
		}
	}
	return [-1, '']
}

/**
 * Return the list of buttons for a given bank.
 * @param presets all available presets
 * @param bank for which to retrieve the filtered presets
 * @returns all allowed presets for that bank
 */
export function getFilteredPresets(presets: PresetEntity[], bank: string): PresetEntity[] {
	const autoMap = config.get('autoConfiguredMap', {}) as AutoConfiguredBankMap
	if (autoMap[bank] == undefined) {
		return []
	}
	return presets
		.filter((preset) => {
			const deviceIDs = getDeviceIdsFromPreset(preset)
			const group = getGroupForInstrument(preset.metadata?.instrument ?? 'Unknown')
			for (const id of deviceIDs) {
				// device matches
				if (autoMap[bank].devices.includes(id)) {
					// instrument group matches
					if (autoMap[bank].instrumentGroups.includes(group) || autoMap[bank].instrumentGroups.length === 0) {
						return true
					}
				}
			}
			return false
		})
		.sort(presetSortFn)
}

/**
 * Get all device id's that are related to a preset
 * @param preset to retrieve the device id's from
 * @returns list of device id's
 */
function getDeviceIdsFromPreset(preset: PresetEntity): number[] {
	const ids = []
	for (const command of preset.commands ?? []) {
		ids.push(command.deviceId ?? -1)
	}
	return ids.filter((id) => id !== -1)
}

/**
 * Check if the device name should be displayed for a given button
 * @param btn to check
 * @returns true if the device name should be displayed
 */
export function isDisplayDeviceName(btn: AutoConfiguredButton): boolean {
	const autoMap = config.get('autoConfiguredMap', {}) as AutoConfiguredBankMap
	const [, bank] = getIndexOfButton(btn)
	return autoMap[bank].displayDeviceName
}

/**
 * Add a new auto preset button to a given bank by saving it to a variable.
 * @param self
 * @param bankId controlId of the learn button
 * @param button to add
 */
export function addAutoButton(self: MiruSuiteModuleInstance, bankId: string, button: AutoConfiguredButton): void {
	self.log('debug', 'Added auto preset button: ' + JSON.stringify(button) + ' to learning mode ' + bankId)
	let autoMap: AutoConfiguredBankMap = config.get('autoConfiguredMap', {}) as AutoConfiguredBankMap
	const bank = autoMap[bankId] ?? { buttons: [], devices: [] }
	autoMap = removeAutoButtonFromAnyBank(self, button)
	bank.buttons.push(button)
	autoMap[bankId] = bank
	saveAutoConfiguredButtons(self, autoMap)
}

/**
 * Remove a button from all banks
 * @param self
 * @param button to remove
 * @returns the updated autoMap
 */
function removeAutoButtonFromAnyBank(
	self: MiruSuiteModuleInstance,
	button: AutoConfiguredButton,
): AutoConfiguredBankMap {
	const autoMap: AutoConfiguredBankMap = config.get('autoConfiguredMap', {}) as AutoConfiguredBankMap
	const banks = Object.keys(autoMap)
	for (const bank of banks) {
		const index = autoMap[bank].buttons.findIndex((b) => b.id === button.id)
		if (index !== -1) {
			autoMap[bank].buttons.splice(index, 1)
		}
	}
	saveAutoConfiguredButtons(self, autoMap)
	return autoMap
}

/**
 * Remove all auto buttons from a all banks
 * @param self
 */
export function clearAllAutoButtons(self: MiruSuiteModuleInstance): void {
	saveAutoConfiguredButtons(self, {})
	self.setVariableValues({ learningMode: 'disabled' })
}

/**
 * Remove all auto buttons from a given bank
 * @param self
 * @param bank controlId of the learn button
 */
export function clearLearnedButtons(self: MiruSuiteModuleInstance, bank: string): void {
	const autoMap: AutoConfiguredBankMap = config.get('autoConfiguredMap', {}) as AutoConfiguredBankMap
	autoMap[bank] = { buttons: [], devices: [], instrumentGroups: [], displayDeviceName: false }
	saveAutoConfiguredButtons(self, autoMap)
}

/**
 * Save auto configured buttons to variables and to config.
 * @param self
 * @param autoMap
 */
export function saveAutoConfiguredButtons(self: MiruSuiteModuleInstance, autoMap: AutoConfiguredBankMap): void {
	config.set('autoConfiguredMap', autoMap)
	self.setVariableValues({ autoConfiguredMap: JSON.stringify(autoMap) })
}

/**
 * Update auto configured buttons from saved config
 * @param self
 */
export function updateAutoConfiguredButtons(self: MiruSuiteModuleInstance): any {
	const autoMap: AutoConfiguredBankMap = config.get('autoConfiguredMap', {}) as AutoConfiguredBankMap
	self.setVariableValues({ autoConfiguredMap: JSON.stringify(autoMap) })
}

/**
 * Return all button id's for a given bank
 * @param bank
 * @returns list of attached buttons
 */
export function getAutoBankButtons(bank: string): AutoConfiguredButton[] {
	const autoMap: AutoConfiguredBankMap = config.get('autoConfiguredMap', {}) as AutoConfiguredBankMap
	return autoMap[bank]?.buttons ?? []
}
