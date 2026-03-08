FROM node:20-alpine

WORKDIR /app

# Install native dependencies for node modules if needed
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
