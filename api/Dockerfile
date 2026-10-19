FROM node:22-alpine

# better-sqlite3 has no guaranteed musl prebuild, so node-gyp compiles it from
# source. The toolchain is only needed during npm ci, then it is removed.
RUN apk add --no-cache --virtual .build-deps python3 make g++

WORKDIR /app

COPY api/package.json api/package-lock.json ./api/
RUN cd api && npm ci --omit=dev

COPY ocr/package.json ocr/package-lock.json ./ocr/
RUN cd ocr && npm ci --omit=dev

RUN apk del .build-deps

COPY api/src ./api/src
COPY api/scripts ./api/scripts
COPY ocr ./ocr

# Mount target for the persistent volume (mounted root-owned at runtime).
RUN mkdir -p /data && chmod 775 /data

# Set OCR_MODE=real and OCR_API_KEY to use the Part D module shipped above.
# chain/ is not shipped in this image, so CHAIN_MODE must stay stub.
ENV NODE_ENV=production \
    PORT=3001 \
    DB_FILE=/data/prod.db \
    CHAIN_MODE=stub \
    OCR_MODE=stub

EXPOSE 3001

# Runs as root (Fly's default) so the root-owned volume at /data stays writable.
# If you switch to USER node, chown /data in an entrypoint or SQLite writes fail.
CMD ["node", "api/src/index.js"]
