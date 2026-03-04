FROM node:20-alpine AS base

WORKDIR /app
RUN apk add --no-cache dumb-init

COPY package.json package-lock.json ./

FROM base AS deps-prod
RUN npm ci --omit=dev && npm cache clean --force

FROM base AS deps-dev
RUN npm ci && npm cache clean --force

FROM node:20-alpine AS production

ENV NODE_ENV=production
WORKDIR /app

RUN apk add --no-cache dumb-init \
	&& addgroup -S appgroup \
	&& adduser -S appuser -G appgroup

COPY --from=deps-prod /app/node_modules ./node_modules
COPY --chown=appuser:appgroup src ./src
COPY --chown=appuser:appgroup public ./public
COPY --chown=appuser:appgroup server.js ./
COPY --chown=appuser:appgroup package.json package-lock.json ./

EXPOSE 3000
USER appuser

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "server.js"]

FROM node:20-alpine AS development

ENV NODE_ENV=development
WORKDIR /app

RUN apk add --no-cache dumb-init

COPY --from=deps-dev /app/node_modules ./node_modules
COPY src ./src
COPY public ./public
COPY server.js ./
COPY package.json package-lock.json ./

EXPOSE 3000
USER node

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["npm", "run", "debugging"]
