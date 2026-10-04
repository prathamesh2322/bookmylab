# Exp 9: one image = React build + Spring Boot (Kotlin) jar. Works on Render / any Docker host.

# ---- 1. Build the React frontend (output goes to backend/src/main/resources/static) ----
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund
COPY frontend ./
RUN npm run build

# ---- 2. Build the Spring Boot jar ----
FROM maven:3.9-eclipse-temurin-21 AS backend
WORKDIR /app/backend
COPY backend/pom.xml ./
RUN mvn -q -B dependency:go-offline
COPY backend/src ./src
COPY --from=frontend /app/backend/src/main/resources/static ./src/main/resources/static
RUN mvn -q -B -DskipTests package

# ---- 3. Small runtime image ----
FROM eclipse-temurin:21-jre
WORKDIR /app
ENV TZ=Asia/Kolkata
COPY --from=backend /app/backend/target/bookmylab.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
