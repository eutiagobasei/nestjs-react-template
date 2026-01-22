# ============================================
# 🚀 Makefile - Comandos de Desenvolvimento
# ============================================
# REGRA DE OURO: Todos os comandos passam pelo Docker
# NUNCA execute npm/pnpm/yarn diretamente no host
# ============================================

.PHONY: setup dev stop logs install test lint build deploy-dev deploy-prod clean reset

# --------------------------------------------
# 🎯 Comandos Principais
# --------------------------------------------

## Configura o ambiente completo (use apenas na primeira vez)
setup:
	@echo "🚀 Iniciando setup do ambiente..."
	@docker compose -f docker/local/docker-compose.yml up -d --build
	@echo "📦 Instalando dependências da API..."
	@docker compose -f docker/local/docker-compose.yml exec api pnpm install
	@echo "📦 Instalando dependências do Web..."
	@docker compose -f docker/local/docker-compose.yml exec web pnpm install
	@echo "🗃️  Gerando cliente Prisma..."
	@docker compose -f docker/local/docker-compose.yml exec api pnpm prisma generate
	@echo "✅ Setup completo! Use 'make dev' para iniciar o desenvolvimento"

## Inicia o ambiente de desenvolvimento
dev:
	@docker compose -f docker/local/docker-compose.yml up

## Inicia o ambiente em modo detached (background)
dev-d:
	@docker compose -f docker/local/docker-compose.yml up -d
	@echo "✅ Ambiente rodando em background. Use 'make logs' para ver os logs"

## Para todos os containers
stop:
	@docker compose -f docker/local/docker-compose.yml down

## Mostra logs de todos os containers
logs:
	@docker compose -f docker/local/docker-compose.yml logs -f

## Mostra logs apenas da API
logs-api:
	@docker compose -f docker/local/docker-compose.yml logs -f api

## Mostra logs apenas do Web
logs-web:
	@docker compose -f docker/local/docker-compose.yml logs -f web

# --------------------------------------------
# 📦 Gerenciamento de Dependências
# --------------------------------------------

## Instala todas as dependências
install:
	@docker compose -f docker/local/docker-compose.yml exec api pnpm install
	@docker compose -f docker/local/docker-compose.yml exec web pnpm install

## Instala dependências apenas da API
install-api:
	@docker compose -f docker/local/docker-compose.yml exec api pnpm install

## Instala dependências apenas do Web
install-web:
	@docker compose -f docker/local/docker-compose.yml exec web pnpm install

## Adiciona pacote na API (uso: make add-api pkg=nome-do-pacote)
add-api:
	@docker compose -f docker/local/docker-compose.yml exec api pnpm add $(pkg)

## Adiciona pacote no Web (uso: make add-web pkg=nome-do-pacote)
add-web:
	@docker compose -f docker/local/docker-compose.yml exec web pnpm add $(pkg)

## Adiciona pacote de dev na API (uso: make add-api-dev pkg=nome-do-pacote)
add-api-dev:
	@docker compose -f docker/local/docker-compose.yml exec api pnpm add -D $(pkg)

## Adiciona pacote de dev no Web (uso: make add-web-dev pkg=nome-do-pacote)
add-web-dev:
	@docker compose -f docker/local/docker-compose.yml exec web pnpm add -D $(pkg)

# --------------------------------------------
# 🐚 Shell / Terminal
# --------------------------------------------

## Abre terminal dentro do container da API
shell-api:
	@docker compose -f docker/local/docker-compose.yml exec api sh

## Abre terminal dentro do container do Web
shell-web:
	@docker compose -f docker/local/docker-compose.yml exec web sh

## Abre terminal dentro do container do banco
shell-db:
	@docker compose -f docker/local/docker-compose.yml exec db psql -U postgres

# --------------------------------------------
# 🧪 Testes e Qualidade
# --------------------------------------------

## Roda todos os testes
test:
	@docker compose -f docker/local/docker-compose.yml exec api pnpm test

## Roda testes em modo watch
test-watch:
	@docker compose -f docker/local/docker-compose.yml exec api pnpm test:watch

## Roda testes com coverage
test-cov:
	@docker compose -f docker/local/docker-compose.yml exec api pnpm test:cov

## Roda testes e2e
test-e2e:
	@docker compose -f docker/local/docker-compose.yml exec api pnpm test:e2e

## Roda linter em todos os projetos
lint:
	@docker compose -f docker/local/docker-compose.yml exec api pnpm lint
	@docker compose -f docker/local/docker-compose.yml exec web pnpm lint

## Roda linter e corrige automaticamente
lint-fix:
	@docker compose -f docker/local/docker-compose.yml exec api pnpm lint:fix
	@docker compose -f docker/local/docker-compose.yml exec web pnpm lint:fix

## Verifica tipos TypeScript
type-check:
	@docker compose -f docker/local/docker-compose.yml exec api pnpm type-check
	@docker compose -f docker/local/docker-compose.yml exec web pnpm type-check

# --------------------------------------------
# 🗃️ Database (Prisma)
# --------------------------------------------

## Cria nova migration (uso: make db-migrate name=nome_da_migration)
db-migrate:
	@docker compose -f docker/local/docker-compose.yml exec api pnpm prisma migrate dev --name $(name)

