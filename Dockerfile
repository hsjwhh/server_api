FROM node:24-alpine

# 启用 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 复制 workspace 根目录的文件（必须）
COPY ../pnpm-workspace.yaml ./

# 复制 backend 的 package.json
COPY package.json ./package.json

# 安装 backend 的生产依赖
RUN pnpm install --filter ./... --prod

# 复制 backend 源码
COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
