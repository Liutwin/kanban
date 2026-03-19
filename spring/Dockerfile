# ============================================================
# Dockerfile – Spring Boot (backend Tomcat/JPA)
# Multi-stage : build Gradle → image runtime JRE allégée
# ============================================================

# ── Stage 1 : build ─────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /app

# Copie du wrapper Gradle et des fichiers de config en premier
# → permet à Docker de mettre en cache le téléchargement de Gradle
# si build.gradle n'a pas changé
COPY gradlew .
COPY gradle ./gradle
COPY build.gradle .
COPY settings.gradle .

# Pré-téléchargement des dépendances (optimise les rebuilds)
RUN chmod +x gradlew && ./gradlew dependencies -q --no-daemon

# Copie des sources puis build
COPY src ./src
RUN ./gradlew bootJar -q --no-daemon

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
