# Usar imagen base oficial de Node.js
FROM node:20

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar SOLO package.json primero (para caché de Docker)
COPY package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar el resto del proyecto (src, public, server.js)
COPY src/ ./src/
COPY public/ ./public/
COPY server.js ./

# Exponer el puerto de la aplicación
EXPOSE 3000

# Comando para iniciar el servidor
CMD ["node", "server.js"]
