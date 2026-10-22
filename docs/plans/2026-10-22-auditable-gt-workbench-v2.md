# 可审计扎根理论工作台实施方案 v2

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
>
> **状态：** 取代 `2026-10-21-auditable-grounded-theory-workbench.md`（v1）。
> v1 的架构方向与领域不变量全部保留；本版基于 2026-10-22 对代码库的实际核查做了重排：
> 工作台后端（schema/services/routes）已由先行开发实现但**未提交、无测试、无迁移、未对接前端**，
> 因此 v2 把"验收并提交现状"排在测试基线之前，并补充了 v1 未覆盖的现存缺陷处置。

**目标：** 在不丢失既有结果的前提下，完成"单一研究者、证据可溯"的程序化扎根理论 MVP，
核心流程（证据 → AI 建议 → 研究者决策 → 审计导出）先跑通并验证；账号/积分体系冻结缓建。

**架构：** 保留 React/Vite 前端、Express API、Prisma、PostgreSQL。工作台后端已存在
（`/api/workbench`，文件名为 `workbench*` 而非 v1 所写的 `project*`/`document*`，以实际为准）。
需要补齐：测试套件、迁移基线、进程内异步运行、决策/备忘录/审计导出端点、前端工作台。

**技术栈：** 既有栈 + 新增 Vitest、Supertest（server）、@testing-library/react + jsdom（client）、Zod（服务端输出校验）。

---

## 一、代码核查结论（v2 依据的现场事实）

| # | 事实 | 证据 |
|---|------|------|
| 1 | 工作台后端已实现但全部未跟踪/未修改提交（2 个 commit：initial + README） | `git status`：workbenchController/Routes、localWorkspaceMiddleware、services/ai、analysisRunService、provenanceService、schema.prisma +221 行 |
| 2 | 全仓库零测试；server `package.json` 写了 `"test": "jest"` 但 jest 未安装 | server/package.json:14 |
| 3 | 无 prisma migrations 目录；`.gitignore` 中忽略规则已在工作区删除但迁移未生成 | server/prisma/ |
| 4 | `/api/coding/analyze` 是 mock（硬编码返回），且扣积分、结果不落库、在交互式事务内嵌套调用 `creditService.deductCredits`（Prisma 禁止嵌套交互式事务，运行时必抛错） | codingController.ts:111-144, 176-219 |
| 5 | 分析运行为**请求内同步执行**（v1 设想的 queued→后台处理并未实现）；幂等键先查后建，并发同 key 会撞唯一约束 500；failed 后同 key 无法重试 | analysisRunService.ts:11-24, 23-84 |
| 6 | 前端从不在 core 编码流调用后端；AI 直连浏览器 fetch、Key 存 localStorage；前端对 workbench 无任何对接代码 | api.ts:12-33、storage.ts、src 无 workbench 目录 |
| 7 | `respondError` 将内部 `error.message` 直接回给客户端（信息泄露面） | workbenchController.ts:107-111 |
| 8 | 伪"理论饱和度"= 概念数/5 之类拍脑袋比率渲染成百分比 | ResultPanel.tsx:77-81, 241-292 |
| 9 | 无全局 body 限制/helmet/全局限流；localWorkspace 的 `x-gt-workspace` 头可任意伪造，仅限本地 | server/src/index.ts、localWorkspaceMiddleware.ts |

## 二、范围与决策（本次确认）

- **账号/积分缓建：** 自研 auth/checkin/recharge/credit/admin 模块**冻结**——不删表、不开发新功能、
  仅做安全维护；MVP 不依赖它们（延续 ADR-0003/0004）。未来方向见第六节（Casdoor，Logto 备选）。
- **旧 mock 端点：** `/api/coding/*` 以 feature flag 默认停用（返回 410），前端旧编码模块降级为"旧版快照"。
- **运行模式：** **进程内异步**——POST 立即返回 `queued` 的 run + runId，服务端在进程内继续执行，前端轮询 GET；不引入 Redis/外部队列。
- **提供商边界：** MVP 仅接 OpenAI 兼容端点（现有 `OpenAiCompatibleProvider`，fetch 适配足够，不引 SDK）；
  开发/测试用 `DevelopmentProvider` 夹具。真实访谈文本上山前必须完成数据边界决策（v1 第五节保留）。

### 领域不变量（自 v1 原样保留）

