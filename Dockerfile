FROM node:20-bookworm-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY server/package.json ./server/
RUN cd server && npm install
COPY client/package.json ./client/
RUN cd client && npm install

FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=deps /app/client/node_modules ./client/node_modules
COPY server ./server
COPY client ./client
RUN cd client && npm run build
RUN cd server && npx prisma generate
WORKDIR /app/server
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
