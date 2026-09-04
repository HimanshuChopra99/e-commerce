FROM node:20-alpine AS builder

WORKDIR /app

COPY delivery-app/package*.json ./
RUN npm ci

COPY delivery-app/ .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY delivery-app/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]