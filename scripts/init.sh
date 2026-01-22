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

# JWT (GERE NOVOS SECRETS EM PRODUÇÃO!)
JWT_SECRET=change-this-secret-in-production-min-32-chars
JWT_REFRESH_SECRET=change-this-refresh-secret-too

# API
ALLOWED_ORIGINS=http://localhost:3000

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
echo -e "${GREEN}╔════════════════════════════════════════╗"
echo "║     ✅ Setup Completo!                 ║"
echo "╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "Próximos passos:"
echo ""
echo -e "  ${YELLOW}1.${NC} Configure o ambiente Docker:"
echo -e "     ${BLUE}make setup${NC}"
echo ""
echo -e "  ${YELLOW}2.${NC} Inicie o desenvolvimento:"
echo -e "     ${BLUE}make dev${NC}"
echo ""
echo -e "  ${YELLOW}3.${NC} Acesse:"
echo -e "     Frontend: ${BLUE}http://localhost:$WEB_PORT${NC}"
echo -e "     API:      ${BLUE}http://localhost:$API_PORT${NC}"
echo ""
echo -e "  ${YELLOW}💡${NC} Para mudar as portas, edite o arquivo ${BLUE}.env${NC}"
echo ""
