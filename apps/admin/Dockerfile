# syntax=docker/dockerfile:1

FROM node:20-alpine as builder
WORKDIR /app
COPY package.json pnpm-lock.yaml* .npmrc* ./
RUN corepack enable && corepack prepare pnpm@9.10.0 --activate
COPY . .
RUN pnpm install && pnpm build

FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]



