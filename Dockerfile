FROM node:24-bookworm-slim
WORKDIR /app
ENV PORT=4321
ENV DATA_DIR=/data
RUN mkdir -p /data /app/uploads
COPY package.json ./
RUN npm install --include=dev --no-audit --no-fund
COPY . .
RUN npm run build
ENV NODE_ENV=production
EXPOSE 4321
CMD ["node", "server/index.mjs"]
