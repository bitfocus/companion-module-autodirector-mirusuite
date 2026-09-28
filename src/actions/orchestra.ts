import type { MiruSuiteModuleInstance } from '../main.js'
import type { CompanionActionEvent } from '@companion-module/base'
import type { OrchestraBooleanSetting } from '../api/types.js'
import { createDeviceOptions } from '../scripts/helpers.js'

type Actions = Record<string, any>

const settings = [
	{ id: 'movePreviewCameras', label: 'Move preview cameras', kind: 'boolean' },
	{ id: 'moveCameraCount', label: 'Cameras to move', kind: 'number' },
	{ id: 'saveCameraGain', label: 'Save camera gain', kind: 'boolean' },
	{ id: 'saveDirectorSettings', label: 'Save director settings', kind: 'boolean' },
	{ id: 'autoMoveCameras', label: 'Automatically move cameras', kind: 'boolean' },
	{ id: 'audioCalloutPrepLeadSeconds', label: 'Audio callout lead time', kind: 'number' },
	{ id: 'audioCalloutPrepGroupWindowSeconds', label: 'Audio callout group window', kind: 'number' },
	{ id: 'cameraPreparationLeadSeconds', label: 'Camera preparation lead time', kind: 'number' },
	{ id: 'disabledDeviceIds', label: 'Devices excluded from Orchestra', kind: 'devices' },
] as const

