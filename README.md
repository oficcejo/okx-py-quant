# OKX 量化交易机器人（多因子组合）

基于 **Python/FastAPI + React/TypeScript** 的前后端分离 OKX 量化交易系统，支持：

- **仪表盘**：账户权益曲线、最近交易等可视化监控
- **多指标择时策略**：MACD、RSI 等指标组合，支持 AND/OR 逻辑，多因子组合，多达上千种策略组合
- **回测引擎**：基于本地 K 线数据库回测策略
- **实盘执行**：按监控周期运行策略，自动调用 OKX 下单
- **AI 策略生成**：调用 OpenAI 兼容大模型（如 DeepSeek）从自然语言生成策略配置
<img width="1873" height="917" alt="image" src="https://github.com/user-attachments/assets/8233098b-fc7d-44a3-a1dc-e88e317d6479" />
<img width="1914" height="916" alt="image" src="https://github.com/user-attachments/assets/9e1e3df6-cbf2-4891-8cb8-d61f319b4e86" />
<img width="1900" height="901" alt="image" src="https://github.com/user-attachments/assets/de998470-cce5-4b01-898d-a9d1f206e438" />
<img width="1889" height="747" alt="image" src="https://github.com/user-attachments/assets/e6d93401-d57b-4570-ba5f-19203e065ed3" />





---

## 目录结构概览

后端位于 `app/`，前端位于 `frontend/`：

```text
.
├── app/                     # 后端 FastAPI 应用
│   ├── api/                 # HTTP 接口
│   │   ├── dashboard.py     # 仪表盘相关 API（权益曲线、最近交易）
│   │   ├── market.py        # K 线历史同步接口
│   │   ├── backtest.py      # 回测创建接口
│   │   ├── strategies.py    # 策略 CRUD
│   │   ├── instances.py     # 实盘实例创建/启动/停止
│   │   └── ai.py            # AI 策略生成
│   ├── core/config.py       # 配置（数据库、OKX、AI 等）
│   ├── db/                  # 数据库初始化和 Session
│   ├── models/__init__.py   # SQLAlchemy ORM 模型
│   ├── schemas/__init__.py  # Pydantic 模型
│   ├── services/            # 核心业务服务
│   │   ├── okx_client.py    # OKX API 封装（含 v5 签名）
│   │   ├── strategy_engine.py # 指标/条件评估引擎
│   │   └── backtest_engine.py # 回测引擎与指标计算
│   ├── workers/live_trading.py # 实盘调度任务（APScheduler）
│   └── main.py              # FastAPI 入口
├── frontend/                # 前端 React + Vite 应用
│   ├── src/
│   │   ├── pages/           # 各主页面
│   │   │   ├── DashboardPage.tsx   # 仪表盘
│   │   │   ├── StrategiesPage.tsx  # 策略管理
│   │   │   ├── BacktestsPage.tsx   # 回测
│   │   │   ├── LiveTradingPage.tsx # 实盘执行
│   │   │   └── AiStrategyPage.tsx  # AI 策略生成
│   │   ├── App.tsx
│   │   ├── api.ts           # axios 封装，统一请求后端
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── PLAN.md                  # 项目实现计划与阶段划分
├── requirements.txt         # 后端 Python 依赖
└── okx_quant.db             # SQLite 数据库（自动生成）
```

---

## 后端（FastAPI）快速启动

### 1. 创建并激活虚拟环境

```powershell
cd f:\test\okx-py-quant-qoder
python -m venv .venv
.venv\Scripts\Activate.ps1
```

### 2. 安装依赖

```powershell
python -m pip install -r requirements.txt
```

### 3. 初始化交易环境（重要！）

**首次使用必须先运行此脚本创建 Symbol 和账户：**

```powershell
python setup_trading.py
```

这个脚本会：
- 创建默认用户 (admin)
- 创建常用交易品种 (BTC、ETH、SOL 等)
- 配置 OKX API 账户
- 显示所有可用的 Symbol ID 和账户 ID

**示例输出：**
```
============================================================
设置完成！以下是可用的 ID：
============================================================

📊 Symbol ID（创建策略时使用）：
  - Symbol ID:  1 → BTC-USDT-SWAP        (SWAP)
  - Symbol ID:  2 → ETH-USDT-SWAP        (SWAP)
  - Symbol ID:  3 → SOL-USDT-SWAP        (SWAP)

🔑 账户 ID（实盘交易时使用）：
  - 账户 ID: 1 → OKX (API Key: YOUR_API****BCDE)
```

