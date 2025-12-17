import { type GUIUpdate } from '../api/types.js'
import EventSource from 'eventsource'
import { MiruSuiteModuleInstance } from '../main.js'

let evtSource: { onmessage: (event: any) => void; close: () => void } | null = null

export default function setupEventHandler(self: MiruSuiteModuleInstance, baseUrl: string, port: number): void {
	baseUrl = baseUrl.trim()
	if (baseUrl === 'localhost') {
		baseUrl = '127.0.0.1'
	}
	const url = `http://${baseUrl}:${port}/api/stream/gui`
	self.log('debug', `Initializing SSE handler on url ${url}...`)
	evtSource = new EventSource(url)
	if (evtSource != null) {
		evtSource.onmessage = (event: any) => {
			const data = JSON.parse(event.data) as GUIUpdate
			self.log('debug', 'Received event: ' + JSON.stringify(data))
			switch (data.type) {
				case 'DEVICES_UPDATED':
				case 'PERSONS_UPDATED':
				case 'PROJECT_UPDATED':
					self.log('debug', 'Devices updated')
					void self.updateConfiguration()
					break
				case 'COMPONENTS_UPDATED':
					self.log('debug', 'Components updated')
					self.store
						.loadDevices()
						.then((deviceChanged) => {
							if (deviceChanged) {
								self.log('debug', '...and devices must be updated')
								// Devices have changed, update the configuration
								void self.updateConfiguration().then(() => {
									self.checkFeedbacks('shotSize', 'trackingMode', 'enabledDirector', 'directorStatus')
								})
							} else {
								self.checkFeedbacks('shotSize', 'trackingMode', 'enabledDirector', 'directorStatus')
							}
						})
						.catch((error) => {
							self.log('error', 'Error loading devices - ' + error)
						})
					break
				case 'ACTIVE_PRESET_UPDATED':
					self.log('debug', 'Active preset updated')
					self.store
						.loadActivePresetMap()
						.then(() => {
							self.checkFeedbacks('activePreset', 'autoPreset')
						})
						.catch((error) => {
							self.log('error', 'Error fetching active preset map - ' + error)
						})
					break
				case 'SWITCHER_STATE_UPDATED':
					self.log('debug', 'Switcher state updated')
					self.store
						.loadLiveInputs()
						.then(() => {
							self.checkFeedbacks('liveDevice')
						})
						.catch((error) => {
							self.log('error', 'Error fetching live inputs - ' + error)
						})
					break
				case 'AUTO_CUT_UPDATED':
					self.log('debug', 'AutoCut state updated')
					self.store
						.loadAutoCutEnabled()
						.then(() => {
							self.checkFeedbacks('autoCut')
						})
						.catch((error) => {
							self.log('error', 'Error loading autocut running - ' + error)
						})
					break
				case 'AUTO_CUT_SPEAKER_OVERRIDE_UPDATED':
					self.log('debug', 'AutoCut speaker override updated')
					self.store
						.loadOverrideDominantSpeaker()
						.then(() => {
							self.checkFeedbacks('dominantSpeakerOverride')
						})
						.catch((error) => {
							self.log('error', 'Error loading autocut speaker overrides - ' + error)
						})
					break
			}
		}
	}
}

export function closeEventHandler(): void {
	if (evtSource !== null) {
		evtSource.close()
	}
}
