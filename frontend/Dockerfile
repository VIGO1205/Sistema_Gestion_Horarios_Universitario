FROM node:18-alpine
WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://127.0.0.1:3000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar todas las dependencias
RUN npm install

# Copiar el código fuente
COPY . .

# Construir la aplicación para producción
RUN npm run build

# Exponer el puerto
EXPOSE 3000

# Comando para iniciar en modo producción
CMD ["npm", "run", "start"]