export function GetOrchestraActions(self: MiruSuiteModuleInstance): Actions {
	const devices = createDeviceOptions(self.store.getVideoDevices())
	const readyPieces = self.store
		.getMusicPieces()
		.filter((piece) => piece.id !== undefined && piece.analysisStatus === 'READY' && piece.selectable !== false)
	const readyEntries = self.store.getSetlists().flatMap((setlist) =>
		(setlist.entries ?? [])
			.filter((entry) => setlist.id !== undefined && entry.id !== undefined && entry.ready)
			.map((entry) => ({
				id: `${setlist.id}:${entry.id}`,
				label: `${setlist.name ?? `Setlist ${setlist.id}`} — ${entry.piece?.name ?? `Entry ${entry.id}`}`,
			})),
	)
	return {
		startMusicFollower: {
			name: 'Start Music Follower',
			description: 'Enable the Music Follower component on a device.',
			options: [musicDeviceSelector(self)],
			async callback(event: CompanionActionEvent) {
				const device = self.store.getDeviceById(Number(event.options.deviceId))
				if (!device || device.id === undefined || device.components?.musicFollower == null) return
				await self.backend?.toggleComponent(device, true, 'MUSIC_FOLLOWER')
				await refreshFollower(self, device.id)
			},
		},
		stopMusicFollower: {
			name: 'Stop Music Follower',
			description: 'Disable the Music Follower component on a device.',
			options: [musicDeviceSelector(self)],
			async callback(event: CompanionActionEvent) {
				const device = self.store.getDeviceById(Number(event.options.deviceId))
				if (!device || device.id === undefined || device.components?.musicFollower == null) return
				await self.backend?.toggleComponent(device, false, 'MUSIC_FOLLOWER')
				await refreshFollower(self, device.id)
			},
		},
		selectMusicPiece: {
			name: 'Select Music Piece',
			description: 'Select a ready Orchestra piece for the device Music Follower.',
			options: [
				musicDeviceSelector(self),
				{
					id: 'pieceId',
					type: 'dropdown',
					label: 'Piece',
					choices: readyPieces.length
						? readyPieces.map((piece) => ({ id: piece.id!, label: piece.name ?? `Piece ${piece.id}` }))
						: [{ id: -1, label: 'No ready music pieces available' }],
					default: readyPieces[0]?.id ?? -1,
				},
			],
			async callback(event: CompanionActionEvent) {
				const deviceId = Number(event.options.deviceId)
				const pieceId = Number(event.options.pieceId)
				const device = self.store.getDeviceById(deviceId)
				const piece = self.store.getMusicPieces().find((candidate) => candidate.id === pieceId)
				if (
					!device ||
					device.components?.musicFollower == null ||
					!piece ||
					piece.analysisStatus !== 'READY' ||
					piece.selectable === false
				)
					return
				await self.backend?.setMusicFollowerPiece(deviceId, pieceId)
				await refreshFollower(self, deviceId)
			},
		},
		selectMusicSetlistEntry: {
			name: 'Select Music Setlist Entry',
			description: 'Select a ready entry from an Orchestra setlist.',
			options: [
				musicDeviceSelector(self),
				{
					id: 'entry',
					type: 'dropdown',
					label: 'Setlist entry',
					choices: readyEntries.length ? readyEntries : [{ id: '', label: 'No ready setlist entries available' }],
					default: firstReadyEntry(self) ?? '',
				},
			],
			async callback(event: CompanionActionEvent) {
				const selectedEntry = event.options.entry
				const [setlistId, entryId] = (typeof selectedEntry === 'string' ? selectedEntry : '').split(':').map(Number)
				if (!Number.isInteger(setlistId) || !Number.isInteger(entryId)) return
				const deviceId = Number(event.options.deviceId)
				const device = self.store.getDeviceById(deviceId)
				const setlist = self.store.getSetlists().find((candidate) => candidate.id === setlistId)
				const entry = setlist?.entries?.find((candidate) => candidate.id === entryId && candidate.ready)
				if (!device || device.components?.musicFollower == null || !entry) return
				await self.backend?.setMusicFollowerSetlistEntry(deviceId, setlistId, entryId)
				await refreshFollower(self, deviceId)
			},
		},
		musicFollowerNext: musicFollowerTransport(self, 'next'),
		musicFollowerPrevious: musicFollowerTransport(self, 'previous'),
		musicFollowerReset: musicFollowerTransport(self, 'reset'),
		setOrchestraSetting: {
			name: 'Set Orchestra Setting',
			description: 'Update one Orchestra setting while preserving the other current settings.',
			options: [
				{
					id: 'setting',
					type: 'dropdown',
					label: 'Setting',
					choices: settings.map(({ id, label }) => ({ id, label })),
					default: settings[0].id,
				},
				{
					id: 'booleanValue',
					type: 'dropdown',
					label: 'Value',
					choices: [
						{ id: 'toggle', label: 'Toggle' },
						{ id: 'true', label: 'On' },
						{ id: 'false', label: 'Off' },
					],
					default: 'true',
					isVisibleExpression:
						'$(options:setting) == "movePreviewCameras" || $(options:setting) == "saveCameraGain" || $(options:setting) == "saveDirectorSettings" || $(options:setting) == "autoMoveCameras"',
				},
				{
					id: 'numberValue',
					type: 'number',
					label: 'Value (seconds or camera count)',
					default: 1,
					min: 0,
					max: 3600,
					isVisibleExpression:
						'$(options:setting) == "moveCameraCount" || $(options:setting) == "audioCalloutPrepLeadSeconds" || $(options:setting) == "audioCalloutPrepGroupWindowSeconds" || $(options:setting) == "cameraPreparationLeadSeconds"',
				},
				{
					id: 'deviceIds',
					type: 'multidropdown',
					label: 'Excluded devices',
					choices: devices,
					default: [],
					isVisibleExpression: '$(options:setting) == "disabledDeviceIds"',
				},
			],
			async callback(event: CompanionActionEvent) {
				const settingOption = event.options.setting
				const setting = typeof settingOption === 'string' ? settingOption : ''
				const definition = settings.find((entry) => entry.id === setting)
				if (!definition) return
				let value: unknown
				if (definition.kind === 'boolean') {
					const booleanValue = event.options.booleanValue
					if (booleanValue === 'toggle') {
						await self.backend?.toggleOrchestraSetting(setting as OrchestraBooleanSetting)
						return
					}
					value = booleanValue === 'true'
				} else if (definition.kind === 'number') {
					value = Number(event.options.numberValue)
					if (!Number.isFinite(value)) return
				} else
					value = (Array.isArray(event.options.deviceIds) ? event.options.deviceIds : [])
						.map(Number)
						.filter(Number.isInteger)
				await self.backend?.updateOrchestraSettings({ [setting]: value })
			},
		},
	}

	function musicFollowerTransport(self: MiruSuiteModuleInstance, operation: 'next' | 'previous' | 'reset') {
		const labels = { next: 'Next Setlist Entry', previous: 'Previous Setlist Entry', reset: 'Reset Music Follower' }
		return {
			name: labels[operation],
			description: `Send the ${operation} command to the selected device Music Follower.`,
			options: [musicDeviceSelector(self)],
			async callback(event: CompanionActionEvent) {
				const deviceId = Number(event.options.deviceId)
				const device = self.store.getDeviceById(deviceId)
				if (!Number.isInteger(deviceId) || deviceId < 0 || device?.components?.musicFollower == null) return
				if (operation === 'next') await self.backend?.musicFollowerNext(deviceId)
				else if (operation === 'previous') await self.backend?.musicFollowerPrevious(deviceId)
				else await self.backend?.musicFollowerReset(deviceId)
				await refreshFollower(self, deviceId)
			},
		}
	}
}

function musicDeviceSelector(self: MiruSuiteModuleInstance): any {
	const devices = createDeviceOptions(
		self.store.getDevices().filter((device) => device.components?.musicFollower != null),
	)
	return {
		id: 'deviceId',
		type: 'dropdown',
		label: 'Device',
		choices: devices.length ? devices : [{ id: -1, label: 'No Music Follower devices available' }],
		default: devices[0]?.id ?? -1,
	}
}

function firstReadyEntry(self: MiruSuiteModuleInstance): string | undefined {
	for (const setlist of self.store.getSetlists()) {
		const entry = setlist.entries?.find((candidate) => candidate.id !== undefined && candidate.ready)
		if (setlist.id !== undefined && entry?.id !== undefined) return `${setlist.id}:${entry.id}`
	}
	return undefined
}

async function refreshFollower(self: MiruSuiteModuleInstance, deviceId: number): Promise<void> {
	try {
		self.store.setMusicFollowerState(await self.backend!.loadMusicFollowerState(deviceId))
		self.updateVariableValues()
		self.checkFeedbacks('musicFollower')
	} catch (error) {
		self.log('warn', `Could not refresh Music Follower state for device ${deviceId}: ${String(error)}`)
	}
}