### 4. 配置环境变量（可选）

在项目根目录创建 `.env`（或通过系统环境变量），支持以下配置：

```env
# 数据库
DATABASE_URL=sqlite:///./okx_quant.db

# OKX API（用于实盘与历史数据，如果只做本地演示可留空）
OKX_API_KEY=your_okx_api_key
OKX_API_SECRET=your_okx_api_secret
OKX_PASSPHRASE=your_okx_passphrase
OKX_BASE_URL=https://www.okx.com

# AI 大模型（OpenAI 兼容接口，例如 DeepSeek 网关）
AI_BASE_URL=https://your-openai-compatible-endpoint
AI_API_KEY=your_ai_api_key
AI_MODEL=gpt-4
```

对应代码在 `app/core/config.py` 中读取。

### 5. 启动后端服务

```powershell
uvicorn app.main:app --reload
```

默认监听：`http://127.0.0.1:8000`

可访问：

- **接口文档**：`http://127.0.0.1:8000/docs`
- **健康检查**：`http://127.0.0.1:8000/health`

首次启动时会自动执行 `init_db()` 在 SQLite 中创建所有表。

---

## 前端（React + Vite）快速启动

> 注意：如果 `npm install` 遇到 `@swc/core` 或权限错误，请关闭占用 `node_modules` 的编辑器/终端后重试，必要时删除 `node_modules` 目录换用 `pnpm` 或 `yarn`。

### 1. 安装依赖

```powershell
cd f:\test\okx-py-quant-qoder\frontend
npm install
```

如果使用 `pnpm`：

```powershell
pnpm install
```

### 2. 启动开发服务器

```powershell
npm run dev
```

默认访问：`http://127.0.0.1:5173`

前端通过 `src/api.ts` 中的 `axios` 实例连接后端，`baseURL` 已配置为 `http://127.0.0.1:8000`。

---

## 核心功能说明

### 1. 仪表盘

页面：`DashboardPage.tsx`

- 接口：
  - `GET /dashboard/equity`：账户权益快照列表（绘制权益曲线）
  - `GET /dashboard/recent-trades`：最近实盘交易流水
- 展示：
  - 当前账户总权益 `Statistic`
  - ECharts 绘制权益曲线
  - 最近交易表格（时间、方向、价格、数量）

> 权益快照由实盘任务在每次执行后，通过 `AccountEquitySnapshot` 写入；交易记录写入 `LiveTrade`。

### 2. K 线历史数据同步

页面：`DataManagementPage.tsx`

接口：`POST /market/klines/sync`

- 请求参数：
  - `inst_id`：交易对，如 `BTC-USDT-SWAP`
  - `timeframe`：K 线周期，对应 OKX `bar` 参数，如 `1m/5m/1H/4H/1D`
  - `start_ts` / `end_ts`：时间范围（UTC）
  - `limit_per_call`：单次请求条数（1–300）
- 行为：
  - **使用 OKX `/api/v5/market/history-candles` 接口**（支持历史数据）
  - 使用 `after` 参数进行分页，从旧到新下载
  - 写入本地 `klines` 表，自动去重
  - 自动在 `symbols` 表中插入对应 `inst_id`（若不存在）

**重要更新**：
- 已修复时间范围下载问题，现在支持下载更长时间范围的历史数据
- 建议单次下载不超过 3 个月数据
- 前端增加了下载进度提示和超时处理（120秒）

这些 K 线数据是回测和部分实盘逻辑的基础。

### 3. 策略配置与管理

接口：`/strategies/*`，前端页面：`StrategiesPage.tsx`

- `GET /strategies/`：策略列表
- `GET /strategies/symbols/list`：获取所有可用交易对
- `POST /strategies/`：创建新策略
- `GET /strategies/{id}`：查看单个策略
- `PUT /strategies/{id}`：更新策略
- `DELETE /strategies/{id}`：删除策略

策略结构（核心字段）：

