# ============================================================
# Dockerfile – Frontend React + nginx
# Multi-stage : build Vite → image nginx allégée
# ============================================================

# ── Stage 1 : build ─────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copie des manifestes en premier pour mettre en cache
# le téléchargement npm si package.json n'a pas changé
COPY package.json package-lock.json ./
RUN npm ci --silent

# Copie du reste des sources puis build Vite
COPY . .
RUN npm run build
# → produit le dossier /app/dist

# ── Stage 2 : runtime ───────────────────────────────────────
FROM nginx:alpine

# Supprime la config nginx par défaut
RUN rm /etc/nginx/conf.d/default.conf

# Copie notre config nginx personnalisée
COPY nginx.conf /etc/nginx/nginx.conf

# Copie les fichiers statiques du build React
COPY --from=builder /app/dist /usr/share/nginx/html

# Copie les certificats SSL (générés à l'avance, voir README)
COPY certs/cert.pem /etc/nginx/ssl/cert.pem
COPY certs/key.pem  /etc/nginx/ssl/key.pem

# nginx écoute sur 80 (HTTP) et 443 (HTTPS)
EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
