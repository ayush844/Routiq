FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@11.3.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/relay/package.json apps/relay/tsconfig.json apps/relay/
COPY packages/shared/package.json packages/shared/
COPY packages/shared/src packages/shared/src

RUN pnpm install --frozen-lockfile

COPY apps/relay/src apps/relay/src

WORKDIR /app/apps/relay

EXPOSE 8081 8082 3001 3002

CMD ["pnpm", "exec", "tsx", "src/index.ts"]
