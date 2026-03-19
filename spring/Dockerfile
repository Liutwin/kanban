# ============================================================
# Dockerfile – Spring Boot (backend Tomcat/JPA)
# Multi-stage : build Gradle → image runtime JRE allégée
# ============================================================

# ── Stage 1 : build ─────────────────────────────────────────
# Utilise l'image Gradle officielle correspondant à gradle-wrapper.properties
# (gradle 8.12.1 + JDK 21) — évite de dépendre du gradle-wrapper.jar
FROM gradle:8.12-jdk21-alpine AS builder

WORKDIR /app

# Copie des fichiers de config en premier pour mettre en cache
# le téléchargement des dépendances si build.gradle n'a pas changé
COPY build.gradle settings.gradle ./

RUN gradle dependencies -q --no-daemon

# Copie des sources puis build
COPY src ./src
RUN gradle bootJar -q --no-daemon

# ── Stage 2 : runtime ───────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Dossier pour les pièces jointes uploadées (monté en volume en prod)
RUN mkdir -p /app/uploads

# Copie uniquement le JAR produit par le build
COPY --from=builder /app/build/libs/*.jar app.jar

# Spring Boot écoute sur 8080 par défaut
EXPOSE 8080

# Profil Spring actif (peut être surchargé dans docker-compose)
ENV SPRING_PROFILES_ACTIVE=prod

ENTRYPOINT ["java", "-jar", "app.jar"]
