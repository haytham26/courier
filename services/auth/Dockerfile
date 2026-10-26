# The auth service's production image (A5: the staging deploy).
#
# Build it from the repository root, where the compose files run from:
#
#   docker build -t courier-auth:local -f services/auth/Dockerfile .
#
# What it does: a slim Node interpreter, the workspace dependencies installed by
# pnpm from the lock file, the service built with tsc, and node running the
# built entrypoint on port 3001.
#
# The whole workspace is the build context because @courier/auth depends on
# @courier/eslint-config as a workspace package (pnpm-workspace.yaml) and
# Better Auth's Expo adapter resolves siblings from the same tree. The build
# layer keeps the lock and the manifests apart from the source, so a code change
# does not re-install.
#
# The version: NODE_VERSION matches @types/node in the workspace (24.x) and the
# engine the release workflow uses.

ARG NODE_VERSION=24

# The variants are `node:<version>-bookworm-slim` (the distro in the middle,
# then the flavour). The tag order matters - `24-slim-bookworm` is not an
# image Docker Hub publishes.

FROM node:${NODE_VERSION}-bookworm-slim AS deps

RUN corepack enable
WORKDIR /workspace

# The lock and every manifest that carries a workspace dependency first, so
# this layer survives a code change. packages/contracts has no package.json (it
# is the OpenAPI and the schema, consumed as files), so it is copied as source.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY services/auth/package.json services/auth/package.json

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --filter @courier/auth... --frozen-lockfile --ignore-scripts

FROM node:${NODE_VERSION}-bookworm-slim AS runtime

RUN corepack enable

WORKDIR /workspace
# The dependency tree the deps stage installed. pnpm 12 hoists the workspace's
# dependencies to the root's node_modules, so copying that directory carries
# every package's dependencies, and the source below is what they serve.
COPY --from=deps /workspace/node_modules ./node_modules

COPY packages/shared ./packages/shared
COPY packages/eslint-config ./packages/eslint-config
COPY services/auth ./services/auth
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

WORKDIR /workspace/services/auth
# tsc compiles the service into dist/ (services/auth/tsconfig.build.json).
RUN pnpm --filter @courier/auth build

# The compose file's healthcheck calls /health/ready inside the container.
EXPOSE 3001
CMD ["node", "dist/index.js"]
