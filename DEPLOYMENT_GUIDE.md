# GT-Coding 用户系统部署指南

本文档详细介绍如何部署和测试 GT-Coding 扎根理论编码工具的用户系统和积分会员功能。

---

## 一、环境要求

### 1.1 基础环境
- **Node.js**: v18.0.0 或更高版本
- **npm**: v9.0.0 或更高版本
- **PostgreSQL**: v14.0 或更高版本（用于数据库）
- **Git**: 用于代码管理

### 1.2 推荐的开发环境
- Windows 10/11 或 macOS 或 Linux
- 至少 4GB RAM
- 至少 10GB 可用磁盘空间

---

## 二、后端部署

### 2.1 环境准备

#### 2.1.1 安装 Node.js
从官网下载并安装：https://nodejs.org/

验证安装：
```cmd
node --version
npm --version
```

#### 2.1.2 安装 PostgreSQL

**Windows:**
1. 从 https://www.postgresql.org/download/windows/ 下载安装包
2. 安装时设置超级用户密码为 `postgres`
3. 默认端口 5432

**或者使用 Docker:**
```cmd
docker run --name gt-coding-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=gt_coding -p 5432:5432 -d postgres
```

### 2.2 部署步骤

#### 2.2.1 进入后端目录
```cmd
cd d:\miro\dev\GT-Coding\server
```

#### 2.2.2 安装依赖
```cmd
npm install
```

#### 2.2.3 配置环境变量

复制 `.env.example` 为 `.env` 并配置：
```cmd
copy .env.example .env
```

编辑 `.env` 文件：
```
# 数据库配置
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gt_coding?schema=public"

# JWT 配置
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# 邮件配置 (使用 Gmail 为例)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# 应用配置
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"

# 微信支付二维码 (替换为实际URL)
WECHAT_QR_BASIC="https://example.com/qr/basic.png"
WECHAT_QR_STANDARD="https://example.com/qr/standard.png"
WECHAT_QR_PREMIUM="https://example.com/qr/premium.png"
```

**注意：** Gmail 需要使用"应用专用密码"，在 Google 账户安全设置中生成。

#### 2.2.4 运行数据库迁移
```cmd
npx prisma migrate dev --name init
```

如果成功，会看到类似输出：
```
✓ Applied migration 20240515_init
```

#### 2.2.5 生成 Prisma 客户端
```cmd
npx prisma generate
```

#### 2.2.6 填充初始数据
```cmd
npx tsx prisma/seed.ts
```

#### 2.2.7 启动后端服务

开发模式（热重载）：
```cmd
npm run dev
```

生产模式：
```cmd
npm run build
npm start
```

成功启动后会显示：
```
Server running on port 3001
Environment: development
```

---

## 三、前端部署

### 3.1 进入前端目录
```cmd
cd d:\miro\dev\GT-Coding
```

### 3.2 安装依赖
```cmd
npm install
```

### 3.3 配置环境变量（如需要）

创建 `.env.local` 文件：
```
VITE_API_URL=http://localhost:3001
```

### 3.4 启动前端开发服务器
```cmd
npm run dev
```

成功后访问 http://localhost:5173

### 3.5 构建生产版本
```cmd
npm run build
```

构建产物在 `dist` 目录。

---

## 四、功能测试验收指南

### 4.1 用户注册与登录

#### 测试用例 1：用户注册
1. 打开前端页面，点击"注册"
2. 输入邮箱 `test@example.com`（需使用支持的域名：gmail.com, 163.com, 126.com, qq.com）
3. 点击"发送验证码"
4. 查看邮箱（开发环境可在控制台查看验证码）
5. 输入6位验证码
6. 输入密码 `test1234`（需包含字母和数字）
7. 点击注册

**预期结果：**
- ✅ 注册成功
- ✅ 自动登录
- ✅ 获得 50 积分奖励
- ✅ 跳转到编码页面

#### 测试用例 2：用户登录
1. 退出登录
2. 输入正确的邮箱和密码
3. 点击登录

**预期结果：**
- ✅ 登录成功
- ✅ 显示用户邮箱和积分余额
- ✅ 可以访问用户中心

#### 测试用例 3：错误处理
- 输入未注册的邮箱 → 显示"该邮箱未注册"
- 输入错误的密码 → 显示"密码错误"
- 密码不符合要求（少于8位） → 显示密码强度提示

### 4.2 每日签到

#### 测试用例 4：签到功能
1. 登录用户
2. 进入用户中心 → 每日签到
3. 点击"立即签到"按钮

