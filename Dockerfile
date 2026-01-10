###############
# 1. Builder
###############
FROM node:24-alpine AS builder

WORKDIR /app

# 启用 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 复制依赖声明文件
COPY package.json ./
COPY pnpm-lock.yaml ./

# 安装所有依赖（包括 devDependencies）
RUN pnpm install

# 复制全部源码
COPY . .

###############
# 2. Runtime
###############
FROM node:24-alpine AS runtime

WORKDIR /app

# 启用 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 只复制生产依赖（从 builder 拷贝）
COPY --from=builder /app/node_modules ./node_modules

# 复制源码（不包含 devDependencies）
COPY --from=builder /app ./

EXPOSE 3000
CMD ["node", "server.js"]
