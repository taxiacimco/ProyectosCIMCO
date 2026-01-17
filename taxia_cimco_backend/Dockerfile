# Usamos una imagen ligera de Java 17
FROM openjdk:17-jdk-slim

# Definimos el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos el archivo JAR generado por Maven desde la carpeta target
COPY target/taxia_cimco_backend-1.0.0.jar app.jar

# Exponemos el puerto 8080 que es el estándar de Spring Boot
EXPOSE 8080

# Comando para arrancar la aplicación
ENTRYPOINT ["java", "-jar", "app.jar"]