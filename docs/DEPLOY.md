# 🚀 Guia Completo de Deploy

Este guia explica como fazer o deploy do seu projeto local para a VPS.

## 📋 Visão Geral do Fluxo

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   LOCAL     │────▶│   GITHUB    │────▶│  VPS (DEV)  │────▶│ VPS (PROD)  │
│  Develop    │push │   CI/CD     │auto │   Testar    │merge│  Produção   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
     │                    │                   │                   │
     │                    │                   │                   │
   make dev          CI verifica         dev.dominio.com     dominio.com
                     Build images        api-dev.dominio.com api.dominio.com
```

---

## 🖥️ Parte 1: Configurar a VPS (Uma vez só)

### 1.1 Requisitos da VPS
- Ubuntu 22.04 ou 24.04
- Mínimo 2GB RAM
- Docker instalado
- Portas 80 e 443 liberadas

### 1.2 Executar Setup Inicial

```bash
# Conectar na VPS
ssh root@sua-vps-ip

# Baixar e executar script de setup
curl -fsSL https://raw.githubusercontent.com/SEU_USER/SEU_REPO/main/scripts/setup-vps.sh -o setup-vps.sh
chmod +x setup-vps.sh
sudo ./setup-vps.sh
```

O script irá:
- Instalar Docker
- Configurar firewall
- Instalar Fail2ban
- Configurar Traefik (proxy reverso + SSL automático)
- Criar usuário de deploy

### 1.3 Configurar DNS

No seu provedor de DNS, crie os registros:

| Tipo | Nome | Valor |
|------|------|-------|
| A | @ | IP_DA_VPS |
| A | www | IP_DA_VPS |
| A | api | IP_DA_VPS |
| A | dev | IP_DA_VPS |
| A | api-dev | IP_DA_VPS |

---

## 🔑 Parte 2: Configurar GitHub Secrets

### 2.1 Criar Chave SSH para Deploy

No seu computador local:

```bash
# Gerar chave SSH específica para deploy
ssh-keygen -t ed25519 -C "deploy@github" -f ~/.ssh/deploy_key

# Ver a chave pública (adicionar na VPS)
cat ~/.ssh/deploy_key.pub

# Ver a chave privada (adicionar no GitHub)
cat ~/.ssh/deploy_key
```

### 2.2 Adicionar Chave na VPS

```bash
# Na VPS, como root
echo "COLE_A_CHAVE_PUBLICA_AQUI" >> /home/deploy/.ssh/authorized_keys
```

### 2.3 Configurar Secrets no GitHub

Vá em: **Settings → Secrets and variables → Actions**

#### Secrets Obrigatórios:

| Secret | Descrição | Exemplo |
|--------|-----------|---------|
| `VPS_HOST` | IP ou domínio da VPS | `123.45.67.89` |
| `VPS_USER` | Usuário de deploy | `deploy` |
| `VPS_SSH_KEY` | Chave SSH privada completa | `-----BEGIN OPENSSH...` |

#### Secrets para DEV:

| Secret | Descrição | Exemplo |
|--------|-----------|---------|
| `DEV_DOMAIN` | Domínio base | `meuprojeto.com.br` |
| `DEV_API_URL` | URL da API DEV | `https://api-dev.meuprojeto.com.br` |
| `DEV_DATABASE_URL` | Connection string | `postgresql://user:pass@db:5432/myapp_dev` |
| `DEV_JWT_SECRET` | Secret JWT (32+ chars) | `gerar-com-openssl-rand-base64-32` |
| `DEV_JWT_REFRESH_SECRET` | Secret refresh | `gerar-com-openssl-rand-base64-32` |
| `DEV_DB_USER` | Usuário do banco | `postgres` |
| `DEV_DB_PASSWORD` | Senha do banco | `senha-segura-dev` |

#### Secrets para PROD:

| Secret | Descrição | Exemplo |
|--------|-----------|---------|
| `PROD_DOMAIN` | Domínio base | `meuprojeto.com.br` |
| `PROD_API_URL` | URL da API PROD | `https://api.meuprojeto.com.br` |
| `PROD_DATABASE_URL` | Connection string | `postgresql://user:pass@db:5432/myapp` |
| `PROD_JWT_SECRET` | Secret JWT (diferente do DEV!) | `gerar-com-openssl-rand-base64-32` |
| `PROD_JWT_REFRESH_SECRET` | Secret refresh | `gerar-com-openssl-rand-base64-32` |
| `PROD_DB_USER` | Usuário do banco | `postgres` |
| `PROD_DB_PASSWORD` | Senha do banco | `senha-mega-segura-prod` |

