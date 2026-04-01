FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY mysql-to-supabase.js ./

CMD ["node", "mysql-to-supabase.js"]
