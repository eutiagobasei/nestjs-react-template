# {{PROJECT_NAME}}

{{PROJECT_DESCRIPTION}}

## 🚀 Quick Start

```bash
# 1. Configure o ambiente (apenas primeira vez)
make setup

# 2. Inicie o desenvolvimento
make dev
```

## 📋 Pré-requisitos

- Docker e Docker Compose
- Make (opcional, mas recomendado)

## 🛠️ Stack

- **Backend:** NestJS + TypeScript + Prisma
- **Frontend:** Next.js 14 + React + Tailwind CSS
- **Database:** PostgreSQL
- **Cache:** Redis

## 📁 Estrutura do Projeto

```
├── apps/
│   ├── api/          # Backend NestJS
│   └── web/          # Frontend Next.js
├── packages/
│   ├── shared-types/ # Tipos compartilhados
│   └── shared-utils/ # Utilitários compartilhados
├── docker/
│   ├── local/        # Docker para desenvolvimento
│   └── vps/          # Docker para VPS (dev + prod)
└── docs/             # Documentação
```

## 🔧 Comandos Úteis

| Comando | Descrição |
|---------|-----------|
| `make setup` | Configura o ambiente pela primeira vez |
| `make dev` | Inicia o ambiente de desenvolvimento |
| `make stop` | Para todos os containers |
| `make logs` | Mostra logs de todos os containers |
| `make install` | Instala dependências |
| `make add-api pkg=nome` | Adiciona pacote na API |
| `make add-web pkg=nome` | Adiciona pacote no Web |
| `make test` | Roda os testes |
| `make lint` | Roda o linter |
| `make db-migrate name=xxx` | Cria nova migration |
| `make db-studio` | Abre Prisma Studio |
| `make shell-api` | Abre terminal na API |
| `make shell-web` | Abre terminal no Web |

## 🌐 URLs

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:3001 |
| Health Check | http://localhost:3001/api/v1/health |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

## ⚠️ Importante

**Nunca rode `npm install` ou `pnpm install` diretamente no seu terminal!**

Todas as dependências devem ser instaladas dentro dos containers Docker:

```bash
# ✅ Correto
make add-api pkg=axios
make add-web pkg=lucide-react

# ❌ Errado
npm install axios
pnpm add axios
```

## 📝 License

UNLICENSED