- `symbol_id`：交易品种（注意：实盘实例可以使用不同的品种）
- `timeframe`：K 线周期（注意：实盘实例可以使用不同的周期）
- `monitor_interval_sec`：监控周期（实盘轮询间隔，单位秒）
- `config_json`：**策略规则 JSON**，由 `StrategyRuleSet` 解析，包含：
  - `buy_groups[]`：买入条件组
  - `sell_groups[]`：卖出条件组
  - 每个条件包含：`side`、`indicator_type`（MACD/RSI/...）、`signal_type`（如 `MACD_GOLDEN_CROSS`、`RSI_OVERSOLD`）等

**重要更新**：
- 实盘实例现在支持自定义品种、周期、杠杆
- 同一个策略可以用不同的参数创建多个实例
- 例如：一个 BTC 策略可以同时在 1H 和 4H 周期运行

### 4. 回测引擎

接口：`POST /backtests/`，前端页面：`BacktestsPage.tsx`

- 请求：
  - `strategy_id`：要回测的策略 ID
  - `start_ts`，`end_ts`：回测时间窗口
  - `initial_balance`：初始资金
- 流程：
  1. 从数据库加载对应品种、周期、时间范围的 `Kline` 数据
  2. 使用 `compute_indicators` 计算 MACD、RSI 等指标列
  3. 基于 `config_json` 规则集，模拟开平仓，记录 `BacktestTrade`
  4. 生成权益曲线、交易数量等，写入 `Backtest.result_json`

前端可以看到回测记录列表，并在后续扩展中展示权益曲线等细节。

### 5. 实盘执行与调度

#### 5.1 基础架构

- **调度器**：`APScheduler`，在应用启动时由 `start_scheduler()` 启动
- **实盘实例 API**：`/instances/*`，页面：`LiveTradingPage.tsx`
  - `POST /instances/`：创建实例（现在支持自定义品种、周期、杠杆）
  - `POST /instances/{id}/start`：启动实例 → 注册周期任务
  - `POST /instances/{id}/stop`：停止实例 → 移除周期任务
  - `DELETE /instances/{id}`：删除实例（自动停止后删除）
  - `GET /instances/{id}/trades`：获取实例的所有交易记录
  - `GET /instances/{id}/summary`：获取交易统计摘要

#### 5.2 执行流程详解

核心执行逻辑在 `workers/live_trading.py` 的 `_run_strategy_instance` 中：

**步骤1：初始化**（第29-53行）
```python
# 1. 从数据库获取实例、策略、交易对信息
# 2. 验证实例状态是否为 RUNNING
# 3. 读取 .env 中的 OKX API 配置
# 4. 创建 OKX API 客户端
```

**步骤2：获取市场数据**（第56-78行）
```python
# 1. 调用 OKX API 获取最新 200 根K线
# 2. 解析时间戳、OHLCV 数据
# 3. 转换为 DataFrame 格式
# 4. 计算技术指标（MA/RSI/MACD/BOLL等）
```

**步骤3：策略判断**（第80-86行）
```python
# 1. 解析策略配置（JSON格式的规则集）
# 2. 调用 should_buy() 判断买入信号
# 3. 调用 should_sell() 判断卖出信号
```

**步骤4：持仓管理**（第88-99行）
```python
# 1. 查询历史交易记录
# 2. 计算当前净持仓（BUY 增加，SELL 减少）
# 3. 决定是否需要交易
```

**步骤5：下单执行**（第100-135行）
```python
# 交易规则：
# - 如果有买入信号 且 当前无持仓 → 市价买入 1 单位
# - 如果有卖出信号 且 当前有持仓 → 市价卖出全部
# 
# 交易记录包含：
# - 时间戳、方向（BUY/SELL）、价格、数量
# - OKX 订单ID、订单状态
# - 完整的 OKX 响应 JSON（用于调试）
```

**步骤6：记录快照**（第136-151行）
```python
# 调用 OKX API 获取账户总权益
# 保存到 account_equity_snapshots 表
# 用于后续绘制权益曲线
```

#### 5.3 调度机制

```python
# 启动实例时
start_strategy_instance(instance_id, interval_sec)
    ↓
# 注册到 APScheduler 调度器
scheduler.add_job(
    func=_run_strategy_instance,
    trigger="interval",
    seconds=interval_sec,  # 例如：60秒
    id=f"strategy-{instance_id}"
)
    ↓
# 调度器每隔 60 秒自动执行一次策略函数
```

#### 5.4 查看交易记录

