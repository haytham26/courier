# Scale tests — the connected BlueStacks device (supplementary; the CI AVDs are the gate)

**Emulator connected: BlueStacks 5, Android 13 (API 33), x86_64, serial 127.0.0.1:5555.**

| fact | value |
|---|---|
| process | `HD-Player.exe` (pid 30672) + `BstkSVC.exe` + `BlueStacksAppplayerWeb.exe`, all under `C:\Program Files\BlueStacks_nxt\` |
| instance | `Tiramisu64`, adb port 5555 (`bst.instance.Tiramisu64.status.adb_port`), `bst.enable_adb_access="1"`; the conf backup `bluestacks.conf.bak` (10,785 bytes) sits next to it |
| device | `ro.product.model` SM-G998B (the Galaxy S21 skin), `ro.build.version.release` 13, `ro.product.cpu.abi` x86_64, `ro.debuggable` 1, screen 1920x1080 @ 240 dpi |
| root | `su -c id` — `inaccessible or not found`: NOT rooted, so Play Integrity is unaffected |
| our APK | `com.courier.copilot` installed ALONGSIDE (the E2E-flavoured release build, `EXPO_PUBLIC_E2E=1`) |

## What ran, and with which driver

Maestro CANNOT drive this device: its dadb client opens a long-lived `shell` protocol
stream and BlueStacks 5's adb bridge closes it (`java.io.EOFException at
dadb.AdbShellStream.read`, at `AndroidDriver.isPackageInstalled`, before any flow step).
`adb root` also kills the bridge outright (BlueStacks' guest is a release build). Both
are filed as **BUG-303**.

The voice file-input path was therefore driven over ONE-SHOT `adb shell` commands
(a hand-rolled driver: `uiautomator dump` -> find the node by resource-id ->
`input tap` at its centre), replaying `.maestro/voice-file-input.yaml` step for step on
2026-11-10:

```
PASS today-screen appears after launch
PASS (grabber swiped up at 540,1212)
PASS today-add-by-voice tapped
PASS copilot-sphere tapped
PASS tab-caption answers (the canned turn completed)
```

The audio fixture could not be armed (arming needs `adb root`, which the bridge
refuses), so the file branch answered its honest no-model error — the same
documented outcome as the CI legs, where the emulator has no STT model pack.

## Still to run here (the queue)

- the simulated shifts and the remaining flows over the hand-rolled driver (or via
  BUG-303's fix, if BlueStacks' bridge can be made to hold a stream);
- the ≥100-shift seeded runs, the kill-mid-sync drills and the monkey runs listed in
  the directive — they will land here once the driver is a committed script.

This device is SUPPLEMENTARY evidence: the CI AVDs (api 34/35 × small/large) remain
the gate. Nothing of the founder's own apps, data, Magisk or root was touched;
Hyper-V/WHPX were left alone; nothing was wiped.