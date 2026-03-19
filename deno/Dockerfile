# ============================================================
# Dockerfile – Serveur Deno (auth JWT + proxy vers Spring)
# Pas de stage de build : Deno exécute TypeScript nativement
# ============================================================

FROM denoland/deno:2.3.1

WORKDIR /app

# Copie du manifeste en premier pour mettre en cache le téléchargement
# des dépendances (jsr + npm) si deno.json/deno.lock n'ont pas changé
COPY deno.json .
COPY deno.lock .
RUN deno install --frozen

# Copie du reste des sources
COPY . .

# Deno écoute sur 8080
EXPOSE 8080

# Permissions nécessaires :
#   --allow-net   : appels HTTP vers Spring + écoute du serveur Oak
#   --allow-read  : lecture des fichiers source et du .env
#   --allow-env   : lecture des variables d'environnement
CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-env", "main.ts"]