**方式1：通过 Web 界面**
1. 在实盘执行页面，找到正在运行或已停止的实例
2. 点击 **"交易"** 按钮（眼睛图标）
3. 弹出窗口显示：
   - **实例信息**：策略名称、交易对、周期、杠杆、状态
   - **交易统计**：总交易次数、买入/卖出次数、当前持仓
   - **最近10条交易**：时间、方向、价格、数量、状态

**方式2：通过 API**
```python
# 获取交易摘要
GET /instances/{instance_id}/summary

# 获取所有交易记录
GET /instances/{instance_id}/trades
```

#### 5.5 实时监控流程

1. **启动策略实例**
   - 点击"启动"按钮
   - 实例状态变为 `RUNNING`（绿色标签）
   - 后台每 N 秒自动执行一次策略（N = 策略的监控间隔）

2. **查看交易过程**
   - 点击"交易"按钮
   - 查看实时统计和交易记录
   - 了解当前持仓状态

3. **停止策略实例**
   - 点击"停止"按钮
   - 调度器停止执行
   - 实例状态变为 `STOPPED`

4. **删除实例**
   - 点击"删除"按钮
   - 如果正在运行会先自动停止
   - 从数据库中删除实例记录

### 6. AI 策略生成

接口：`POST /ai/generate-strategy`，页面：`AiStrategyPage.tsx`

- 调用 OpenAI 兼容大模型（例如 DeepSeek 网关），输入自然语言描述
- 要求模型输出符合约定 schema 的 JSON 策略配置（包含指标/信号/条件组）
- 前端展示 JSON，并可一键“保存为策略”并用于回测和实盘

---

## OKX 客户端与签名说明

文件：`app/services/okx_client.py`

- 使用 `httpx.AsyncClient` 封装 OKX v5 接口
- 签名逻辑：
  - 时间戳：`ISO8601`，毫秒精度，UTC，形如 `2025-01-01T12:00:00.123Z`
  - 签名串：`timestamp + method + requestPath + body`
  - 算法：`HMAC-SHA256(secret, message)` → `base64` 编码
- 提供方法：
  - `get_account_overview()` → `/api/v5/account/balance`
  - `get_candles(inst_id, bar, limit, before, after)` → `/api/v5/market/candles`
  - `place_order(inst_id, side, sz, ordType, **extra)` → `/api/v5/trade/order`
    - **内部自动注入**：`"tag": "c314b0aecb5bBCDE"`

---

## 安全与注意事项

- 本项目用于学习和策略研发示例，**强烈建议在模拟盘或小资金环境下测试**，确认策略逻辑正确后再逐步放大资金。
- 请妥善保管 OKX API 密钥，建议：
  - 使用只读/交易权限的 API Key，禁用提币权限
  - 不要将 `.env` 提交到版本管理
- AI 生成的策略仅供参考，务必结合实际回测结果与风控规则进行审慎评估。

---

# 后续可扩展方向

- 扩展更多技术指标（KDJ、BOLL、MA 组合、CCI、K 线形态识别等）
- 增强回测分析：最大回撤、夏普比、分布统计等
- 增加风控模块：日内最大亏损、单笔最大亏损、仓位限制
- 增加多账户、多交易所支持
- 完善前端样式和交互，增加暗色主题、自定义仪表盘组件

---

## 详细使用说明

### 一、核心概念理解

#### 1. Symbol（交易品种）与 Symbol ID

**什么是 Symbol？**
- Symbol 代表一个具体的交易品种，比如 `BTC-USDT-SWAP`（BTC永续合约）
- 每个 Symbol 在数据库中都有一个唯一的 ID
- Symbol 包含以下信息：
  - `inst_id`: 品种代码（如 BTC-USDT-SWAP）
  - `exchange_name`: 交易所名称（如 OKX）
  - `inst_type`: 合约类型（SWAP/SPOT）
  - `base_ccy`: 基础币种（如 BTC）
  - `quote_ccy`: 计价币种（如 USDT）

**如何获取 Symbol ID？**

方法一：通过数据库查看
```python
# 运行 Python 脚本查询
from app.db.session import SessionLocal
from app.models import Symbol

db = SessionLocal()
symbols = db.query(Symbol).all()
for s in symbols:
    print(f"ID: {s.id}, 品种: {s.inst_id}")
db.close()
```

