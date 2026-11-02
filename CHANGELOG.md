# Release notes

## Unreleased

- Fix packaged installs failing to load presets and variables; embed small PTZ graphics.
- Migrate passwords for existing 1.0.3 connections in a new upgrade step.
- Use typed API 2.1 actions, feedbacks and native presets.
- Fix conditional option visibility, bound HTTP requests to five seconds, and avoid redundant variable updates.
- Align the runtime, Yarn configuration, repository files and CI with the API 2.1 template (Node 26).

### Migration notice for 1.1.0

The 1.1.0 release removed automatic button learning without a migration notice.
Removed actions: `learnAutoButtons`, `playAutoPreset`, `overwriteAutoPreset`,
`clearAllAutoButtons`. Removed feedbacks: `learnMode`, `autoPreset`. Removed variables:
`learningMode`, `offlineMode`, `autoConfiguredButtons`.

Existing buttons must be updated manually: use Play Preset, Overwrite Preset and
Active Preset with explicit saved MiruSuite presets. Automatic button assignment
and offline learning have no direct replacement. See companion/HELP.md for upgrade
instructions. Future feature removals require a major release.