**预期结果：**
- ✅ 签到成功
- ✅ 获得 2 积分
- ✅ 显示连续签到天数
- ✅ 积分余额更新

#### 测试用例 5：连续签到奖励
连续签到 3 天后：
- ✅ 额外获得 5 积分

连续签到 7 天后：
- ✅ 额外获得 10 积分

连续签到 30 天后：
- ✅ 额外获得 50 积分

#### 测试用例 6：重复签到
已签到后再次点击签到：
- ✅ 显示"今日已签到"

### 4.3 充值功能

#### 测试用例 7：查看充值套餐
进入用户中心 → 积分充值：
- ✅ 显示三种套餐：基础档(5元/500积分)、标准档(10元/1200积分)、高级档(50元/7000积分)

### 4.4 编码功能与积分扣除

#### 测试用例 8：积分不足提示
1. 积分余额为 0
2. 在编码页面输入文本

**预期结果：**
- ✅ 显示"积分不足，请签到或充值"

### 4.5 管理员功能

#### 测试用例 9：管理员登录
1. 访问管理后台（需要手动导航或通过URL访问）
2. 输入管理员邮箱和密码

**预期结果：**
- ✅ 登录成功
- ✅ 进入管理后台

#### 测试用例 10：订单审核
在管理后台：
- ✅ 可以查看所有充值订单
- ✅ 可以通过或拒绝订单

---

## 五、API 接口文档

### 5.1 认证接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/send-verification | 发送验证码 |
| POST | /api/auth/register | 用户注册 |
| POST | /api/auth/login | 用户登录 |
| POST | /api/auth/logout | 退出登录 |
| POST | /api/auth/reset-password | 重置密码 |
| GET | /api/auth/me | 获取当前用户 |

### 5.2 用户接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/user/credit-history | 获取积分历史 |
| GET | /api/user/usage-stats | 获取使用统计 |

### 5.3 签到接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/checkin | 每日签到 |
| GET | /api/checkin/status | 获取签到状态 |

### 5.4 充值接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/recharge/plans | 获取充值套餐 |
| POST | /api/recharge/order | 创建充值订单 |
| GET | /api/recharge/orders | 获取用户订单 |

### 5.5 编码接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/coding/check-credits | 检查积分 |
| POST | /api/coding/analyze | 执行编码分析 |

### 5.6 管理员接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/admin/login | 管理员登录 |
| GET | /api/admin/orders | 获取所有订单 |
| POST | /api/admin/orders/:id/approve | 批准订单 |
| POST | /api/admin/orders/:id/reject | 拒绝订单 |
| GET | /api/admin/users | 获取所有用户 |
| POST | /api/admin/users/:id/toggle-status | 切换用户状态 |
| POST | /api/admin/users/:id/add-credits | 添加积分 |
| GET | /api/admin/statistics | 获取统计数据 |

---

## 六、常见问题排查

### 6.1 后端启动失败

**问题：** `Error: P1001: Can't reach database server`
- 检查 PostgreSQL 是否运行
- 检查 DATABASE_URL 配置

**问题：** `Error: P2002: Unique constraint failed`
- 数据库已有数据，删除重新迁��

### 6.2 邮件发送失败

**问题：** Gmail 认证失败
- 确保使用"应用专用密码"而非登录密码
- 确认 SMTP_USER 格式正确

### 6.3 前端无法连接后端

**问题：** CORS 错误
- 检查 FRONTEND_URL 配置
- 检查后端 CORS 配置

### 6.4 积分相关问题

**问题：** 积分扣除失败
- 检查数据库连接
- 检查积分余额是否充足

---

## 七、安全建议

1. **修改 JWT_SECRET** - 生产环境使用强随机密钥
2. **启用 HTTPS** - 生产环境必须使用 HTTPS
3. **配置邮件发送** - 使用企业邮箱或专业邮件服务
4. **定期备份数据库** - 防止数据丢失
5. **监控日志** - 关注错误日志及时发现问题

---

## 八、部署检查清单

- [ ] PostgreSQL 数据库已安装并运行
- [ ] 后端依赖已安装
- [ ] .env 文件已配置
- [ ] 数据库迁移已执行
- [ ] 初始数据已填充
- [ ] 后端服务已启动 (http://localhost:3001)
- [ ] 前端依赖已安装
- [ ] 前端开发服务器已启动 (http://localhost:5173)
- [ ] 用户注册功能正常
- [ ] 用户登录功能正常
- [ ] 签到功能正常
- [ ] 积分系统正常
- [ ] 管理员功能正常

---

如有问题，请检查控制台日志或联系开发团队。