方法二：手动添加 Symbol
```python
from app.db.session import SessionLocal
from app.models import Symbol

db = SessionLocal()

# 添加 BTC 永续合约
btc_swap = Symbol(
    exchange_name="OKX",
    inst_id="BTC-USDT-SWAP",
    base_ccy="BTC",
    quote_ccy="USDT",
    inst_type="SWAP",
    is_active=True
)
db.add(btc_swap)
db.commit()
print(f"BTC-USDT-SWAP 的 Symbol ID: {btc_swap.id}")

# 添加 ETH 永续合约
eth_swap = Symbol(
    exchange_name="OKX",
    inst_id="ETH-USDT-SWAP",
    base_ccy="ETH",
    quote_ccy="USDT",
    inst_type="SWAP"
)
db.add(eth_swap)
db.commit()
print(f"ETH-USDT-SWAP 的 Symbol ID: {eth_swap.id}")

db.close()
```

**实际例子：**
```
ID: 1, 品种: BTC-USDT-SWAP
ID: 2, 品种: ETH-USDT-SWAP
ID: 3, 品种: SOL-USDT-SWAP
```

所以创建策略时，如果要交易 BTC，就填写 `symbol_id: 1`

---

#### 2. Exchange Account（交易账户）与账户 ID

**什么是 Exchange Account？**
- Exchange Account 代表你在交易所（OKX）的 API 账户
- 包含 API Key、Secret、Passphrase 等敏感信息
- 用于实盘交易时调用 OKX API

**如何创建账户？**

```python
from app.db.session import SessionLocal
from app.models import ExchangeAccount, User

db = SessionLocal()

# 1. 首先确保有用户（如果没有，先创建）
user = db.query(User).filter(User.id == 1).first()
if not user:
    from passlib.hash import bcrypt
    user = User(
        username="admin",
        password_hash=bcrypt.hash("admin123")
    )
    db.add(user)
    db.commit()

# 2. 创建交易账户
account = ExchangeAccount(
    user_id=1,
    exchange_name="OKX",
    api_key="你的OKX API Key",
    api_secret="你的OKX API Secret",
    passphrase="你的OKX API Passphrase",
    is_active=True
)
db.add(account)
db.commit()
print(f"交易账户 ID: {account.id}")

db.close()
```

**查看已有账户：**
```python
from app.db.session import SessionLocal
from app.models import ExchangeAccount

db = SessionLocal()
accounts = db.query(ExchangeAccount).all()
for acc in accounts:
    print(f"ID: {acc.id}, 用户: {acc.user_id}, 交易所: {acc.exchange_name}")
db.close()
```

**实际例子：**
```
ID: 1, 用户: 1, 交易所: OKX
ID: 2, 用户: 1, 交易所: OKX  # 备用账户
```

---

### 二、完整使用流程示例

#### 步骤1：准备交易品种和账户

创建脚本 `setup_trading.py`：

```python
from app.db.session import SessionLocal
from app.models import Symbol, ExchangeAccount, User
from passlib.hash import bcrypt

def setup():
    db = SessionLocal()
    
    # 1. 创建用户
    user = db.query(User).filter(User.username == "admin").first()
    if not user:
        user = User(
            username="admin",
            password_hash=bcrypt.hash("admin123")
        )
        db.add(user)
        db.commit()
        print(f"✅ 创建用户: admin (ID: {user.id})")
    
    # 2. 创建交易品种
    symbols = [
        {"inst_id": "BTC-USDT-SWAP", "base": "BTC", "quote": "USDT"},
        {"inst_id": "ETH-USDT-SWAP", "base": "ETH", "quote": "USDT"},
    ]
    
    for s in symbols:
        existing = db.query(Symbol).filter(Symbol.inst_id == s["inst_id"]).first()
        if not existing:
            symbol = Symbol(
                exchange_name="OKX",
                inst_id=s["inst_id"],
                base_ccy=s["base"],
                quote_ccy=s["quote"],
                inst_type="SWAP"
            )
            db.add(symbol)
            db.commit()
            print(f"✅ 创建品种: {symbol.inst_id} (Symbol ID: {symbol.id})")
    
    # 3. 创建交易账户
    account = db.query(ExchangeAccount).filter(ExchangeAccount.user_id == user.id).first()
    if not account:
        account = ExchangeAccount(
            user_id=user.id,
            exchange_name="OKX",
            api_key="YOUR_API_KEY",  # 替换为真实的
            api_secret="YOUR_API_SECRET",
            passphrase="YOUR_PASSPHRASE",
            is_active=True
        )
        db.add(account)
        db.commit()
        print(f"✅ 创建交易账户 (账户 ID: {account.id})")
    
    # 4. 显示汇总信息
    print("\n" + "=" * 60)
    print("设置完成！以下是可用的 ID：")
    print("=" * 60)
    
    symbols = db.query(Symbol).all()
    print("\n📊 Symbol ID（创建策略时使用）：")
    for s in symbols:
        print(f"  - Symbol ID: {s.id} -> {s.inst_id}")
    
    accounts = db.query(ExchangeAccount).all()
    print("\n🔑 账户 ID（实盘交易时使用）：")
    for acc in accounts:
        print(f"  - 账户 ID: {acc.id} -> {acc.exchange_name}")
    
    db.close()

if __name__ == "__main__":
    setup()
```

