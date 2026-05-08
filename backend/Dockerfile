FROM node:18-alpine

WORKDIR /app

# Cache dependencies layer for faster rebuilds.
COPY package.json ./
RUN npm install

COPY . .

ENV HOST=0.0.0.0

CMD ["npm", "run", "dev"]
