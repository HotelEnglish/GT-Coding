# GT-Coding — 扎根理论编码助手

> 基于 AI 的扎根理论编码辅助工具，支持经典、程序化、建构式三种理论范式，适用于质性研究数据分析。集成用户系统与积分会员功能。

<p align="center">
  <img src="https://img.shields.io/badge/React-Vite-Tailwind-blue" alt="Frontend">
  <img src="https://img.shields.io/badge/Express-Prisma-PostgreSQL-green" alt="Backend">
  <img src="https://img.shields.io/badge/Node.js-18+-orange" alt="Node">
</p>

---

## 简介

**GT-Coding** 是一款面向质性研究者的扎根理论（Grounded Theory）编码辅助工具。它帮助研究者对访谈、文本等数据进行系统化的三级编码（开放编码 → 主轴编码 → 选择性编码），并支持 AI 辅助生成编码建议。

项目同时包含完整的用户系统（注册/登录/验证码）、积分会员功能（签到、充值、积分消费）和管理员后台。

---

## 功能概览

### 🎨 前端功能

| 模块 | 功能说明 |
|------|----------|
| **编码 (Coding)** | 核心功能模块，支持三种扎根理论范式选择、多级编码输入、AI 辅助分析、备忘录功能 |
| **文献库 (Library)** | 上传和管理参考文档，AI 自动生成摘要 |
| **术语表 (Terminology)** | 自定义通用词与专业词对照表 |
| **设置 (Settings)** | 配置 AI API（OpenAI / Anthropic）、模型参数 |
| **用户中心 (User Center)** | 签到、积分余额、充值、历史记录、使用统计 |
| **管理员面板 (Admin)** | 用户管理、订单审核、积分调整、统计看板 |
| **登录/注册/找回密码** | 邮箱验证码认证，支持密码重置 |

### ⚙️ 后端功能

| 模块 | 端点 | 说明 |
|------|------|------|
| **认证** | `/api/auth/*` | 验证码发送、用户注册、登录、登出、密码重置 |
| **用户** | `/api/user/*` | 积分历史、使用统计 |
| **签到** | `/api/checkin/*` | 每日签到、连续签到奖励 |
| **充值** | `/api/recharge/*` | 套餐查看、创建订单、订单管理 |
| **编码** | `/api/coding/*` | 积分检查、执行编码分析 |
| **管理员** | `/api/admin/*` | 订单审核、用户管理、积分调整、统计 |

---

## 项目架构

```
GT-Coding/
├── index.html                  # 前端入口 HTML
├── src/                        # React 前端源码
│   ├── components/             # 组件
│   │   ├── auth/               # 登录、注册、找回密码
│   │   ├── coding/             # 编码核心组件
│   │   ├── library/            # 文献库
│   │   ├── terminology/        # 术语表
│   │   ├── settings/           # 设置
│   │   ├── guide/              # 指南
│   │   ├── user-center/        # 用户中心
│   │   ├── admin/              # 管理员面板
│   │   └── layout/             # 布局（侧边栏、顶部栏）
│   ├── components/ui/          # UI 基础组件（Button, Card, Badge...）
│   ├── store/                  # Zustand 状态管理
│   │   ├── useAppStore.ts      # 应用全局状态
│   │   └── useAuthStore.ts     # 认证状态（持久化）
│   ├── utils/                  # 工具函数（API 调用、存储等）
│   ├── types/                  # TypeScript 类型定义
│   ├── constants/              # 常量（理论配置等）
│   ├── index.css               # Tailwind CSS 样式
│   └── main.tsx                # React 入口
├── server/                     # Express 后端
│   ├── src/
│   │   ├── index.ts            # 服务入口
│   │   ├── routes/             # 路由定义
│   │   ├── controllers/        # 业务逻辑控制器
│   │   ├── middleware/         # 认证、限流等中间件
│   │   ├── services/           # 业务服务（邮件、积分等）
│   │   └── utils/              # 工具函数（数据库、JWT、密码等）
│   ├── prisma/                 # Prisma ORM
│   │   ├── schema.prisma       # 数据库模型定义
│   │   └── seed.ts             # 初始数据填充
│   ├── .env.example            # 环境变量模板
│   └── package.json
├── package.json                # 前端依赖
├── vite.config.ts              # Vite 配置
├── tsconfig.json               # TypeScript 配置
├── .gitignore
├── start.ps1                   # Windows 一键启动脚本
└── start.bat
```

---

## 技术栈

### 前端
- **React 19** + **TypeScript**
- **Vite** 构建工具
- **Tailwind CSS** 样式
- **Zustand** 状态管理（带 persist 持久化）
- **Axios** HTTP 客户端

### 后端
- **Node.js** + **Express**
- **TypeScript**
- **Prisma** ORM（PostgreSQL）
- **JWT** + **Cookie** 认证
- **Nodemailer** 邮件发送（验证码）
- **Bcrypt** 密码哈希
- **express-validator** 请求验证
- **Rate Limiter** 请求限流