运行：
```bash
python setup_trading.py
```

输出示例：
```
✅ 创建用户: admin (ID: 1)
✅ 创建品种: BTC-USDT-SWAP (Symbol ID: 1)
✅ 创建品种: ETH-USDT-SWAP (Symbol ID: 2)
✅ 创建交易账户 (账户 ID: 1)

============================================================
设置完成！以下是可用的 ID：
============================================================

📊 Symbol ID（创建策略时使用）：
  - Symbol ID: 1 -> BTC-USDT-SWAP
  - Symbol ID: 2 -> ETH-USDT-SWAP

🔑 账户 ID（实盘交易时使用）：
  - 账户 ID: 1 -> OKX
```

---

#### 步骤2：使用可视化构建器创建策略

1. 访问 `http://127.0.0.1:5173/strategies`
2. 点击"可视化构建器"
3. 填写基本信息：
   ```
   策略名称: BTC多指标组合策略
   Symbol ID: 1  # ← 这里填写 BTC-USDT-SWAP 的 ID
   K线周期: 1H
   杠杆倍数: 1
   监控周期: 60秒
   ```
4. 配置买入条件（例如）：
   - MACD 金叉
   - RSI 超卖（阈值30）
5. 配置卖出条件（例如）：
   - MACD 死叉
   - RSI 超买（阈值70）
6. 保存策略（假设生成的策略 ID 为 5）

---

#### 步骤3：同步历史K线数据（用于回测）

```python
import requests
from datetime import datetime, timedelta

BASE_URL = "http://127.0.0.1:8000"

# 同步 BTC 1小时K线（最近7天）
payload = {
    "inst_id": "BTC-USDT-SWAP",
    "timeframe": "1H",
    "start_ts": (datetime.now() - timedelta(days=7)).isoformat(),
    "end_ts": datetime.now().isoformat(),
    "limit_per_call": 100
}

response = requests.post(f"{BASE_URL}/market/klines/sync", json=payload)
print(response.json())
# 输出: {"inserted": 168}  # 7天 * 24小时
```

---

#### 步骤4：运行回测

```python
import requests
from datetime import datetime, timedelta

BASE_URL = "http://127.0.0.1:8000"

payload = {
    "strategy_id": 5,  # ← 你的策略 ID
    "start_ts": (datetime.now() - timedelta(days=7)).isoformat(),
    "end_ts": datetime.now().isoformat(),
    "initial_balance": 10000.0
}

response = requests.post(f"{BASE_URL}/backtests/", json=payload)
result = response.json()

print(f"回测ID: {result['id']}")
print(f"状态: {result['status']}")
print(f"结果: {result['result_json']}")
```

或通过前端：
1. 访问 `http://127.0.0.1:5173/backtests`
2. 选择策略 ID: 5
3. 选择时间范围
4. 设置初始资金：10000
5. 点击"运行回测"

---

#### 步骤5：创建实盘交易实例

```python
import requests

BASE_URL = "http://127.0.0.1:8000"

# 创建实盘实例
response = requests.post(
    f"{BASE_URL}/instances/",
    params={
        "strategy_id": 5,  # ← 策略 ID
        "exchange_account_id": 1  # ← 账户 ID
    }
)

instance = response.json()
print(f"实盘实例 ID: {instance['id']}")
print(f"状态: {instance['status']}")

# 启动实盘交易
instance_id = instance['id']
response = requests.post(f"{BASE_URL}/instances/{instance_id}/start")
print("✅ 实盘交易已启动！")

# 停止实盘交易
# response = requests.post(f"{BASE_URL}/instances/{instance_id}/stop")
```

