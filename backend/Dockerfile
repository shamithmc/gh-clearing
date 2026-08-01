FROM node:20-alpine AS frontend-build

WORKDIR /workspace/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build


FROM maven:3.9-eclipse-temurin-21-alpine AS backend-build

WORKDIR /workspace
COPY backend/pom.xml backend/pom.xml
RUN mvn -f backend/pom.xml dependency:go-offline

COPY backend/ backend/
COPY --from=frontend-build /workspace/backend/src/main/resources/static/ backend/src/main/resources/static/
RUN mvn -f backend/pom.xml package -DskipTests


FROM eclipse-temurin:21-jre-alpine

RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=backend-build /workspace/backend/target/gh-clearing-1.0.0.jar app.jar

USER app
EXPOSE 10000
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
