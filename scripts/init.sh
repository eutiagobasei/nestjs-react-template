#!/bin/bash

# ============================================
# 🚀 Script de Setup Inicial
# ============================================
# Este script configura o projeto após o degit
# ============================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════╗"
echo "║     🚀 Setup do Projeto                ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"

# Remover .git do template se existir
if [ -d ".git" ]; then
    echo -e "${BLUE}🗑️  Removendo .git do template...${NC}"
    rm -rf .git
fi

# Solicitar informações do projeto
echo -e "${YELLOW}📝 Configuração do Projeto${NC}"
echo ""

read -p "Nome do projeto (ex: meu-sistema): " PROJECT_NAME
read -p "Descrição do projeto: " PROJECT_DESCRIPTION
read -p "Nome do autor: " AUTHOR_NAME

# Validar nome do projeto
if [[ ! "$PROJECT_NAME" =~ ^[a-z0-9-]+$ ]]; then
    echo -e "${RED}❌ Nome do projeto inválido. Use apenas letras minúsculas, números e hífens.${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🔄 Aplicando configurações...${NC}"

# Função para substituir placeholders
replace_placeholders() {
    local file=$1
    if [[ -f "$file" ]]; then
        sed -i "s/{{PROJECT_NAME}}/$PROJECT_NAME/g" "$file"
        sed -i "s/{{PROJECT_DESCRIPTION}}/$PROJECT_DESCRIPTION/g" "$file"
        sed -i "s/{{AUTHOR_NAME}}/$AUTHOR_NAME/g" "$file"
    fi
}

# Substituir em todos os arquivos relevantes
find . -type f \( -name "*.json" -o -name "*.md" -o -name "*.tsx" -o -name "*.ts" -o -name "*.yml" -o -name "*.yaml" \) | while read file; do
    replace_placeholders "$file"
done

# Gerar JWT secrets seguros automaticamente
echo -e "${BLUE}🔐 Gerando JWT secrets seguros...${NC}"
JWT_SECRET=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 64)
JWT_REFRESH_SECRET=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 64)

# Criar arquivo .env.example
echo -e "${BLUE}📄 Criando .env.example...${NC}"
cat > .env.example << EOF
# ============================================
# Environment Variables
# ============================================

# Project
PROJECT_NAME=$PROJECT_NAME

# Portas (ajuste se houver conflito)
WEB_PORT=3000
API_PORT=3001
DB_PORT=5432
REDIS_PORT=6379

# Database
DATABASE_URL=postgresql://postgres:postgres@db:5432/${PROJECT_NAME}_dev

# JWT (secrets gerados automaticamente)
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY_DAYS=7

# API
ALLOWED_ORIGINS=http://localhost:3000

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
EOF

# Criar .env a partir do example
cp .env.example .env

# Função para encontrar porta disponível
find_available_port() {
    local port=$1
    while lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; do
        port=$((port + 1))
    done
    echo $port
}

# Verificar portas e ajustar se necessário
echo -e "${BLUE}🔍 Verificando portas disponíveis...${NC}"

WEB_PORT=$(find_available_port 3000)
API_PORT=$(find_available_port 3001)
DB_PORT=$(find_available_port 5432)
REDIS_PORT=$(find_available_port 6379)

# Atualizar .env com portas disponíveis
sed -i "s/WEB_PORT=3000/WEB_PORT=$WEB_PORT/" .env
sed -i "s/API_PORT=3001/API_PORT=$API_PORT/" .env
sed -i "s/DB_PORT=5432/DB_PORT=$DB_PORT/" .env
sed -i "s/REDIS_PORT=6379/REDIS_PORT=$REDIS_PORT/" .env
sed -i "s|NEXT_PUBLIC_API_URL=http://localhost:3001|NEXT_PUBLIC_API_URL=http://localhost:$API_PORT|" .env

if [ "$WEB_PORT" != "3000" ] || [ "$API_PORT" != "3001" ]; then
    echo -e "${YELLOW}⚠️  Algumas portas padrão estavam ocupadas. Ajustado automaticamente:${NC}"
    echo -e "   Web: $WEB_PORT | API: $API_PORT | DB: $DB_PORT | Redis: $REDIS_PORT"
fi

# Inicializar git
echo -e "${BLUE}📦 Inicializando repositório Git...${NC}"
git init
git add .
git commit -m "🎉 Initial commit - Project setup"

echo ""
echo -e "${BLUE}🚀 Iniciando ambiente Docker...${NC}"
echo -e "${YELLOW}   Isso pode demorar alguns minutos na primeira vez.${NC}"
echo ""

make setup

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗"
echo "║     ✅ Tudo Pronto!                    ║"
echo "╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "  🌐 Acesse:"
echo -e "     Frontend:   ${BLUE}http://localhost:$WEB_PORT${NC}"
echo -e "     API:        ${BLUE}http://localhost:$API_PORT${NC}"
echo -e "     Bull Board: ${BLUE}http://localhost:$API_PORT/admin/queues${NC}"
echo ""
echo -e "  📋 Comandos úteis:"
echo -e "     ${BLUE}make dev${NC}      - Iniciar desenvolvimento"
echo -e "     ${BLUE}make stop${NC}     - Parar containers"
echo -e "     ${BLUE}make logs${NC}     - Ver logs"
echo ""
echo -e "  ${YELLOW}💡${NC} Para mudar as portas, edite o arquivo ${BLUE}.env${NC}"
echo ""
