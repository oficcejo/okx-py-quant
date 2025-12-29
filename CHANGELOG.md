# 更新日志

## v2.1.0 (2025-12-28)

### 🎉 新功能

#### 1. 策略管理页面改进
- ✅ Symbol ID 改为下拉选择（支持搜索）
- ✅ K线周期改为下拉选择
- ✅ 杠杆倍数增加最大值限制（125倍）
- ✅ 自动加载可用交易对列表

**变更影响:**
- 创建/编辑策略时更加直观
- 不再需要记住 Symbol ID

---

#### 2. 策略回测增强
- ✅ 自动检测本地K线数据
- ✅ 显示数据可用性提示（绿色/黄色警告）
- ✅ 提示用户前往数据管理页面下载数据
- ✅ 显示数据时间范围和条数

**使用流程:**
1. 选择策略
2. 系统自动检查是否有对应周期的K线数据
3. 如果有数据，显示绿色提示框
4. 如果没有数据，显示黄色警告并提供下载链接
5. 运行回测时自动使用本地数据

**示例提示:**
```
✅ 本地数据可用
📊 交易对: BTC-USDT-SWAP  周期: 1H  数据条数: 168
📅 时间范围: 2025-12-21 00:00 ~ 2025-12-28 00:00
```

---

#### 3. 实盘执行逻辑重构

**重大变更:** 实盘实例现在可以独立配置币种、周期和杠杆！

**新增字段:**
- `symbol_id` - 实际交易的品种（独立于策略）
- `timeframe` - 实际使用的K线周期（独立于策略）
- `leverage` - 杠杆倍数（独立于策略）

**优势:**
- ✅ 同一个策略可以用于不同币种
- ✅ 同一个策略可以用于不同周期
- ✅ 灵活调整杠杆倍数
- ✅ 降低策略耦合度

**创建实例时需要填写:**
1. 策略（选择策略逻辑）
2. 交易品种（选择要交易的币种）
3. K线周期（选择监控周期）
4. 杠杆倍数（1-125倍）

**示例场景:**
```
场景1: 同一个MACD策略，分别交易BTC和ETH
- 实例1: 策略A + BTC-USDT-SWAP + 1H + 1x杠杆
- 实例2: 策略A + ETH-USDT-SWAP + 1H + 2x杠杆

场景2: 同一个策略，在不同周期测试
- 实例1: 策略A + BTC-USDT-SWAP + 1H + 1x杠杆
- 实例2: 策略A + BTC-USDT-SWAP + 4H + 1x杠杆
```

---

### 🔧 技术变更

#### 后端修改:

**1. 数据库表变更**
```python
# strategy_instances 表新增字段
symbol_id: int  # 实际交易的品种ID
timeframe: str  # 实际使用的K线周期
leverage: float # 杠杆倍数
```

**2. API变更**
```python
# POST /instances/
# 之前: 只需要 strategy_id
# 现在: 需要 strategy_id, symbol_id, timeframe, leverage

@router.post("/")
def create_instance(
    strategy_id: int,
    symbol_id: int,
    timeframe: str,
    leverage: float = 1.0,
    db: Session = Depends(get_db)
):
    ...
```

**3. 实盘执行逻辑**
```python
# 之前: 使用 strategy.symbol_id 和 strategy.timeframe
symbol = db.query(Symbol).filter(Symbol.id == strategy.symbol_id).first()
candles = await client.get_candles(symbol.inst_id, strategy.timeframe)

# 现在: 使用 instance.symbol_id 和 instance.timeframe
symbol = db.query(Symbol).filter(Symbol.id == instance.symbol_id).first()
candles = await client.get_candles(symbol.inst_id, instance.timeframe)
```

#### 前端修改:

**1. StrategiesPage.tsx**
- 加载 Symbol 列表
- Symbol ID 改为 Select 下拉
- Timeframe 改为 Select 下拉
- 支持搜索过滤

**2. BacktestsPage.tsx**
- 加载 K线数据统计
- 监听策略选择变化
- 显示数据可用性提示
- 提供数据管理链接