- 文档版本不可变；编辑产生新版本。
- 每条证据含 `documentVersionId`、UTF-16 `startOffset/endOffset`、逐字 `quoteText`、SHA-256 hash；服务端校验引语真值后才落库。引语必须完全落在单个 segment 内（跨段引语视为无效，422）。
- AI 产出永远是 `suggested` 工件，经 accept/edit/reject/defer 决策前不算研究结论；edit 保留原 AI 文本。
- 决策追加为 `ResearchDecision` 事件流，UI 状态只是投影。
- 幂等键 ↔ 恰好一个 run（含并发路径）；`queued/running` 为非终态，`completed/failed/cancelled` 为终态。
- 不出现任何自动/数值型"理论饱和度"结论。

---

## 三、任务

### Phase 0：现状验收与入版本库（先跑起来，再谈升级）

**1. 验证工作台后端代码可用**
- `cd server && npm run build`（tsc 全量检查，零错误为过）
- 本地库 `npx prisma db push` + `npm run dev`，手测：POST `/api/workbench/projects`（带/不带 `x-gt-workspace` 头）、
  documents、analysis-runs（`AI_PROVIDER=development` 夹具）走通
- 顺手修复两处已知小问题：`respondError` 不再外泄 `error.message`（仅记日志返回通用文案）；
  `server/.env.example` 补 `AI_PROVIDER/AI_API_BASE_URL/AI_API_KEY/AI_MODEL` 注释说明

