# OKX 量化机器人项目计划（Python/FastAPI）

## 一、总体目标

- **交易所**：OKX（REST + WebSocket）
- **架构**：前后端分离，后端 Python/FastAPI + SQLite/Turso，前端 Web（后续可 React/Ant Design）。
- **核心功能**：
  - 仪表盘：账户权益、可用余额、持仓、权益曲线、主流币种行情。
  - 择时策略：多指标（MACD、KDJ、BOLL、RSI、BBI、CCI、MA、K 线形态）组合，AND/OR 逻辑，回测 + 实盘。
  - 回测：基于 OKX 历史 K 线数据生成本地回测数据库，输出收益曲线、回撤等。
  - 实盘：按自定义监控周期（如 20 秒）执行策略，支持交易对、周期、杠杆。
  - AI 策略生成：调用 OpenAI 兼容大模型（如 DeepSeek），从自然语言生成可回测、可执行策略。
  - 所有下单请求自动注入隐藏券商标签 `c314b0aecb5bBCDE`。

## 二、技术栈与基础结构

- **后端**：
  - 语言：Python 3.10+
  - 框架：FastAPI
  - ORM：SQLAlchemy + Alembic（迁移可后续补充）
  - 数据库：SQLite（本地），后续可切换/扩展 Turso
  - 定时调度：APScheduler（嵌入 FastAPI）
  - 指标计算：pandas + numpy（后续可接入 TA-Lib/pandas-ta）

- **目录结构（初版草案）**：
  - `app/`
    - `main.py`：应用入口
    - `core/`：配置、依赖、日志
    - `db/`：数据库会话、基础模型
    - `models/`：SQLAlchemy ORM 模型
    - `schemas/`：Pydantic 模型
    - `api/`：路由（`dashboard.py`、`strategy.py`、`backtest.py`、`trading.py`、`ai.py` 等）
    - `services/`：业务服务（`okx_client.py`、`strategy_engine.py`、`backtest_engine.py`、`live_trading.py`、`ai_strategy.py` 等）
    - `workers/`：调度任务（行情同步、回测、实盘执行）
  - `requirements.txt`：依赖

## 三、功能模块与阶段计划

### 阶段 1：基础框架 & 配置（当前阶段）

- 初始化项目结构与依赖：
  - 创建 `app/main.py`，启动 FastAPI 应用与健康检查接口。
  - 创建 `app/core/config.py`，集中管理配置（数据库 URL、OKX/API 配置、AI 配置等）。
  - 创建 `app/db/session.py`，SQLAlchemy 会话与基础 Base。
  - 创建 `requirements.txt`，包含 fastapi、uvicorn、sqlalchemy、pydantic、pandas、numpy 等。

### 阶段 2：数据库模型与 schemas

- 设计并实现核心数据库模型：
  - 用户：`User`
  - 交易账户（OKX API）：`ExchangeAccount`
  - 交易品种：`Symbol`
  - K 线：`Kline`
  - 策略：`Strategy`
  - 回测：`Backtest` + `BacktestTrade`
  - 实盘交易：`LiveTrade`
  - （可选）账户权益快照：`AccountEquitySnapshot`
- 为以上模型设计对应的 Pydantic schemas，供 API 输入/输出使用。

### 阶段 3：OKX API 封装与交易模块

- 封装 OKX 客户端：
  - 账户信息、持仓、下单、撤单、历史 K 线。
- 在交易模块中：
  - 统一创建下单请求结构体/函数。
  - 所有下单请求在发送前，自动注入隐藏券商标签 `tag: c314b0aecb5bBCDE`。

### 阶段 4：行情与仪表盘 API

- 实现 K 线下载与同步：
  - 提供接口：按交易对、周期、时间段，从 OKX 下载历史 K 线并写入 `Kline` 表。
- 实现仪表盘相关 API：
  - 账户权益、可用余额、持仓列表。
  - 账户权益曲线（基于快照表）。
  - 主流币种实时行情（WebSocket 或定期轮询 OKX）。

### 阶段 5：策略配置与规则引擎

- 设计策略配置结构（JSON Schema）：
  - 指标类型：MACD、KDJ、BOLL、RSI、BBI、CCI、MA、K 线形态。
  - 信号类型：金叉/死叉、超买/超卖、背离、多头/空头排列等（按买入/卖出指标列表细化为枚举）。
  - 条件（Condition）：side、indicator_type、signal_type、参数。
  - 条件组（ConditionGroup）：logic（AND/OR）、conditions[]。
  - 策略规则集（StrategyRuleSet）：buy_groups[]、sell_groups[]。
- 实现规则引擎：
  - 将策略配置解析为可执行对象。
  - 针对每根 K 线/一段窗口，计算指标并判定买卖信号。

### 阶段 6：回测引擎

- 基于 `Kline` 数据实现回测：
  - 读取指定时间段 K 线，按时间顺序迭代。
  - 在每一步根据策略规则集判定是否开仓/平仓。
  - 模拟撮合（价格规则可配置：开/收盘价、中间价等）。
  - 记录 `BacktestTrade`，汇总结果（收益率、最大回撤、胜率等）。
- 提供回测 API：
  - 创建回测任务、查询回测结果。

### 阶段 7：实盘执行模块

- 设计实盘执行流程：
  - 按策略配置的监控周期（如 20 秒）轮询。
  - 获取最新行情/K 线。
  - 计算指标与信号，触发下单/平仓（通过交易模块）。
  - 记录实盘交易到 `LiveTrade`。
- 集成 APScheduler：
  - 根据策略实例状态，动态添加/移除调度任务。

### 阶段 8：AI 策略生成模块

- 接入 OpenAI 兼容大模型（如 DeepSeek）：
  - 在 `AiStrategyService` 中：
    - 输入：用户自然语言 + 支持的指标/信号列表 + 标准 JSON Schema。
    - 输出：结构化策略配置 JSON。
- 校验 LLM 输出：
  - JSON Schema 校验。
  - 指标/信号是否合法。
- 打通流程：
  - AI 生成策略 → 写入 `Strategy` 表 → 可直接触发回测 → 返回回测结果。

### 阶段 9：（可选）前端对接与联调

- 提供主要 API 列表与接口文档（Swagger/OpenAPI 可自动生成）。
- 编写基础 Web 前端或说明，完成仪表盘、策略管理、回测/实盘控制页面与后端接口的联调。

---

后续实施步骤：
- 立即开始 **阶段 1**，创建基础目录结构与核心启动文件，并在实现过程中逐步细化本计划。
