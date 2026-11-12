# The VROOM engine's image for the routing evaluation (the founder's 2026-11-12
# directive item 5, second half: "VROOM v1.15.0 in a pinned Docker image as the
# third routing engine").
#
#   docker build -f infra/eval/vroom/Dockerfile -t courier-vroom:1.15.0 infra/eval/vroom
#   docker run --rm courier-vroom:1.15.0 vroom --version
#
# VROOM is C++ (github.com/VROOM-Project/vroom) and its own wiki is the build
# procedure: a C++20 compiler, libasio, OpenSSL, GLPK for the `plan` mode, the
# v1.15.0 tag, its submodules, and `make` in `src/`. There is no prebuilt binary
# in the release (its assets are empty), so a source build is the only way to
# run the engine - which is exactly why ADR-030 recorded it as a gap.
#
# The base is Ubuntu 24.04 and not Debian bookworm, and the reason is recorded
# rather than left to be discovered: VROOM's `src/utils/version.h` includes
# `<format>`, which needs GCC 13 or newer. Bookworm's GCC 12 fails the build
# with `fatal error: format: No such file or directory` (run 2026-11-12, the
# first attempt at this image), and a build environment that cannot compile the
# engine is not a build environment.
#
# The pinning is the repo's own discipline for a tool that runs the eval: the
# base image by DIGEST, the engine by TAG, and a build whose version is not
# 1.15.0 fails - so a moving branch cannot quietly become the measured engine.

FROM ubuntu@sha256:2198e4c65076e9cb0b3d695219df667c0e3b0072da64ca3c2648aca17dcecaf5 AS builder

RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends \
      build-essential ca-certificates git make \
      libasio-dev libssl-dev libglpk-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src
RUN git clone --depth 1 --branch v1.15.0 --recurse-submodules \
      https://github.com/VROOM-Project/vroom.git /src/vroom

WORKDIR /src/vroom/src
RUN make -j"$(nproc)" && ls -l /src/vroom/bin/vroom

# The runtime stage carries only what the engine links against (the same
# release, so the C++ runtime matches the compiler that built it).
FROM ubuntu@sha256:2198e4c65076e9cb0b3d695219df667c0e3b0072da64ca3c2648aca17dcecaf5 AS runtime

RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends \
      libssl3 libglpk40 libstdc++6 libgcc-s1 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /src/vroom/bin/vroom /usr/local/bin/vroom

# The engine's own version, and nothing else: an image that answers a different
# version is not the engine the eval measures.
RUN vroom --version

LABEL org.opencontainers.image.title="Courier Copilot routing eval: VROOM" \
    org.opencontainers.image.source="https://github.com/VROOM-Project/vroom" \
    org.opencontainers.image.licenses="BSD-2-Clause"
