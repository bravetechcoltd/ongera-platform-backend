FROM node:22-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./

# Install ALL deps (including devDeps) to allow tsc to run
RUN npm install

COPY tsconfig.json ./
COPY . .

RUN npm run build

# Prune devDependencies after build
RUN npm prune --production

EXPOSE 3002

CMD ["node", "dist/index.js"]