或通过前端：
1. 访问 `http://127.0.0.1:5173/live`
2. 点击"新建实例"
3. 填写：
   ```
   策略 ID: 5  # ← 你创建的策略
   账户 ID: 1  # ← 你的OKX账户
   ```
4. 点击"启动"

---

### 三、常见问题

**Q1: 如何知道我的 Symbol ID 是多少？**

A: 运行以下脚本查询：
```python
from app.db.session import SessionLocal
from app.models import Symbol

db = SessionLocal()
symbols = db.query(Symbol).all()
for s in symbols:
    print(f"Symbol ID: {s.id} = {s.inst_id}")
db.close()
```

**Q2: 如何获取我的账户 ID？**

A: 运行以下脚本查询：
```python
from app.db.session import SessionLocal
from app.models import ExchangeAccount

db = SessionLocal()
accounts = db.query(ExchangeAccount).all()
for acc in accounts:
    print(f"账户 ID: {acc.id}")
db.close()
```

**Q3: 实盘交易需要注意什么？**

A: 
1. ⚠️ 确保 `.env` 文件中配置了正确的 OKX API 密钥
2. ⚠️ 建议先在模拟盘测试
3. ⚠️ 小资金开始，验证策略有效性
4. ⚠️ 设置好止损和风控参数

**Q4: 策略的 Symbol ID 和实盘的账户 ID 有什么关系？**

A: 
- **Symbol ID**: 决定交易什么品种（如BTC、ETH）
- **账户 ID**: 决定用哪个账户的资金交易
- 同一个策略可以用不同的账户执行
- 同一个账户可以执行多个策略

**示例关系图：**
```
策略1 (Symbol ID: 1 = BTC) ──┐
                            ├─→ 实盘实例1 (账户 ID: 1)
策略2 (Symbol ID: 2 = ETH) ──┘

策略3 (Symbol ID: 1 = BTC) ────→ 实盘实例2 (账户 ID: 2)
```

---

### 四、快速开始脚本

将以上步骤整合成一个完整脚本 `quick_start.py`：

```python
"""
快速开始：一键设置环境并创建示例策略
"""
from app.db.session import SessionLocal
from app.models import Symbol, ExchangeAccount, User
from passlib.hash import bcrypt
import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def quick_start():
    db = SessionLocal()
    
    print("🚀 开始快速设置...\n")
    
    # 1. 创建用户
    user = db.query(User).first()
    if not user:
        user = User(username="admin", password_hash=bcrypt.hash("admin123"))
        db.add(user)
        db.commit()
    print(f"✅ 用户 ID: {user.id}")
    
    # 2. 创建BTC品种
    btc = db.query(Symbol).filter(Symbol.inst_id == "BTC-USDT-SWAP").first()
    if not btc:
        btc = Symbol(
            exchange_name="OKX",
            inst_id="BTC-USDT-SWAP",
            base_ccy="BTC",
            quote_ccy="USDT",
            inst_type="SWAP"
        )
        db.add(btc)
        db.commit()
    print(f"✅ BTC Symbol ID: {btc.id}")
    
    # 3. 创建账户（请修改为真实API密钥）
    account = db.query(ExchangeAccount).filter(ExchangeAccount.user_id == user.id).first()
    if not account:
        account = ExchangeAccount(
            user_id=user.id,
            exchange_name="OKX",
            api_key="YOUR_API_KEY",
            api_secret="YOUR_SECRET",
            passphrase="YOUR_PASSPHRASE"
        )
        db.add(account)
        db.commit()
    print(f"✅ 账户 ID: {account.id}")
    
    db.close()
    
    # 4. 创建示例策略
    strategy_config = {
        "buy_groups": [{
            "logic": "AND",
            "conditions": [
                {"side": "BUY", "indicator_type": "MACD", "signal_type": "MACD_GOLDEN_CROSS", "params": {}},
                {"side": "BUY", "indicator_type": "RSI", "signal_type": "RSI_OVERSOLD", "params": {"threshold": 30}}
            ]
        }],
        "sell_groups": [{
            "logic": "OR",
            "conditions": [
                {"side": "SELL", "indicator_type": "MACD", "signal_type": "MACD_DEAD_CROSS", "params": {}},
                {"side": "SELL", "indicator_type": "RSI", "signal_type": "RSI_OVERBOUGHT", "params": {"threshold": 70}}
            ]
        }]
    }
    
    payload = {
        "name": "快速开始示例策略",
        "description": "MACD金叉+RSI超卖买入，MACD死叉或RSI超买卖出",
        "symbol_id": btc.id,
        "timeframe": "1H",
        "leverage": 1.0,
        "monitor_interval_sec": 60,
        "config_json": json.dumps(strategy_config)
    }
    
    try:
        response = requests.post(f"{BASE_URL}/strategies/", json=payload)
        strategy = response.json()
        print(f"✅ 策略 ID: {strategy['id']}")
        
        print("\n" + "="*60)
        print("✅ 设置完成！请记住以下 ID：")
        print("="*60)
        print(f"Symbol ID (BTC): {btc.id}")
        print(f"账户 ID: {account.id}")
        print(f"策略 ID: {strategy['id']}")
        print("\n下一步：")
        print("1. 访问 http://127.0.0.1:5173/strategies 查看策略")
        print("2. 使用可视化构建器创建更多策略")
        print("3. 运行回测验证策略")
        print("4. 配置真实API后启动实盘交易")
        
    except Exception as e:
        print(f"❌ 创建策略失败: {e}")

if __name__ == "__main__":
    quick_start()
```

