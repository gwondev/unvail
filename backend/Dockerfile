FROM gradle:8.7-jdk21 AS builder

WORKDIR /backend
COPY . .

# 컨테이너 안에서 바로 JAR 생성 (서버에서 별도 gradle build 불필요)
RUN gradle bootJar -x test --no-daemon

FROM eclipse-temurin:21-jre

WORKDIR /backend
COPY --from=builder /backend/build/libs/*.jar backend.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "backend.jar"]