**2. 分批提交（两次）**
- `docs: add auditable GT workbench plan and ADRs`（docs/ 全部）
- `feat: add workbench provenance backend (schema, services, routes)`（schema.prisma、services/**、controllers/workbenchController.ts、routes/workbenchRoutes.ts、middleware/localWorkspaceMiddleware.ts、index.ts、.gitignore、.env.example、DEPLOYMENT_GUIDE.md）

**验证：** build 通过 + dev 手测记录写入 DEPLOYMENT_GUIDE。

### Phase 1：测试基线 + 迁移基线（v1 Task 1/2 的落地版）

**1. Server 测试套件**
- 开发依赖：`vitest`、`supertest`、`@types/supertest`、`zod`
- **拆分 app 与监听**：`server/src/app.ts`（express 工厂，导出 app，不 listen）+ `server/src/index.ts`（仅 listen）；测试 import app.ts
- Disposable 测试库：`DATABASE_URL_TEST` 指向临时库，全局 setup 里 `prisma migrate deploy`
- 首批测试（红→绿）：
  - `POST /api/workbench/projects` 建项目：默认 workspace 为 `local-default`，自定义头生效，两工作区互不可见
  - 跨工作区读取他人 run/project → 404
  - 幂等重复提交返回同一 run（Phase 2 完成后补并发用例）
- `server/package.json`：`"test": "vitest run"`（移除不存在的 jest）

**2. Client 测试套件**
- 开发依赖：`vitest`、`@testing-library/react`、`@testing-library/jest-dom`、`jsdom`
- 冒烟：渲染 `App` 登录态/工作台入口不崩；旧编码页可见且标注"旧版快照"
- 根 `package.json` 增加 `typecheck` / `test` 两脚本（server 同理），README 记录命令

**3. Prisma 迁移基线**
- 用 `prisma migrate diff --from-empty --to-schema-datamodel schema.prisma` 生成 `_baseline` 迁移提交入库
- 新增测试：向空库 `migrate deploy` 成功
- 修订 `DEPLOYMENT_GUIDE.md`：一律 `prisma migrate deploy`；删除任何"删库重建"式指示（v1 Task 2 第 4 条落实）

**提交：** `test: establish client/server test baseline`、`chore: version prisma migrations`

### Phase 2：运行服务异步化 + 决策/备忘录端点（v1 Task 3/4/5 的落地版）

**1. 进程内异步运行**
- `POST /api/workbench/projects/:id/analysis-runs`：校验归属与版本 → 以 `queued` 建行并**立即 202 返回 `{runId,status}`**；
  执行体 `executeRun(runId)` 队进程内 Promise，不 await，内部全量 try/catch 兜底
- 状态机落库：`queued → running(startedAt) → completed/failed(completedAt, errorMessage)`；schema 增 `progress` 简要字段（如 phase 文本）
- **幂等竞态**：create 撞 `P2002` 时回查既有 run 幂等返回（同一响应体，状态 202）
- **重试语义（写入 README/契约）**：终态 failed 的 run 不可复活；客户端换新 `Idempotency-Key` 前缀重试
- **重启兜底**：应用启动时把遗留 `queued/running` 批量置为 `failed`（errorMessage: 进程重启中断），保证无僵尸态
- Provider `fetch` 加 `AbortController` 超时（默认 120s，env 可调）→ 超时 = failed run
- Provider 输出用 Zod 校验（label/quote/rationale/memoDrafts 形状 + 长度上限），替换手写 parseCandidate

**2. 决策/备忘录/总览端点（前端对接的必备后端，v1 契约中缺失部分补齐）**
- `GET /api/workbench/projects/:id/overview`：codes + assignments(含 segment/版本信息) + memos 按项目聚合
- `POST /api/workbench/code-assignments/:id/decision`：body `{action: 'accept'|'edit'|'reject'|'defer', editedValue?}`；
  追加 `ResearchDecision` 事件并同步工件状态投影；edit 必须保留原 AI 文本（新字段或 assignment 上存 originalQuote/originalRationale）
- `POST /api/workbench/memos`：人工备忘；AI 备忘转正走同一决策机制
- `AnalyticMemo` 增 `kind`（analysis | saturation_assessment），饱和度=研究者自评（scope/覆盖/未决问题/反例/决策/理由），**无百分比**
- 以上全部带工作区归属校验 + 路由测试

**测试：** 并发同 key 幂等、provider 超时/畸形输出/引语不可验证 → failed 或 422、决策事件流不可变、edit 保留原文。

**提交：** `feat: async analysis runs`、`feat: researcher decisions and memos`

### Phase 3：遗留编码端点停用与前端降级标注

- `server/.env` 与 `.env.example` 增 `LEGACY_CODING_ENABLED`（默认 `false`）；关闭时 `/api/coding/*` 一律 410 + 指向 workbench 的提示；mock 代码保留但仅 flag 打开且 dev 环境可走（顺手把嵌套事务调用改为传入 tx 的正确写法，防止有人打开 flag 后必炸）
- README"API 接口文档"中 /api/coding 段标注 deprecated
- 前端 `CodingModule` 运行入口禁用 + 顶部横幅"旧版快照：仅供回看历史结果，不做证据审计"；`ResultPanel` 删除伪饱和度百分比 tab（替换为说明：饱和度评估已移至工作台，需研究者自评）
- 相关测试：flag 关闭 410、旧行仍可只读导出（Phase 4 审计导出负责）

**提交：** `chore: disable legacy mock coding endpoint`

### Phase 4： researcher 决策工作台 + 审计导出（v1 Task 6/7 的落地版）

**1. 前端**
- `src/utils/workbenchApi.ts`（axios 复用 apiClient；自动生成 uuid 作 `Idempotency-Key`；带 `x-gt-workspace`）
- `src/store/useWorkbenchStore.ts`（zustand + persist moins sensible 字段，与 useAuthStore 同模式；不再 props 下钻）
- `App.tsx` 增 `workbench` 模块与侧边栏入口
- 组件（`src/components/workbench/`）：`ProjectWorkspace`（项目/文档/版本）、`RunPanel`（发起+进程内轮询，离开页面可回来看进度）、`EvidenceReview`（三栏：不可变原文+版本标签 / 证据高亮 offset / AI 建议与决策）、`DecisionControls`、`MemoPanel`、`SaturationAssessmentPanel`（自评表单，无自动结论）、`AuditExportPanel`
- 硬性 UI 约束：建议态清晰标注"AI 生成"；证据校验失败的 suggestion 不允许 approve；决策後原文 AI 文本可查
- 组件测试对齐上述约束

**2. 审计导出（server）**
- `auditExportService.ts` + `GET /api/workbench/projects/:id/audit-export`（?format=json|csv）：
  项目元数据、文档版本、segments+hash、assignments+决策事件流、memos、ModelRun 元数据（无密钥/无原始提示全文）、
  **完整性警告**：legacy CodingTask 记录标注 `legacy: provenance incomplete`，绝不伪造缺失审计行
- 导出下载记入 ResearchDecision/lightweight event 以备溯源
- UI 下载按钮 + 测试：导出含版本/offset/决策/模型元数据；对 legacy 快照给出缺失警告

**提交：** `feat: researcher review workbench`、`feat: audit export`

### Phase 5：验证门（v1 Task 8 原样执行）

- `docs/validation/protocol.md`：去标识核查单、知情/服务商合规门、双评双盲协议（证据准确性、代码区分度、反例处理、AI/人归属、修改工作量），不预设"唯一正确编码树"
- `pilot-scorecard.csv` 缺陷记录（不上传语料到 issue）
- 通过标准：零无效证据链接、幂等重放通过、导出再导入校验通过、双评审签认
- 全部通过前不新增范式 profile、不动账号/计费

---

## 四、API 契约（v2 修订版）

| 端点 | 契约 |
|---|---|
| `GET /health` | 既有 |
| `POST /api/workbench/projects` | 建项目（methodology=procedural） |
| `GET /api/workbench/projects` | 列表 |
| `POST /api/workbench/projects/:id/documents` | 建文档 + 不可变 v1 版本 + 确定性分块 |
| `GET /api/workbench/projects/:id/overview` | codes/assignments/decisions/memos 聚合 |
| `POST /api/workbench/projects/:id/analysis-runs` | 需 `Idempotency-Key`；建 `queued` 即 202；**并发同 key 幂等**；进程内异步执行 |
| `GET /api/workbench/analysis-runs/:id` | run 状态/进度/模型元数据；不含密钥 |
| `POST /api/workbench/code-assignments/:id/decision` | 追加 accept/edit/reject/defer 事件；edit 保留 AI 原文 |
| `POST /api/workbench/memos` | 人工备忘 / AI 备忘转正 |
| `PUT /api/workbench/projects/:id/saturation-assessment` | 研究者自评饱和度存档 |
| `GET /api/workbench/projects/:id/audit-export` | JSON/CSV + 完整性警告 |
| `POST /api/coding/*` | **410 Gone**（feature flag 关闭态） |

---

## 五、发布标准（v2 增补）

- 研究者能定位任一结论的确切版本与 offset。
- AI 建议与研究决策全程可区分；edit 后 AI 原文可回查。
- Provider 故障 → failed run；同幂等键重放不产生重复 run；进程重启不留僵尸 running 态。
- 任意工作区取不到他人专案/文档/run/导出。
- 界面无任何数值化自动饱和度结论。
- pilot 评审者无需取得任何提供商密钥即可查看完整审计导出。
- `/api/coding/*` 停用态 410，且旧结果仅以"legacy"身份出现在导出中。

## 六、账号/会员体系（冻结中，核心稳定后启动）

**冻结政策：** 现有自研 auth/checkin/recharge/credit/admin 五个模块：表结构与数据保留，功能不再开发，
仅在安全层面维护；README/API 文档标注"冻结，待迁移"。

**预选方案（详见 ADR-0005）：** **Casdoor**（Go 单体可自托管，管理后台开箱即用，中文生态）。
选择依据（已核实官方文档）：
- 注册页原生 "Email code / Get Code" 邮箱验证码注册/登录；
- Verification Code 扩展授权（`urn:casdoor:params:oauth:grant-type:verification-code`）：邮箱+验证码直接换 token，
  **未注册邮箱在同一步自动建号**——完美对接本项目"邮箱验证码注册登录"产品形态；
- 自带用户/应用管理后台，可承接自研 AdminPanel 大部分职责；支持微信等社交登录，为后续国内场景留路。

**备选：** Logto（OIDC 原生、邮箱验证码注册/登录同样是第一公民；若 Casdoor 集成踩坑则启用 Logto，前端 OIDC 层不变思路）。

**迁移原则（账号阶段启动时）：**
1. PostgreSQL 仍是业务数据（积分流水、订单、研究数据）唯一事实源；Casdoor 只管身份。
2. 本地 `User` 表加 `externalId` 关联 Casdoor user；首次 OIDC 登录按 email 自动关联既有账号。
3. 自研 `authMiddleware` 以薄适配层对接 OIDC token，认证端点逐步代换，期间自研登录保持可用双轨过渡。
4. 积分/充值功能在身份层稳定后才恢复开发，避免同时迁移两套系统。

## 七、执行纪律

- 每个 Task：先红测试 → 最小实现 → 全量 `npm run typecheck && npm test`（两端）→ 按计划写 commit
- 每个 Phase 收尾跑一次 server build + 手测清单
- 禁止：上传私营语料到外部服务（含 issue tracker）、在 UI 承诺自动化研究结论、未经数据边界决策接真实 provider
