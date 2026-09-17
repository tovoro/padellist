# Build: npm test und npm run build (enthaelt beide Typechecks).
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm test && npm run build

# Laufzeit: Node mit eingebautem SQLite und Type-Stripping, keine node_modules.
FROM node:24-alpine
ENV NODE_ENV=production PORT=8080 DB_PATH=/data/padellist.db
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY server ./server
COPY src/types.ts ./src/types.ts
COPY migrations ./migrations
RUN mkdir /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
CMD ["node", "server/main.ts"]
