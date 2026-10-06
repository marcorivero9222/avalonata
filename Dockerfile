# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV CLOUDFLARE_CF_FETCH_ENABLED=false \
    WRANGLER_SEND_METRICS=false \
    WRANGLER_WRITE_LOGS=false
COPY package.json package-lock.json ./
RUN npm ci --include=dev --include=optional --no-audit --no-fund
COPY . .
RUN node --test tests/game.test.mjs && npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    AVALON_PORT=8788 \
    AVALON_BIND_HOST=0.0.0.0 \
    AVALON_DATA_DIR=/data/avalon \
    CLOUDFLARE_CF_FETCH_ENABLED=false \
    WRANGLER_SEND_METRICS=false \
    WRANGLER_WRITE_LOGS=false
# Miniflare/workerd are also needed at runtime to execute the compiled Worker.
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/drizzle ./drizzle
COPY --from=build --chown=node:node /app/scripts/temporary-host.mjs ./scripts/temporary-host.mjs
COPY --from=build /app/scripts/docker-entrypoint.mjs ./scripts/docker-entrypoint.mjs
RUN mkdir -p /data/avalon /app/.sites-runtime && chown node:node /data/avalon /app/.sites-runtime
# Prepare Railway's root-owned volume, then drop to the node user before serving.
EXPOSE 8788
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||process.env.AVALON_PORT||8788)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "scripts/docker-entrypoint.mjs"]