### 2.4 Gerar Secrets Seguros

```bash
# Gerar JWT secrets
openssl rand -base64 32

# Gerar senha do banco
openssl rand -base64 24
```

---

## 🔄 Parte 3: Configurar Environments no GitHub

### 3.1 Criar Environment "development"

1. Vá em **Settings → Environments → New environment**
2. Nome: `development`
3. Não precisa de aprovação

### 3.2 Criar Environment "production"

1. Vá em **Settings → Environments → New environment**
2. Nome: `production`
3. ✅ Marque **Required reviewers**
4. Adicione você como reviewer

Isso garante que deploys para produção precisem de aprovação manual.

---

## 🚀 Parte 4: Fluxo de Deploy

### 4.1 Deploy para DEV (Automático)

```bash
# Qualquer push para develop dispara deploy automático
git checkout develop
git add .
git commit -m "feat: nova funcionalidade"
git push origin develop

# Acompanhe em: GitHub → Actions
```

**URLs DEV:**
- Frontend: https://dev.seudominio.com
- API: https://api-dev.seudominio.com

### 4.2 Deploy para PROD (Com aprovação)

```bash
# Merge develop → main
git checkout main
git merge develop
git push origin main

# 1. GitHub Actions builda as imagens
# 2. Você recebe notificação para aprovar
# 3. Após aprovar, deploy acontece
```

**URLs PROD:**
- Frontend: https://seudominio.com
- API: https://api.seudominio.com

---

## 📊 Parte 5: Monitoramento

### 5.1 Ver Logs na VPS

```bash
# Conectar na VPS
ssh deploy@sua-vps

# Ver logs DEV
cd ~/apps/nome-do-projeto
docker compose -f docker-compose.dev.yml --env-file .env.dev logs -f

# Ver logs PROD
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f
```

### 5.2 Ver Status dos Containers

```bash
# Status DEV
docker compose -f docker-compose.dev.yml --env-file .env.dev ps

# Status PROD
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
```

### 5.3 Health Checks

```bash
# DEV
curl https://api-dev.seudominio.com/api/v1/health

# PROD
curl https://api.seudominio.com/api/v1/health
```

---

## 🔧 Parte 6: Comandos Úteis

### Na VPS

```bash
# Reiniciar aplicação DEV
docker compose -f docker-compose.dev.yml --env-file .env.dev restart

# Reiniciar aplicação PROD
docker compose -f docker-compose.prod.yml --env-file .env.prod restart

# Ver uso de recursos
docker stats

# Limpar imagens antigas
docker image prune -af

# Acessar banco DEV
docker exec -it nome-projeto-db-dev psql -U postgres -d nome_projeto_dev

# Acessar banco PROD
docker exec -it nome-projeto-db-prod psql -U postgres -d nome_projeto
```

### Rollback Manual

```bash
# Listar imagens disponíveis
docker images | grep nome-projeto

# Voltar para versão anterior (exemplo)
cd ~/apps/nome-projeto
sed -i 's/TAG=latest/TAG=sha-abc123/' .env.prod
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

---

## ⚠️ Troubleshooting

### Certificado SSL não funciona

```bash
# Verificar logs do Traefik
docker logs traefik

# Verificar se acme.json tem permissão correta
ls -la /opt/traefik/letsencrypt/acme.json
# Deve ser: -rw------- (600)
```

### Container não inicia

```bash
# Ver logs detalhados
docker compose -f docker-compose.prod.yml --env-file .env.prod logs api-prod

# Verificar se variáveis estão corretas
cat .env.prod
```

### Banco de dados não conecta

```bash
# Testar conexão
docker exec -it nome-projeto-db-prod pg_isready -U postgres

# Ver se o container do banco está rodando
docker ps | grep db
```

---

## 📝 Checklist de Deploy

### Primeira vez:
- [ ] VPS configurada (setup-vps.sh)
- [ ] DNS apontando para VPS
- [ ] Chave SSH configurada
- [ ] Secrets configurados no GitHub
- [ ] Environments criados (development, production)

### Cada deploy:
- [ ] Testes passando localmente
- [ ] Commit e push para develop
- [ ] Verificar deploy DEV funcionando
- [ ] Testar em dev.seudominio.com
- [ ] Merge para main
- [ ] Aprovar deploy no GitHub
- [ ] Verificar health check em produção
