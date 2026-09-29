import { combineRgb } from '@companion-module/base'
import type { MiruSuiteModuleInstance } from '../main.js'
import { getPTZCapableDevices } from '../scripts/helpers.js'
import { action, button, feedback, type LegacyPresets } from './helpers.js'

export function getOrchestraPresets(self: MiruSuiteModuleInstance): LegacyPresets {
	const presets: LegacyPresets = {}
	if (!self.store.getDevices().some((device) => device.components?.musicFollower != null)) return presets

	for (const device of self.store.getDevices()) {
		if (device.id === undefined || device.components?.musicFollower == null) continue
		const deviceId = device.id
		presets[`musicFollower-${deviceId}`] = button(
			'Music Follower',
			`Music Follower\n${device.name ?? `Device ${deviceId}`}`,
			[action('setComponent', { deviceId, componentType: 'MUSIC_FOLLOWER', enabled: 'toggle' })],
			[feedback('enabledComponentType', { deviceId, componentType: 'MUSIC_FOLLOWER' })],
		)
		for (const piece of self.store.getMusicPieces()) {
			if (piece.id === undefined || piece.analysisStatus !== 'READY' || piece.selectable === false) continue
			presets[`musicPiece-${deviceId}-${piece.id}`] = button(
				'Music Follower',
				`Select\n${piece.name ?? `Piece ${piece.id}`}`,
				[action('selectMusicPiece', { deviceId, pieceId: piece.id })],
				[feedback('musicFollowerPieceSelected', { deviceId, pieceId: piece.id })],
			)
		}
		for (const setlist of self.store.getSetlists()) {
			if (setlist.id === undefined) continue
			for (const entry of setlist.entries ?? []) {
				if (entry.id === undefined || !entry.ready) continue
				presets[`musicSetlist-${deviceId}-${setlist.id}-${entry.id}`] = button(
					'Music Follower',
					`Select\n${entry.piece?.name ?? `Entry ${entry.id}`}`,
					[action('selectMusicSetlistEntry', { deviceId, entry: `${setlist.id}:${entry.id}` })],
					[feedback('musicFollowerSetlistEntrySelected', { deviceId, setlistId: setlist.id, entryId: entry.id })],
				)
			}
		}
	}
	for (const device of getPTZCapableDevices(self.store.getDevices())) {
		if (device.id === undefined) continue
		presets[`orchestra-device-${device.id}`] = button(
			'Orchestra',
			`Include in Orchestra\n${device.name ?? `Device ${device.id}`}`,
			[action('toggleOrchestraDevice', { deviceId: device.id })],
			[
				feedback(
					'orchestraDeviceEnabled',
					{ deviceId: device.id },
					{
						bgcolor: combineRgb(0, 0, 255),
						color: combineRgb(255, 255, 255),
					},
				),
			],
		)
	}

	for (const setting of ['movePreviewCameras', 'saveCameraGain', 'saveDirectorSettings', 'autoMoveCameras'] as const) {
		const labels = {
			movePreviewCameras: 'Move Preview Cameras',
			saveCameraGain: 'Save Camera Gain',
			saveDirectorSettings: 'Save Director Settings',
			autoMoveCameras: 'Auto Move Cameras',
		}
		for (const enabled of [true, false]) {
			const value = String(enabled)
			presets[`orchestra-${setting}-${value}`] = button(
				'Orchestra',
				`${enabled ? 'Enable' : 'Disable'}\n${labels[setting]}`,
				[
					action('setOrchestraSetting', {
						setting,
						booleanValue: value,
						numberValue: 1,
						deviceIds: [],
					}),
				],
				[feedback('orchestraSetting', { setting, value })],
			)
		}
		presets[`orchestra-${setting}-toggle`] = button(
			'Orchestra',
			`Toggle\n${labels[setting]}`,
			[
				action('setOrchestraSetting', {
					setting,
					booleanValue: 'toggle',
					numberValue: 1,
					deviceIds: [],
				}),
			],
			[feedback('orchestraSetting', { setting, value: 'toggle' })],
		)
	}
	for (const count of [1, 2, 3]) {
		presets[`orchestra-move-camera-count-${count}`] = button(
			'Orchestra',
			`${count} Camera${count === 1 ? '' : 's'}`,
			[
				action('setOrchestraSetting', {
					setting: 'moveCameraCount',
					booleanValue: 'true',
					numberValue: count,
					deviceIds: [],
				}),
			],
			[feedback('orchestraSetting', { setting: 'moveCameraCount', value: String(count) })],
		)
	}
	return presets
}