**3. LiveTradingPage.tsx**
- 加载 Symbol 列表
- 表单改为垂直布局（更多字段）
- 新增 symbol_id 选择
- 新增 timeframe 选择
- 新增 leverage 输入
- 实例列表显示完整信息

---

### 📊 数据迁移

**如果已有旧版本实例数据:**

```sql
-- 需要为现有实例添加默认值
UPDATE strategy_instances 
SET 
  symbol_id = (SELECT symbol_id FROM strategies WHERE id = strategy_instances.strategy_id),
  timeframe = (SELECT timeframe FROM strategies WHERE id = strategy_instances.strategy_id),
  leverage = 1.0
WHERE symbol_id IS NULL;
```

**或者简单删除旧数据重新创建:**
```sql
DELETE FROM strategy_instances;
```

---

### 🎯 使用示例

#### 创建策略（策略管理页面）

**之前:**
```
Symbol ID: [输入数字1]
周期: [输入文本 "1H"]
```

**现在:**
```
交易品种: [下拉选择] BTC-USDT-SWAP - BTC/USDT (SWAP)
K线周期: [下拉选择] 1小时
杠杆倍数: [输入] 1
```

---

#### 运行回测（策略回测页面）

**步骤:**
1. 选择策略
2. **自动检测数据** ← 新功能！
   - 有数据: 显示绿色提示
   - 无数据: 显示黄色警告 + 下载链接
3. 选择时间范围
4. 输入初始资金
5. 运行回测

**数据提示示例:**
```
✅ 本地数据可用
📊 交易对: BTC-USDT-SWAP | 周期: 1H | 数据条数: 168
📅 时间范围: 2025-12-21 00:00 ~ 2025-12-28 00:00
```

```
⚠️ 未找到本地数据
请先在 数据管理 页面下载 1H 周期的K线数据。
否则回测将失败。
```

---

#### 创建实盘实例（实盘执行页面）

**之前:**
```
策略: [选择策略A]
[创建实例]
```

**现在:**
```
策略: [选择策略A]
交易品种: [BTC-USDT-SWAP]  ← 新增
K线周期: [1H]              ← 新增
杠杆倍数: [1]              ← 新增
[创建实盘实例]
```

**实例列表显示:**
```
ID | 策略ID | 品种ID | 周期 | 杠杆 | 状态   | 操作
1  | 5      | 1      | 1H   | 1x   | RUNNING | [启动] [停止]
2  | 5      | 2      | 1H   | 2x   | STOPPED | [启动] [停止]
```

---

### ⚠️ 注意事项

1. **数据库变更**: 需要删除旧数据库或手动更新字段
   ```bash
   # 方法1: 删除重建（推荐）
   rm okx_quant.db
   python -c "from app.db.init_db import init_db; init_db()"
   python init_symbols.py
   
   # 方法2: 手动SQL更新（高级用户）
   # 见上方SQL语句
   ```

2. **已有实例**: 旧版本创建的实例需要重新创建

3. **策略逻辑**: 策略本身不变，只是实例执行时可以覆盖配置

4. **回测提示**: 首次使用需要先在"数据管理"下载K线数据

---

### 🚀 升级步骤

```bash
# 1. 备份数据（如果需要）
cp okx_quant.db okx_quant.db.backup

# 2. 更新代码
git pull origin main

# 3. 激活虚拟环境
.venv\Scripts\Activate.ps1

# 4. 更新依赖
pip install -r requirements.txt

# 5. 重建数据库（推荐）
rm okx_quant.db
python -c "from app.db.init_db import init_db; init_db()"
python init_symbols.py

# 6. 更新前端依赖
cd frontend
npm install
cd ..

# 7. 重启服务
# 后端
uvicorn app.main:app --reload

# 前端（新终端）
cd frontend
npm run dev
```

---

### 📚 相关文档

- [完整README](./README.md)
- [新功能说明](./UPDATES.md)
- [API文档](http://127.0.0.1:8000/docs)

---

**版本**: v2.1.0  
**发布日期**: 2025-12-28  
**作者**: Qoder AI Assistant
