import os
import time
import shutil

avd_path = r"C:\Users\DCL\.android\avd\courier_pixel.avd"

# Kill any emulator/qemu processes
os.system("taskkill /f /im qemu-system-x86_64.exe 2>nul")
os.system("taskkill /f /im emulator.exe 2>nul")

# Wait for processes to die
time.sleep(3)

# Remove lock files and directories
lock_files = [
    os.path.join(avd_path, "multiinstance.lock"),
    os.path.join(avd_path, "hardware-qemu.ini.lock"),
    os.path.join(avd_path, "read-snapshot.txt"),
    os.path.join(avd_path, "emu-launch-params.txt"),
]

lock_dirs = [
    os.path.join(avd_path, "hardware-qemu.ini.lock"),
    os.path.join(avd_path, "snapshots"),
    os.path.join(avd_path, "tmpAdbCmds"),
]

for f in lock_files:
    try:
        if os.path.exists(f):
            os.remove(f)
            print(f"Removed: {f}")
    except Exception as e:
        print(f"Failed to remove {f}: {e}")

for d in lock_dirs:
    try:
        if os.path.exists(d):
            shutil.rmtree(d)
            print(f"Removed dir: {d}")
    except Exception as e:
        print(f"Failed to remove dir {d}: {e}")

print("Cleanup complete")
print(os.listdir(avd_path))