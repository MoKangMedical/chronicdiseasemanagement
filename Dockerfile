FROM node:24-alpine AS base
WORKDIR /app

RUN apk add --no-cache python3 py3-pip

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY . .
RUN sh scripts/setup_predictor_env.sh
RUN pnpm build

ENV NODE_ENV=production
ENV PORT=3010
EXPOSE 3010

CMD ["pnpm", "start"]