### 数据库
- **PostgreSQL** + **Prisma Migrate**

### AI 集成
- **OpenAI** API
- **Anthropic** API

---

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL >= 14.0

### 1. 克隆项目

```bash
git clone https://github.com/HotelEnglish/GT-Coding.git
cd GT-Coding
```

### 2. 安装依赖

```bash
# 前端
npm install

# 后端
cd server
npm install
cd ..
```

### 验证命令（改动后必跑）

| 命令 | 目录 | 说明 |
|------|------|------|
| `npm run typecheck` | 根目录 | 前端 TypeScript 严格类型检查 |
| `npm test` | 根目录 | 前端 Vitest + Testing Library 测试 |
| `npm run typecheck` | server/ | 后端 TypeScript 严格类型检查 |
| `npm test` | server/ | 后端 Vitest + Supertest 测试 |
| `npm run build` | 根目录 / server/ | 前端单文件构建 / 后端 tsc 产出 |

> 迁移验证（可选）：设置 `DATABASE_URL_TEST` 指向一个空的一次性数据库后运行
> `cd server && npm test`，将自动执行 `prisma migrate deploy` 并校验迁移可重复应用；
> 未设置该变量时迁移测试自动跳过。

### 3. 配置环境变量

```bash
# 复制示例配置
copy server\.env.example server\.env
```

编辑 `server/.env`：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gt_coding?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"
```

### 4. 数据库迁移与初始化

```bash
cd server
npx prisma migrate dev --name init
npx prisma generate
npx tsx prisma/seed.ts
cd ..
```

### 5. 启动服务

```bash
# 方式一：分别启动
# 终端 1 - 后端
cd server && npm run dev

# 终端 2 - 前端
npm run dev

# 方式二：一键启动（Windows）
.\start.ps1
```

### 6. 访问

- 前端：**http://localhost:5173**
- 后端健康检查：**http://localhost:3001/health**
- 后端 API：**http://localhost:3001/api**

---

## 积分系统

### 获取积分

| 方式 | 获得积分 |
|------|----------|
| 注册 | +50 积分 |
| 每日签到 | +2 积分 |
| 连续签到 3 天 | +5 额外积分 |
| 连续签到 7 天 | +10 额外积分 |
| 连续签到 30 天 | +50 额外积分 |
| 充值 | 按套餐获得 |

### 充值套餐

| 套餐 | 价格 | 积分 | 可编码字数 |
|------|------|------|-----------|
| 基础档 | 5 元 | 500 | 5,000 字 |
| 标准档 | 10 元 | 1,200 | 12,000 字 |
| 高级档 | 50 元 | 7,000 | 70,000 字 |

> 编码时按字数扣除积分，积分不足时无法执行编码分析。

---

## 扎根理论范式

| 范式 | 英文名 | 特点 |
|------|--------|------|
| **经典** | Classical | Glaser & Strauss 原始方法，强调从数据中自发涌现理论 |
| **程序化** | Procedural | Strauss & Corbin 方法，结构化的编码流程和备忘录 |
| **建构式** | Constructivist | Charmaz 方法，强调研究者主体性和社会建构 |

> 当前 MVP 仅启用**程序化**（procedural）范式。其余范式须在验证门（见下）通过后解锁。

## 研究工作台 · 验证门（Validation Gate）

研究工作台的核心承诺是：**理论饱和由研究者本人判断，AI 只是可被拒绝对证的建议来源，全程证据可审计**。

在试点（pilot）数据上把以下门全部通过之前，不扩展第二套范式，也不解冻账号/计费：

1. **去标识核查单**（D1–D7，禁原始语料入库）
2. **知情/服务商合规门**（当前默认 `AI_PROVIDER=development` 离线模拟，不出机）
3. **双评双盲评审**（证据准确性 / 代码区分度 / 反例处理 / AI-人归属 / 修改工作量）
4. **通过标准**（零无效证据链接、幂等重放通过、导出再导入校验通过、双评审签认）

协议全文与缺陷记录模板：

| 文件 | 用途 |
|------|------|
| [`docs/validation/protocol.md`](docs/validation/protocol.md) | 核查单、合规门、评审协议与通过标准 |
| [`docs/validation/pilot-scorecard.csv`](docs/validation/pilot-scorecard.csv) | 试点缺陷记录（**禁止**把语料贴进任何记录/issue） |

---

## API 接口文档

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/send-verification` | 发送验证码 |
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/logout` | 退出登录 |
| POST | `/api/auth/reset-password` | 重置密码 |
| GET | `/api/auth/me` | 获取当前用户信息 |

### 用户

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/user/credit-history` | 积分历史 |
| GET | `/api/user/usage-stats` | 使用统计 |

### 签到

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/checkin` | 每日签到 |
| GET | `/api/checkin/status` | 获取签到状态 |

### 充值

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/recharge/plans` | 获取充值套餐 |
| POST | `/api/recharge/order` | 创建充值订单 |
| GET | `/api/recharge/orders` | 获取用户订单 |

### 编码（已停用）