运行：
```bash
python quick_start.py
```

---

## 更新日志

### v1.2.0 (2025-12-29)

#### 新增功能
1. **实盘交易记录查看**
   - 在实盘执行页面添加"交易"按钮
   - 点击后显示弹窗，展示：
     - 实例基本信息（策略、品种、周期、杠杆、状态）
     - 交易统计（总次数、买入/卖出次数、当前持仓）
     - 最近10条交易详情（时间、方向、价格、数量、状态）
   - 新增 API：
     - `GET /instances/{id}/summary` - 获取交易摘要
     - `GET /instances/{id}/trades` - 获取所有交易记录

2. **实盘实例删除功能**
   - 在实盘执行页面添加"删除"按钮
   - 带确认对话框，防止误删
   - 自动处理正在运行的实例（先停止再删除）
   - 新增 API：`DELETE /instances/{id}`

3. **实盘实例自定义参数**
   - 创建实例时可以指定：
     - `symbol_id`：交易品种（不必与策略一致）
     - `timeframe`：K线周期（不必与策略一致）
     - `leverage`：杠杆倍数（1-125）
   - 同一策略可以创建多个不同参数的实例
   - 例如：一个 BTC 策略可同时在 1H 和 4H 周期运行

#### 修复问题
1. **K线数据下载时间范围修复**
   - 修复之前只能下载最近13天数据的问题
   - 切换到 OKX `/api/v5/market/history-candles` 接口
   - 使用 `after` 参数代替 `before` 参数
   - 现在支持下载更长时间范围的历史数据（建议不超过3个月）
   - 增加最大请求次数到100次

2. **实盘执行页面选择框修复**
   - 修复策略和交易品种选择框为空的问题
   - 调整 FastAPI 路由顺序，将 `/symbols/list` 放在 `/{strategy_id}` 之前
   - 修复 `StrategyInstance` Schema 字段不匹配问题
   - 新增 API：`GET /strategies/symbols/list`

3. **前端 API 超时优化**
   - 将超时时间从 10秒 增加到 120秒
   - 添加下载进度提示
   - 添加 Loading 状态提示

#### 优化改进
1. **用户体验提升**
   - 所有删除操作增加确认对话框
   - 添加更详细的错误提示
   - 添加更多 console.log 调试信息

2. **代码质量提升**
   - 添加更多注释说明
   - 优化错误处理逻辑
   - 添加更多调试日志

3. **文档完善**
   - 更新 README，添加详细的实盘执行流程说明
   - 添加交易记录查看功能说明
   - 添加更新日志

### v1.1.0 (2025-12-28)
- 初始版本发布
- 基础策略管理功能
- 回测引擎
- 实盘执行基础功能
- AI 策略生成

---
