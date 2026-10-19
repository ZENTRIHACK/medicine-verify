FROM node:22-alpine

# better-sqlite3 has no guaranteed musl prebuild, so node-gyp compiles it from
# source. The toolchain is only needed during npm ci, then it is removed.
RUN apk add --no-cache --virtual .build-deps python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev
RUN apk del .build-deps

COPY src ./src
COPY scripts ./scripts

# Mount target for the Fly volume (mounted root-owned at runtime).
RUN mkdir -p /data && chmod 775 /data

ENV NODE_ENV=production \
    PORT=3001 \
    DB_FILE=/data/prod.db \
    CHAIN_MODE=stub \
    OCR_MODE=stub

EXPOSE 3001

# Runs as root (Fly's default) so the root-owned volume at /data stays writable.
# If you switch to USER node, chown /data in an entrypoint or SQLite writes fail.
CMD ["node", "src/index.js"]
