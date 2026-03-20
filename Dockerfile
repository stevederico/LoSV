FROM node:22-slim
WORKDIR /app
COPY package.json deno.lock* ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 8000
CMD ["node", "serve.js"]
