#!/bin/bash

# ============================================
# 🖥️ Setup Inicial da VPS
# ============================================
# Execute este script uma vez na VPS para
# configurar Docker, Traefik e estrutura base
# ============================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔════════════════════════════════════════╗"
echo "║     🖥️  Setup Inicial da VPS           ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"

# Verificar se é root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Execute como root: sudo ./setup-vps.sh${NC}"
    exit 1
fi

# Solicitar informações
read -p "Email para certificados SSL (Let's Encrypt): " SSL_EMAIL
read -p "Usuário para deploy (será criado): " DEPLOY_USER

echo ""
echo -e "${BLUE}🔄 Atualizando sistema...${NC}"
apt update && apt upgrade -y

echo -e "${BLUE}📦 Instalando dependências...${NC}"
apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw \
    fail2ban

# ============================================
# 🐳 Docker
# ============================================
echo -e "${BLUE}🐳 Instalando Docker...${NC}"

if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

# Docker Compose plugin
apt install -y docker-compose-plugin

# ============================================
# 👤 Criar usuário de deploy
# ============================================
echo -e "${BLUE}👤 Configurando usuário de deploy...${NC}"

if ! id "$DEPLOY_USER" &>/dev/null; then
    useradd -m -s /bin/bash $DEPLOY_USER
    usermod -aG docker $DEPLOY_USER
    
    # Criar diretório .ssh
    mkdir -p /home/$DEPLOY_USER/.ssh
    chmod 700 /home/$DEPLOY_USER/.ssh
    touch /home/$DEPLOY_USER/.ssh/authorized_keys
    chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys
    chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh
    
    echo -e "${YELLOW}⚠️  Adicione sua chave SSH pública em:${NC}"
    echo -e "   /home/$DEPLOY_USER/.ssh/authorized_keys"
fi

# Criar diretório para apps
mkdir -p /home/$DEPLOY_USER/apps
chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/apps

# ============================================
# 🔥 Firewall
# ============================================
echo -e "${BLUE}🔥 Configurando firewall...${NC}"

ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable

# ============================================
# 🛡️ Fail2ban
# ============================================
echo -e "${BLUE}🛡️ Configurando Fail2ban...${NC}"

systemctl enable fail2ban
systemctl start fail2ban

# ============================================
# 🔀 Traefik
# ============================================
echo -e "${BLUE}🔀 Configurando Traefik...${NC}"

# Criar rede do Traefik
docker network create traefik-public 2>/dev/null || true

# Criar diretório do Traefik
mkdir -p /opt/traefik
cd /opt/traefik

# Criar arquivo de configuração
cat > traefik.yml << EOF
api:
  dashboard: true
  insecure: false

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: traefik-public

certificatesResolvers:
  letsencrypt:
    acme:
      email: ${SSL_EMAIL}
      storage: /letsencrypt/acme.json
      httpChallenge:
        entryPoint: web

log:
  level: INFO
EOF

# Criar docker-compose do Traefik
cat > docker-compose.yml << EOF
version: '3.8'

services:
  traefik:
    image: traefik:v3.0
    container_name: traefik
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik.yml:/traefik.yml:ro
      - ./letsencrypt:/letsencrypt
    networks:
      - traefik-public
    labels:
      - "traefik.enable=true"
      # Dashboard (opcional - acesse via https://traefik.seudominio.com)
      # - "traefik.http.routers.traefik.rule=Host(\`traefik.seudominio.com\`)"
      # - "traefik.http.routers.traefik.entrypoints=websecure"
      # - "traefik.http.routers.traefik.tls.certresolver=letsencrypt"
      # - "traefik.http.routers.traefik.service=api@internal"

networks:
  traefik-public:
    external: true
EOF

# Criar diretório para certificados
mkdir -p letsencrypt
touch letsencrypt/acme.json
chmod 600 letsencrypt/acme.json

# Iniciar Traefik
docker compose up -d

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗"
echo "║     ✅ VPS Configurada!                ║"
echo "╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "Próximos passos:"
echo ""
echo -e "  ${YELLOW}1.${NC} Adicione sua chave SSH pública:"
echo -e "     ${BLUE}nano /home/$DEPLOY_USER/.ssh/authorized_keys${NC}"
echo ""
echo -e "  ${YELLOW}2.${NC} Configure os secrets no GitHub:"
echo -e "     - VPS_HOST: IP ou domínio da VPS"
echo -e "     - VPS_USER: $DEPLOY_USER"
echo -e "     - VPS_SSH_KEY: Sua chave SSH privada"
echo ""
echo -e "  ${YELLOW}3.${NC} Configure seu DNS apontando para esta VPS"
echo ""
echo -e "  ${YELLOW}4.${NC} Traefik rodando em: https://$(curl -s ifconfig.me)"
echo ""
