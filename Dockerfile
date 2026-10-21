FROM node:24-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4321
ENV DATA_DIR=/data
RUN mkdir -p /data /app/uploads

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

EXPOSE 4321
CMD ["node", "server/index.mjs"]
