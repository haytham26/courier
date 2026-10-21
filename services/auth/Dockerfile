# The image of the Courier Copilot auth service (Better Auth).
#
# The service is part of the pnpm workspace, so the build context is the
# repository root and the workspace lockfile decides what is installed.
#
# Build:
#   docker build -f services/auth/Dockerfile -t courier-auth:local .

FROM node:22-slim AS build

WORKDIR /workspace

# pnpm 12.14.0 is the version the repository pins (package.json).
RUN corepack enable && corepack prepare pnpm@12.14.0 --activate

COPY . .

# Only the auth service and the packages it needs are installed.
RUN pnpm install --frozen-lockfile --filter @courier/auth...
RUN pnpm --filter @courier/auth build

# The deploy copies the service and its production dependencies into one
# self-contained folder that runs on a server without any other step.
RUN pnpm --filter @courier/auth --prod deploy /out

FROM node:22-slim AS runtime

LABEL org.opencontainers.image.title="Courier Copilot auth service" \
	org.opencontainers.image.source="https://github.com/haytham26/courier" \
	org.opencontainers.image.licenses="UNLICENSED"

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /out ./
COPY --from=build /workspace/services/auth/dist ./dist

USER node

EXPOSE 3001

CMD ["node", "dist/index.js"]
