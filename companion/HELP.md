## MiruSuite Companion Module Help

This module is designed to control the [MiruSuite](https://mirusuite.de) software via Companion.

### Setup

1. Make sure MiruSuite is running and the Companion server has network access to the device running MiruSuite (port 8080).
2. Open the Companion web interface and add the MiruSuite module. Set the IP adress of the machine running MiruSuite in the configuration.
3. MiruSuite is now connected and you can start adding buttons. Try starting with the preconfigured presets!

If MiruSuite and the Companion server are running on the same device you should use `127.0.0.1` as the IP address.

### Usage

The MiruSuite Companion module offers different presets, actions, and feedbacks corresponding to the MiruSuite workflows.

Presets are grouped into a section for each device. Feature groups such as Person Tracking, PTZ, and AutoCut sit inside the relevant device section. Presets that apply to an entire project or system are listed in Module-wide.

You can find explanations for the preset groups in the following table:

| Category        | Preset name        | Description                                                                                                                                                                                                                                                                   |
| --------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| General         | Toggle Director    | Toggle the director on and off. **Use this to enable/disable tracking!**                                                                                                                                                                                                      |
| General         | Enable Director    | Enable the director.                                                                                                                                                                                                                                                          |
| General         | Disable Director   | Disable the director.                                                                                                                                                                                                                                                         |
| General         | Random Move        | Move the camera in a random position. **Requires an AutoMove director.**                                                                                                                                                                                                      |
| General         | Preset Move        | Move the camera to a random nearby presets. **Requires an AutoMove director.**                                                                                                                                                                                                |
| General         | Stop Move          | Stop any ongoing movement of that camera. **Requires an AutoMove director.**                                                                                                                                                                                                  |
| General         | Return Home        | Return that camera to its home position. **Requires a Controller.**                                                                                                                                                                                                           |
| Person Tracking | All/Manual/Single  | Set the tracking mode for a given device's director (all, manual, single). **Requires a head tracking director.**                                                                                                                                                             |
| Person Tracking | Wide/Medium/Close  | Set the target shot size of a given device's director (wide, medium, close). **Requires a head tracking director.**                                                                                                                                                           |
| Person Tracking | Exit Steady        | Exit the steady mode of a given device's director. **Requires a head tracking director.**                                                                                                                                                                                     |
| Person Tracking | Learn Target Face  | Learn the face of the current target person. **Requires a person tracker.**                                                                                                                                                                                                   |
| Presets         | _Preset Name_      | Play a saved preset. When holding the button for at least one second the preset gets overwritten by the current position of the camera. **Requires a controller.**                                                                                                            |
| Presets         | Play active Preset | Move the camera back to it's last active preset. This is useful when using automatic movements to reset the camera to its needed position. When you press a button for more than one second, the preset is updated to the current camera position. **Requires a controller.** |
| AutoCut         | ⏻ AutoCut          | Enables and disables AutoCut.                                                                                                                                                                                                                                                 |

### New project, gamepad, switcher, and Orchestra controls

The module also provides controls and contextual presets for these MiruSuite workflows:

| Group               | Controls                                                                                                                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Projects            | Load a project, show the active project, and use one preset per available project. The load action can optionally confirm interruptions when MiruSuite reports a 409 response.                     |
| Dominant speaker    | Read the detected speaker as variables, check it with feedback, and retain the existing separate speaker override action and feedback. Speaker state refreshes from AutoCut and live state events. |
| Gamepad             | Assign or clear the shared gamepad camera, see its current assignment, and use a device preset to select a camera.                                                                                 |
| Camera and switcher | Correct head-tracking framing once; cut Program/Preview; trigger MiruSuite’s configured transition; or set a named Program input.                                                                  |
| Music Follower      | Start or stop the device component, select ready pieces or setlist entries, move next/previous, and reset. Presets are generated for available devices, pieces, and ready setlist entries.         |
| Orchestra settings  | Set any documented Orchestra setting while retaining the others. Variables and feedback cover every setting. Presets cover the Boolean settings and camera counts 1, 2, and 3.                     |

Global project and operator variables include `$(autodirector-mirusuite:active_project_name)`, `$(autodirector-mirusuite:dominant_speaker_name)`, `$(autodirector-mirusuite:gamepad_device_name)`, and the `orchestra_*` settings. Per-device live variables use IDs such as `$(autodirector-mirusuite:device_12_controller_pan_angle)`, `$(autodirector-mirusuite:device_12_framing_stable)`, and `$(autodirector-mirusuite:device_12_music_follower_status)`. The numeric device ID is assigned by MiruSuite.

### Other useful API endpoints to review

These endpoints are present in the generated MiruSuite API types and may be useful additions in a later pass:

| API area                                                           | Possible Companion controls                                                                                    |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Switcher preview, recording, streaming, and connection information | Preview selection; recording and streaming actions, variables, and feedback; connection and native-cut status. |
| AutoCut configuration and shot timeline                            | Style and timing controls; current shot and timeline variables.                                                |
| Camera recovery and focus                                          | Camera focus, component reset, and richer preset recovery workflows.                                           |
| Tracking limits and adaptive shot size                             | Specialist adjustment actions and state feedback.                                                              |
| Quick-edit protection                                              | Protection status feedback and buttons for protected edits.                                                    |
| System version and mode                                            | Diagnostic variables.                                                                                          |

Administrative endpoints such as licensing, project or music import, deletion, calibration, shutdown, and restart are not intended as routine control buttons.

For more help visit the [MiruSuite Docs](https://docs.mirusuite.de/advanced/companion.html).

### Compatibility

This version of the plugin was tested with MiruSuite v1.2.0.