## Aplica migrations pendentes
db-push:
	@docker compose -f docker/local/docker-compose.yml exec api pnpm prisma db push

## Gera cliente Prisma
db-generate:
	@docker compose -f docker/local/docker-compose.yml exec api pnpm prisma generate

## Abre Prisma Studio (interface visual do banco)
db-studio:
	@docker compose -f docker/local/docker-compose.yml exec api pnpm prisma studio

## Roda seed do banco
db-seed:
	@docker compose -f docker/local/docker-compose.yml exec api pnpm prisma db seed

## Reset completo do banco (CUIDADO: apaga todos os dados)
db-reset:
	@echo "⚠️  ATENÇÃO: Este comando apaga TODOS os dados do banco de dados!"
	@echo ""
	@read -p "Digite 'sim' para confirmar: " confirm && [ "$$confirm" = "sim" ] || (echo "❌ Operação cancelada" && exit 1)
	@docker compose -f docker/local/docker-compose.yml exec api pnpm prisma migrate reset

# --------------------------------------------
# 🏗️ Build
# --------------------------------------------

## Build de produção
build:
	@docker compose -f docker/local/docker-compose.yml exec api pnpm build
	@docker compose -f docker/local/docker-compose.yml exec web pnpm build

## Build apenas da API
build-api:
	@docker compose -f docker/local/docker-compose.yml exec api pnpm build

## Build apenas do Web
build-web:
	@docker compose -f docker/local/docker-compose.yml exec web pnpm build

# --------------------------------------------
# 🚀 Deploy
# --------------------------------------------

## Deploy para ambiente DEV na VPS
deploy-dev:
	@./scripts/deploy-dev.sh

## Deploy para ambiente PROD na VPS
deploy-prod:
	@./scripts/deploy-prod.sh

# --------------------------------------------
# 🧹 Limpeza
# --------------------------------------------

## Remove containers, volumes e imagens locais (CUIDADO: apaga dados!)
clean:
	@echo "⚠️  ATENÇÃO: Este comando apaga TODOS os volumes (dados do banco, Redis, etc)!"
	@echo ""
	@read -p "Digite 'sim' para confirmar: " confirm && [ "$$confirm" = "sim" ] || (echo "❌ Operação cancelada" && exit 1)
	@docker compose -f docker/local/docker-compose.yml down -v --rmi local
	@echo "✅ Containers, volumes e imagens locais removidos"

## Reset completo: limpa tudo e reconfigura (CUIDADO: apaga dados!)
reset:
	@echo "⚠️  ATENÇÃO: Este comando apaga TODOS os dados e reconfigura do zero!"
	@echo ""
	@read -p "Digite 'sim' para confirmar: " confirm && [ "$$confirm" = "sim" ] || (echo "❌ Operação cancelada" && exit 1)
	@$(MAKE) clean
	@$(MAKE) setup
	@echo "✅ Ambiente resetado completamente"

# --------------------------------------------
# ℹ️ Help
# --------------------------------------------

## Mostra informações do projeto (portas, URLs, status)
info:
	@echo ""
	@echo "📋 Informações do Projeto"
	@echo "========================="
	@echo ""
	@if [ -f .env ]; then \
		export $$(cat .env | grep -v '^#' | xargs); \
		echo "🌐 URLs:"; \
		echo "   Frontend: http://localhost:$$WEB_PORT"; \
		echo "   API:      http://localhost:$$API_PORT"; \
		echo "   API Health: http://localhost:$$API_PORT/api/v1/health"; \
		echo ""; \
		echo "🗃️ Database:"; \
		echo "   Host: localhost:$$DB_PORT"; \
		echo "   User: postgres"; \
		echo "   DB:   $${PROJECT_NAME}_dev"; \
		echo ""; \
		echo "📦 Redis: localhost:$$REDIS_PORT"; \
	else \
		echo "⚠️  Arquivo .env não encontrado. Execute ./scripts/init.sh primeiro."; \
	fi
	@echo ""

## Mostra status dos containers
status:
	@docker compose -f docker/local/docker-compose.yml ps

## Verifica se as portas estão disponíveis
check-ports:
	@echo "🔍 Verificando portas..."
	@if [ -f .env ]; then \
		export $$(cat .env | grep -v '^#' | xargs); \
		for port in $$WEB_PORT $$API_PORT $$DB_PORT $$REDIS_PORT; do \
			if lsof -Pi :$$port -sTCP:LISTEN -t >/dev/null 2>&1; then \
				echo "❌ Porta $$port está ocupada"; \
			else \
				echo "✅ Porta $$port disponível"; \
			fi; \
		done; \
	else \
		echo "⚠️  Arquivo .env não encontrado."; \
	fi

## Mostra esta ajuda
help:
	@echo ""
	@echo "📋 Comandos disponíveis:"
	@echo ""
	@grep -E '^##' Makefile | sed 's/## /  /'
	@echo ""
	@echo "💡 Exemplos:"
	@echo "  make setup              # Configura ambiente pela primeira vez"
	@echo "  make dev                # Inicia desenvolvimento"
	@echo "  make add-api pkg=axios  # Adiciona axios na API"
	@echo "  make db-migrate name=add_users  # Cria migration"
	@echo ""
