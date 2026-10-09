# Three.js 英语小世界 (v0.2.1)
以仓库内 PRD 和技术设计文档为基准的第一阶段源码，**非完整正式版**。

## 技术栈
- Vue 3 + TypeScript + Three.js + Vite + IndexedDB/Dexie
- Java 21 + Spring Boot 3.5 + Spring Data JPA
- 本地 H2 开发；通过 DB_URL/DB_USER/DB_PASSWORD 可接 MySQL
- OpenAI-compatible chat/completions，可通过私有文件配置 Provider

## 首次运行
依赖 Java 21、Maven 3.9+、Node 22+。从项目根目录：
```bash
cd backend
cp config/application-local.example.yml config/application-local.yml
# 用编辑器填本地 AI Base URL、Key、Model（AI 功能可暂不配置）
export PARENT_ACCESS_KEY="your-long-random-parent-key"
mvn spring-boot:run
```
另开终端：
```bash
cd frontend
npm install
npm run dev
```
- 儿童端：http://localhost:5173/kid
- 家长端：http://localhost:5173/parent

## 安全注意
- **真实密钥永远不要提交到 GitHub**。backend/config/application-local.yml 已由根目录 .gitignore 排除。
- Git 仓库只保留 backend/config/application-local.example.yml 示例，不含真实 Key。
- Spring Boot 在 `backend/` 工作目录下使用 `optional:file:./config/application-local.yml` 加载真实配置。
- 用 `git check-ignore -v backend/config/application-local.yml` 检查忽略规则。
- 切勿放入前端 `VITE_*` 环境变量。
- 开发阶段的家长访问密钥只是过渡方案，不是生产级账户和认证系统。
- 学习事件 API 尚未完成儿童身份和设备权限校验，当前服务**禁止直接暴露公网**。

## 当前功能
家长词条 CRUD/送审/批准；调用 AI 获取候选内容，人工确认后发布；发布快照独立存储；儿童端加载最新发布学习包并缓存；Three.js 厨房五个程序化物体，点击辨认；浏览器 TTS；IndexedDB 离线学习记录队列。

## 待开发
儿童档案、设备配对和真正的同步鉴权、学习包分配、学习报告、标准 CSV/XLSX 导入、生产数据库迁移、离线音频资源和端到端测试。

## API
- GET/POST /api/v1/parent/content
- PUT /api/v1/parent/content/{id}
- POST /api/v1/parent/content/{id}/review
- POST /api/v1/parent/content/{id}/approve
- POST /api/v1/parent/packages/publish
- POST /api/v1/parent/ai/suggest
- GET /api/v1/kid/packages/latest
- POST /api/v1/kid/sync/attempts