| 方法 | 路径 | 说明 |
|------|------|------|
| * | `/api/coding/*` | **410 Gone** — 旧版模拟编码接口已默认停用（`LEGACY_CODING_ENABLED=true` 可在本地临时启用）。请改用研究工作台 `/api/workbench/*` |

### 研究工作台（可审计 MVP）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/workbench/projects` | 项目列表（`x-gt-workspace` 工作区隔离，默认 `local-default`） |
| POST | `/api/workbench/projects` | 建研究项目（methodology=procedural） |
| POST | `/api/workbench/projects/:id/documents` | 上传资料 → 生成不可变版本 + 确定性分块（SHA-256） |
| GET | `/api/workbench/projects/:id/documents` | 资料与版本列表 |
| GET | `/api/workbench/projects/:id/overview` | 编码建议/备忘录/饱和度自评聚合 |
| POST | `/api/workbench/projects/:id/analysis-runs` | 发起分析运行；需 `Idempotency-Key`，同键幂等；202 queued + 进程内异步执行 |
| GET | `/api/workbench/analysis-runs/:id` | 运行状态/进度/模型元数据（不含密钥） |
| POST | `/api/workbench/code-assignments/:id/decisions` | 研究者决策 accept/edit/reject/defer；edit 永久保留 AI 原文 |
| POST | `/api/workbench/memos` | 新建研究备忘录；AI 备忘转正走 decisions |
| PUT | `/api/workbench/projects/:id/saturation-assessment` | 饱和度研究者自评存档（系统不计算百分比） |
| GET | `/api/workbench/projects/:id/audit-export` | 审计档案导出（`?format=json\|csv`）；存在旧版结果时标注 `legacy: provenance incomplete` |

### 管理员

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/admin/login` | 管理员登录 |
| GET | `/api/admin/orders` | 获取所有订单 |
| POST | `/api/admin/orders/:id/approve` | 批准订单 |
| POST | `/api/admin/orders/:id/reject` | 拒绝订单 |
| GET | `/api/admin/users` | 获取所有用户 |
| POST | `/api/admin/users/:id/toggle-status` | 切换用户状态 |
| POST | `/api/admin/users/:id/add-credits` | 添加积分 |
| GET | `/api/admin/statistics` | 获取统计数据 |

---

## 数据库模型

使用 **Prisma** 定义，主要模型包括：

- **User** — 用户（邮箱、密码哈希、状态、注册时间）
- **AdminUser** — 管理员
- **Session** / **AdminSession** — 会话管理
- **CreditBalance** — 积分余额
- **CreditTransaction** — 积分流水
- **CheckIn** — 签到记录
- **RechargePlan** / **RechargeOrder** — 充值套餐与订单
- **CodingTask** — 编码任务记录
- **VerificationCode** — 验证码
- **Notification** — 系统通知
- **AdminActionLog** — 管理员操作日志

完整模型定义见 `server/prisma/schema.prisma`。

---

## 项目结构说明

### 前端状态管理

- **useAppStore** — 应用全局状态（编码结果、文献库、术语表、API 配置、导航等），数据持久化到 localStorage
- **useAuthStore** — 认证状态（用户信息、Token），使用 Zustand persist 中间件持久化

### AI API 支持

前端配置支持两种 AI 模式：
- **OpenAI** 兼容模式（`mode: 'openai'`）
- **Anthropic** 模式（`mode: 'anthropic'`）

AI 用于文献摘要生成和编码分析辅助。

---

## 常见问题排查

### 后端启动失败
- **`Error: P1001: Can't reach database server`** — 检查 PostgreSQL 是否运行及 `DATABASE_URL` 配置
- **`Error: P2002: Unique constraint failed`** — 数据库已有数据，删除后重新迁移

### 邮件发送失败
- Gmail 需使用"应用专用密码"而非登录密码
- 确认 `SMTP_USER` 格式正确

### 前端无法连接后端
- 检查 `FRONTEND_URL` 配置
- 检查后端 CORS 配置

---

## 安全建议

1. **修改 `JWT_SECRET`** — 生产环境使用强随机密钥
2. **启用 HTTPS** — 生产环境必须使用 HTTPS
3. **配置邮件发送** — 使用企业邮箱或专业邮件服务
4. **定期备份数据库** — 防止数据丢失
5. **监控日志** — 关注错误日志及时发现问题

---

## 许可证

MIT License

---

## 贡献指南

欢迎提交 Issue 和 Pull Request！

---

## 联系信息

- GitHub: [HotelEnglish/GT-Coding](https://github.com/HotelEnglish/GT-Coding)
- 问题反馈: 提交 Issue

---

## 更新日志

### v1.0.0 — 初始版本
- 完成用户注册/登录/验证码系统
- 完成积分会员功能（签到、充值）
- 完成管理员面板（用户管理、订单审核）
- 完成扎根理论编码模块
- 完成文献库和术语表功能
- 支持 OpenAI / Anthropic API 集成
- 完整的 Prisma 数据库模型
- 完善的 API 接口文档
