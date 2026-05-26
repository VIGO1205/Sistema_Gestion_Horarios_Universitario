FROM node:18-alpine
WORKDIR /app

# Copiar package.json y package-lock.json (si existe)
COPY package*.json ./

# Instalar dependencias (incluyendo devDependencies para desarrollo)
RUN npm install

# Copiar código fuente
COPY . .

# Por defecto, correr en modo desarrollo (se sobrescribe en docker-compose.yml)
CMD ["npm", "run", "start:dev"]
