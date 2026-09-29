# MiruSuite

Control [MiruSuite](https://mirusuite.de) devices, cameras, AutoCut, the switcher, projects, and Music Follower from Bitfocus Companion.

## Connect to MiruSuite

1. Start MiruSuite and make sure the computer running Companion can reach it over the network.
2. Add **MiruSuite** in Companion and enter the MiruSuite server IP address and HTTP port. The default port is `8080`; use `127.0.0.1` when Companion and MiruSuite run on the same computer.
3. If MiruSuite requires authentication, enter the username and password in the module configuration. Leave them blank when authentication is not configured.
4. Save the configuration. A connected module loads the available devices, projects, presets, switcher inputs, and other choices from MiruSuite.

If the connection fails, check the address and port, network access/firewall rules, MiruSuite availability, and credentials. The module's **Connection status** variable can also be used to show connection state on a Companion button.

## Using presets

Presets are generated from the devices and settings configured in MiruSuite. Their names include the target device where relevant. Sections and groups are organized by workflow:

| Companion section or group                     | What you can do                                                                                                                                                                                                                                             |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Video: _device_** — General                  | Enable, disable, or toggle the device's director; trigger random or nearby-preset moves for AutoMove; stop an AutoMove; return a PTZ camera home. Only controls supported by that device's configured components are shown.                                 |
| **Video: _device_** — Person Tracking          | Choose tracking mode and shot size, learn the current target's face, correct framing once, adjust the target point or tracking sensitivity, and exit steady mode. Controls that need a head-tracking director or person tracker appear only when available. |
| **Video: _device_** — PTZ                      | Hold direction or zoom buttons to move the camera. Manual movement speed is shared across PTZ cameras and can be adjusted with the speed buttons.                                                                                                           |
| **Video: _device_** — Saved Presets            | Recall MiruSuite camera presets. The active-preset control reapplies the camera's current active preset.                                                                                                                                                    |
| **Audio: _device_** — AutoCut                  | Set or clear the dominant-speaker override, and enable/disable the device's AutoCut audio component when it has one.                                                                                                                                        |
| **vMix Framer: _device_**                      | Adjust the frame once or enable, disable, and toggle the vMix Framer.                                                                                                                                                                                       |
| **Application** — AutoCut                      | Enable, disable, or toggle AutoCut. Presets also include target shot-size configuration controls.                                                                                                                                                           |
| **Application** — Projects                     | One preset per available project. These presets confirm reported interruptions and request device enablement plus AutoCut and switcher setting restoration. Use the **Load Project** action to choose these options yourself.                               |
| **Application** — Switcher                     | Select a configured input for Program or Preview, swap the buses with **CUT**, or trigger the transition configured in MiruSuite.                                                                                                                           |
| **Application** — Gamepad                      | Assign a video device to MiruSuite's shared gamepad control.                                                                                                                                                                                                |
| **Application** — Orchestra and Music Follower | Include/exclude eligible devices in Orchestra, change common Orchestra settings, toggle each Music Follower, and select ready music pieces or setlist entries.                                                                                              |

Presets and dropdown choices depend on the current MiruSuite configuration. Configure devices, components, presets, switcher inputs, projects, and Orchestra content in MiruSuite first; then refresh or reconnect the module if you change that configuration.

## Actions

Add an action directly when a preset does not expose the option you need. Available actions include:

- **Camera and tracking:** set shot size, director state, tracking mode/person, target point, sensitivity, and component state; learn a target face; correct framing; play or overwrite a preset; reapply the active preset; trigger or stop AutoMove; and return a PTZ camera home.
- **Manual PTZ:** move a camera with pan, tilt, and zoom values, and increase or decrease the shared movement speed. Movement values range from `-1` to `1` and are scaled by that shared speed.
- **AutoCut:** turn AutoCut on, off, or toggle it; set, clear, or toggle the dominant-speaker override for an audio device.
- **Switcher:** set Program or Preview to an input, swap Program and Preview, or trigger MiruSuite's configured transition. MiruSuite can reject a cut while a camera is moving.
- **Projects:** load a project and choose whether to confirm reported interruptions, enable its devices, and restore AutoCut or switcher settings. A load that MiruSuite reports would interrupt running sources or disconnect the switcher requires the confirmation option.
- **Gamepad:** select a video device for the shared gamepad or clear the selection.
- **Music Follower:** start or stop a device's component; select an analyzed, ready music piece or a ready setlist entry; move to the next or previous entry; or reset the follower.
- **Orchestra:** enable/disable a device in Orchestra and update Boolean, numeric, or excluded-device settings.

## Feedbacks

Feedbacks let a button reflect MiruSuite's current state. Depending on your configuration, the module provides feedback for:

- component enabled state and director status;
- tracking mode, selected person, and shot size;
- active camera preset, live camera/input, and switcher Program/Preview bus;
- AutoCut running state and live state, dominant-speaker identity/override, and active project;
- vMix Framer state, controller connection, and stable framing;
- selected gamepad camera;
- Music Follower status, selected piece or setlist entry; and
- Orchestra setting values and whether a device is enabled in Orchestra.

Most device feedbacks are populated from devices known to MiruSuite, so the relevant component must be configured on the selected device. Feedbacks that refer to a project, switcher input, face, preset, or Music Follower item use the values currently reported by MiruSuite.

## Variables

Use Companion variables in button text, expressions, and other modules. Global variables include connection status, device and preset counts, active project, dominant speaker, gamepad camera, AutoCut state/countdown/live shots, live inputs, manual PTZ speed, and Orchestra settings. Device-specific variables are named with the MiruSuite numeric device ID, for example:

- `$(autodirector-mirusuite:device_12_name)`
- `$(autodirector-mirusuite:device_12_director_state)`
- `$(autodirector-mirusuite:device_12_active_preset_name)`
- `$(autodirector-mirusuite:device_12_controller_pan_angle)`
- `$(autodirector-mirusuite:device_12_music_follower_status)`

Replace `12` with the device ID shown by MiruSuite. Only variables relevant to configured devices/components are defined. For the full variable list, use Companion's variable picker after the module connects.

## More information

For MiruSuite guidance, see the [Companion integration documentation](https://docs.mirusuite.de/advanced/companion.html).
