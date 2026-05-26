FROM node:18-alpine
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar todas las dependencias
RUN npm install

# Copiar el código fuente
COPY . .

# Compilar el código TypeScript a JavaScript
RUN npm run build

# Exponer el puerto del backend
EXPOSE 3001

# Comando para producción
CMD ["npm", "run", "start:prod"]
