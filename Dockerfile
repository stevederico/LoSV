# Base images are pinned by multi-arch index digest (tag kept for
# readability). Each digest was first published at least 7 days before
# it was pinned (2026-11-03).
# node:22.23.3-slim (bookworm), pushed 2026-10-21
FROM node:22.23.3-slim@sha256:3ed98443660ff48413b5af19ecefce3b9d50845a901a43420d47cc63a9fddbe9
WORKDIR /app
COPY package.json deno.lock* ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 8000
CMD ["node", "serve.js"]
