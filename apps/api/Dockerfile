# ============================================
# 🔷 API Dockerfile - Production
# ============================================

# Stage 1: Build
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copiar arquivos de configuração
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY apps/api/package.json ./apps/api/

# Instalar dependências
RUN pnpm install --frozen-lockfile

# Copiar código fonte
COPY packages ./packages
COPY apps/api ./apps/api

# Build
WORKDIR /app/apps/api
RUN pnpm build

# Prune dev dependencies
RUN pnpm prune --prod

# Stage 2: Production
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@latest --activate

# Criar usuário não-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

WORKDIR /app

# Copiar apenas o necessário
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./

# Usar usuário não-root
USER nestjs

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Comando de produção
CMD ["node", "dist/main.js"]
