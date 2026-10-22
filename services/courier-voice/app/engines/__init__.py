"""The engines of Courier Voice.

The port is in `app/engine.py`; these are the two that ship today:

- `on_device.SherpaOnnxEngine`: the phone does the speech (sherpa-onnx), the
  service answers from the run the phone has;
- `omniroute.OmniRouteEngine`: the server brain, behind the OmniRoute
  gateway (D25).

`router.EngineRouter` picks between them, so a different engine can be
dropped in without the app noticing (D23, condition c).
"""

from __future__ import annotations

from .omniroute import OmniRouteEngine
from .on_device import DeviceBridge, SherpaOnnxEngine
from .router import EngineRouter

__all__ = [
    "DeviceBridge",
    "EngineRouter",
    "OmniRouteEngine",
    "SherpaOnnxEngine",
]
