# ADR-0005: 账号体系冻结，后续采用 Casdoor 补位（Logto 备选）

## Status

Proposed（核心功能验证门通过后启动账号阶段时提升为 Accepted）

## Context

自研注册/登录/邮箱验证码/签到/积分/充值/管理模块已完成基础实现，但与工作台核心流程零耦合
（ADR-0004 已决定功能 MVP 不依赖账号体系）。团队资源应优先投入"证据可溯的编码工作流"的稳定与验证，
避免同时开发两套系统。

同时为避免账号阶段重建时重复造轮子，需在动工前确定身份层选型。

## Decision

1. **冻结**自研账号相关五块（auth / checkin / recharge / credit / admin）：保留表结构与数据，不再开发新功能，仅安全维护。
2. 核心功能通过验证门后，**预选 Casdoor** 作为认证与账号管理基座（自托管 Go 单体）：
   - 支持邮箱验证码注册与登录（注册页原生 Email code 验证）；
   - Verification Code 扩展授权（`urn:casdoor:params:oauth:grant-type:verification-code`）
     允许邮箱+验证码直接换取 token，未注册邮箱自动建号，匹配本项目现有"邮箱验证码注册登录"产品形态；
   - 自带用户与应用管理后台、中文界面、微信等社交登录可扩展。
3. 备选：**Logto**（OIDC 原生，邮箱验证码注册/登录同为第一公民）。若 Casdoor 集成出现不可克服障碍则切换，前端按标准 OIDC 集成，切换成本受控。

## 迁移原则（账号阶段启动时）

- PostgreSQL 仍是业务数据（积分流水、订单、研究数据）的唯一事实源；Casdoor 只管身份。
- 本地 `User` 表增加 `externalId` 关联 Casdoor 用户；首次 OIDC 登录按 email 自动关联存量账号。
- 认证中间件改为薄适配层对接 OIDC token，自研登录保持双轨可用直至迁完再下线。
- 积分/充值功能在身份层稳定后才恢复开发。

## Consequences

### Positive

- 核心研发期不被账号系统牵制；账号按稳定后的真实需求接入。
- 验证码/OAuth/社交登录/会话管理等成熟能力开箱即用，管理后台可直接交付基本运营能力。
- Oracle 系统保持简单：业务库自持数据，身份外置，边界清晰。

### Negative

- 生产环境多一个自托管组件（Casdoor + 其数据库）的运维负担。
- 存量自研账号数据需做一次性 email 级关联迁移，存在邮箱冲突/合并处理工作。
- 双轨过渡期间存在两套登录入口的 UX 取舍。

## Alternatives Considered

- **继续完成自研账号体系**：rejected，商标性投入与核心验证无关，且后台/会话/社交登录重复造轮子成本高。
- **Logto 直接预选**：capability 等价但相较 Casdoor 在国内社交登录（微信等）与中文运营社区更友好度略低，列为备选。
- **Supabase / PocketBase 整体替换后端**：rejected，放弃既有 Express/Prisma/PostgreSQL 业务栈，
  迁移成本远高于仅外置身份层。
