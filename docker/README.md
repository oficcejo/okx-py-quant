# Docker 部署指南

本文档介绍如何使用 Docker 和 Docker Compose 部署 OKX 量化交易系统。

---

## 📋 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- 至少 2GB 可用内存
- 至少 5GB 可用磁盘空间

---

## 🚀 快速开始

### 1. 克隆项目（如果还没有）

```bash
git clone <your-repo-url>
cd okx-py-quant-qoder
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入真实的配置
nano .env  # 或使用你喜欢的编辑器
```

**必须配置的项**:
- `OKX_API_KEY` - OKX API 密钥
- `OKX_API_SECRET` - OKX API 密钥
- `OKX_PASSPHRASE` - OKX API 密钥口令

### 3. 构建并启动服务

```bash
# 构建镜像
docker-compose build

# 启动所有服务
docker-compose up -d

# 查看运行状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 4. 访问应用

- **前端界面**: http://localhost
- **后端API**: http://localhost:8000
- **API文档**: http://localhost:8000/docs
- **健康检查**: http://localhost:8000/health

---

## 🔧 常用命令

### 服务管理

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看运行状态
docker-compose ps

# 查看日志
docker-compose logs -f [service_name]

# 进入容器
docker-compose exec backend bash
docker-compose exec frontend sh
```

### 数据库管理

```bash
# 备份数据库
docker-compose exec backend cp /app/okx_quant.db /app/data/okx_quant_backup_$(date +%Y%m%d).db

# 恢复数据库
docker cp okx_quant_backup.db okx-quant-backend:/app/okx_quant.db
docker-compose restart backend
```

### 清理

```bash
# 停止并删除容器
docker-compose down

# 删除容器和卷
docker-compose down -v

# 删除镜像
docker rmi okx-py-quant-qoder_backend okx-py-quant-qoder_frontend
```

---

## 📂 目录结构

```
.
├── Dockerfile              # 后端镜像构建文件
├── Dockerfile.frontend     # 前端镜像构建文件
├── docker-compose.yml      # Docker Compose 配置
├── docker/
│   ├── nginx.conf          # Nginx 配置
│   └── README.md           # 本文件
├── .env.example            # 环境变量模板
└── .gitignore              # Git 忽略文件
```

---

## 🔐 安全建议

### 生产环境部署

1. **使用 HTTPS**
   ```yaml
   # docker-compose.yml
   frontend:
     ports:
       - "443:443"
     volumes:
       - ./ssl:/etc/nginx/ssl
   ```

2. **限制 CORS 来源**
   ```env
   # .env
   ALLOWED_ORIGINS=https://your-domain.com
   ```

3. **使用 Docker Secrets**
   ```yaml
   services:
     backend:
       secrets:
         - okx_api_key
         - okx_api_secret
   
   secrets:
     okx_api_key:
       file: ./secrets/okx_api_key.txt
   ```

4. **限制资源使用**
   ```yaml
   services:
     backend:
       deploy:
         resources:
           limits:
             cpus: '2'
             memory: 2G
   ```

---

## 🐛 故障排查

### 1. 后端无法启动

```bash
# 查看后端日志
docker-compose logs backend

# 常见问题：
# - 端口被占用：修改 docker-compose.yml 中的端口映射
# - 环境变量未配置：检查 .env 文件
# - 依赖安装失败：重新构建镜像 docker-compose build --no-cache
```

### 2. 前端无法访问后端

```bash
# 检查网络连接
docker-compose exec frontend ping backend

# 检查后端健康状态
docker-compose exec frontend wget -O- http://backend:8000/health

# 检查 nginx 配置
docker-compose exec frontend cat /etc/nginx/conf.d/default.conf
```

### 3. 数据库问题

```bash
# 检查数据库文件权限
docker-compose exec backend ls -la /app/okx_quant.db

# 重建数据库
docker-compose exec backend python rebuild_database.py
```

### 4. 容器健康检查失败

```bash
# 查看健康检查日志
docker inspect okx-quant-backend | grep -A 10 Health

# 手动测试健康检查
docker-compose exec backend python -c "import requests; print(requests.get('http://localhost:8000/health').text)"
```

---

## 📊 监控和日志

### 查看实时日志

```bash
# 所有服务
docker-compose logs -f

# 特定服务
docker-compose logs -f backend
docker-compose logs -f frontend

# 最近100行
docker-compose logs --tail=100 backend
```

### 导出日志

```bash
# 导出到文件
docker-compose logs backend > backend.log
docker-compose logs frontend > frontend.log
```

---

## 🔄 更新部署

### 更新代码

```bash
# 拉取最新代码
git pull

# 重新构建镜像
docker-compose build

# 重启服务
docker-compose up -d
```

### 滚动更新（零停机）

```bash
# 更新后端
docker-compose up -d --no-deps --build backend

# 更新前端
docker-compose up -d --no-deps --build frontend
```

---

## 🌐 生产环境配置示例

### 使用 Nginx 反向代理

```nginx
# /etc/nginx/sites-available/okx-quant
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 使用环境变量文件

```bash
# 生产环境
docker-compose --env-file .env.production up -d

# 测试环境
docker-compose --env-file .env.staging up -d
```

---

## 📦 备份和恢复

### 备份脚本

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 备份数据库
docker-compose exec -T backend cat /app/okx_quant.db > $BACKUP_DIR/okx_quant_$TIMESTAMP.db

# 备份配置
cp .env $BACKUP_DIR/.env_$TIMESTAMP

echo "备份完成: $BACKUP_DIR"
```

### 恢复脚本

```bash
#!/bin/bash
# restore.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "用法: ./restore.sh <备份文件>"
    exit 1
fi

# 停止服务
docker-compose down

# 恢复数据库
cp $BACKUP_FILE ./okx_quant.db

# 启动服务
docker-compose up -d

echo "恢复完成"
```

---

## 🎯 性能优化

### 1. 使用多阶段构建

已在 `Dockerfile.frontend` 中实现，减小最终镜像大小。

### 2. 启用 Gzip 压缩

已在 `docker/nginx.conf` 中配置。

### 3. 资源限制

```yaml
# docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### 4. 缓存优化

```dockerfile
# 分离依赖安装和代码复制
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY app/ ./app/
```

---

## 💬 常见问题

**Q: 如何修改端口？**  
A: 编辑 `docker-compose.yml` 中的 `ports` 配置，例如：
```yaml
ports:
  - "8080:8000"  # 宿主机端口:容器端口
```

**Q: 如何查看数据库内容？**  
A: 可以使用 SQLite 客户端连接 `./okx_quant.db` 文件，或进入容器：
```bash
docker-compose exec backend sqlite3 /app/okx_quant.db
```

**Q: 如何启用 HTTPS？**  
A: 修改 `docker/nginx.conf` 添加 SSL 配置，并挂载证书目录：
```yaml
volumes:
  - ./ssl:/etc/nginx/ssl:ro
```

**Q: 数据会丢失吗？**  
A: 数据库文件通过 volume 挂载到宿主机，容器删除不会影响数据。

---

## 📞 技术支持

如有问题，请查看：
- 项目 README: [../README.md](../README.md)
- Issues: <your-repo-issues-url>
- 文档: <your-docs-url>

---

**最后更新**: 2025-12-29
