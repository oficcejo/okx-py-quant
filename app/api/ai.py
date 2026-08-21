from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models import Strategy, Symbol
from app.services.strategy_engine import IndicatorType, SignalType, LogicOp, Side

router = APIRouter(prefix="/ai", tags=["ai"])

SYSTEM_PROMPT = """你是一个专业的OKX多因子量化交易策略生成助手。你的任务是将用户的自然语言描述转换为系统支持的标准策略配置 JSON。

你必须严格输出如下结构的合法 JSON 对象（不要添加 markdown 格式标记）：
{
  "name": "策略名称（简明扼要，如：BTC 1H MACD金叉+RSI超卖策略）",
  "description": "策略逻辑详细描述",
  "symbol_suggest": "BTC-USDT-SWAP", // 建议品种：例如 BTC-USDT-SWAP, ETH-USDT-SWAP, SOL-USDT-SWAP
  "timeframe": "1H", // 建议周期：只能从以下选项选择：1m, 5m, 15m, 30m, 1H, 4H, 1D
  "leverage": 1.0, // 建议杠杆（1-125）
  "monitor_interval_sec": 60, // 监控轮询间隔秒数（默认60）
  "stop_loss_pct": 2.0, // 建议止损比例（如2.0代表2%，无则null）
  "take_profit_pct": 5.0, // 建议止盈比例（如5.0代表5%，无则null）
  "trailing_stop_pct": 1.5, // 建议移动追踪止损（如1.5代表1.5%，无则null）
  "config_json": {

    "buy_groups": [
      {
        "logic": "AND", // 条件组内部逻辑："AND" 或 "OR"
        "conditions": [
          {
            "side": "BUY",
            "indicator_type": "MACD",
            "signal_type": "MACD_GOLDEN_CROSS",
            "params": {}
          }
        ]
      }
    ],
    "sell_groups": [
      {
        "logic": "AND", // 条件组内部逻辑："AND" 或 "OR"
        "conditions": [
          {
            "side": "SELL",
            "indicator_type": "RSI",
            "signal_type": "RSI_OVERBOUGHT",
            "params": {"threshold": 70}
          }
        ]
      }
    ]
  }
}

【系统支持的指标 indicator_type 与 信号 signal_type 清单】（必须严格从以下枚举中选取）：
1. MACD:
   - MACD_GOLDEN_CROSS (MACD金叉)
   - MACD_DEAD_CROSS (MACD死叉)
   - MACD_ABOVE_ZERO (MACD零轴上方)
   - MACD_BELOW_ZERO (MACD零轴下方)
   - MACD_BULLISH_ARRANGE (MACD多头排列)
   - MACD_BEARISH_ARRANGE (MACD空头排列)
   - MACD_DOUBLE_GOLDEN (MACD二次金叉)
   - MACD_LOW_GOLDEN (MACD低位金叉)
   - MACD_BOTTOM_DIVERGENCE (MACD底背离)
   - MACD_TOP_DIVERGENCE (MACD顶背离)
2. RSI:
   - RSI_OVERSOLD (RSI超卖，params: {"threshold": 30})
   - RSI_OVERBOUGHT (RSI超买，params: {"threshold": 70})
   - RSI_GOLDEN_CROSS (RSI金叉)
   - RSI_DEAD_CROSS (RSI死叉)
   - RSI_TURN_UP (RSI拐头向上)
   - RSI_TURN_DOWN (RSI拐头向下)
   - RSI_LOW_GOLDEN (RSI低位金叉)
   - RSI_CROSS_30_UP (RSI上穿30)
   - RSI_CROSS_70_DOWN (RSI下破70)
3. KDJ:
   - KDJ_GOLDEN_CROSS (KDJ金叉)
   - KDJ_DEAD_CROSS (KDJ死叉)
   - KDJ_OVERSOLD (KDJ超卖，params: {"threshold": 20})
   - KDJ_OVERBOUGHT (KDJ超买，params: {"threshold": 80})
   - KDJ_BOTTOM_DIVERGENCE (KDJ底背离)
   - KDJ_TOP_DIVERGENCE (KDJ顶背离)
   - KDJ_TURN_UP (KDJ拐头向上)
   - KDJ_TURN_DOWN (KDJ拐头向下)
   - KDJ_BULLISH_ARRANGE (KDJ多头排列)
   - KDJ_BEARISH_ARRANGE (KDJ空头排列)
   - KDJ_LOW_GOLDEN (KDJ低位金叉)
4. BOLL (布林带):
   - BOLL_OPEN_EXPAND (开口张开)
   - BOLL_OPEN_SHRINK (开口缩小)
   - BOLL_BREAK_UPPER (突破上轨)
   - BOLL_BREAK_MIDDLE (突破中轨)
   - BOLL_BREAK_LOWER (跌破下轨)
   - BOLL_BREAK_UPPER_DOWN (跌破上轨)
   - BOLL_BREAK_MIDDLE_DOWN (跌破中轨)
   - BOLL_BREAK_LOWER_DOWN (回升破下轨)
5. BBI:
   - BBI_PRICE_CROSS_UP (价格上穿BBI)
   - BBI_PRICE_CROSS_DOWN (价格下穿BBI)
6. CCI:
   - CCI_BELOW_NEG100 (CCI小于-100)
   - CCI_ABOVE_100 (CCI大于100)
7. MA (均线):
   - MA_PRICE_ABOVE_MA5, MA_PRICE_ABOVE_MA10, MA_PRICE_ABOVE_MA20, MA_PRICE_ABOVE_MA30, MA_PRICE_ABOVE_MA60
   - MA_PRICE_BELOW_MA5, MA_PRICE_BELOW_MA10, MA_PRICE_BELOW_MA20, MA_PRICE_BELOW_MA30, MA_PRICE_BELOW_MA60
   - MA_MA5_CROSS_MA10, MA_MA5_CROSS_MA20, MA_MA5_CROSS_MA30, MA_MA3_CROSS_MA15
   - MA_MA5_DEAD_CROSS_MA10, MA_MA5_DEAD_CROSS_MA20, MA_MA5_DEAD_CROSS_MA30, MA_MA3_DEAD_CROSS_MA15
   - MA_BULLISH_ARRANGE_5_10_20 (均线多头排列5>10>20)
   - MA_BEARISH_ARRANGE_5_10_20 (均线空头排列5<10<20)
8. CANDLE (K线形态):
   - CANDLE_DOJI (十字星)
   - CANDLE_BIG_YANG (大阳线)
   - CANDLE_BIG_YIN (大阴线)
   - CANDLE_LONG_UPPER_SHADOW (长上影线)
   - CANDLE_SHOOTING_STAR (射击之星)
   - CANDLE_BULLISH_ENGULFING (看涨吞没)
   - CANDLE_BEARISH_ENGULFING (看跌吞没)
   - CANDLE_MORNING_STAR (早晨之星)
   - CANDLE_EVENING_STAR (黄昏之星)
   - CANDLE_THREE_RED_SOLDIERS (红三兵)
   - CANDLE_FOUR_CROWS (四乌鸦)
   - CANDLE_BALD_BULLISH (光头阳线)
   - CANDLE_BAREFOOT_BEARISH (光脚阴线)

【注意】
1. 必须同时包含 buy_groups 和 sell_groups（买入与卖出逻辑）。
2. indicator_type 与 signal_type 必须完全使用上述定义的大写枚举名称，不能随意编写其他名称。
"""


@router.post("/generate-strategy", response_model=Dict[str, Any])
async def generate_strategy(prompt: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    if not settings.ai_base_url or not settings.ai_api_key:
        raise HTTPException(status_code=500, detail="AI config not set in .env")

    # 获取现有品种列表以供匹配
    symbols = db.query(Symbol).filter(Symbol.is_active == True).all()
    symbol_map = {s.inst_id.upper(): s.id for s in symbols}

    payload = {
        "model": settings.ai_model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"请为我生成量化交易策略配置。用户需求：{prompt}",
            },
        ],
        "response_format": {"type": "json_object"},
    }

    async with httpx.AsyncClient(base_url=settings.ai_base_url, timeout=30.0) as client:
        resp = await client.post(
            "/v1/chat/completions",
            json=payload,
            headers={"Authorization": f"Bearer {settings.ai_api_key}"},
        )
        resp.raise_for_status()
        data = resp.json()

    raw_content = data["choices"][0]["message"]["content"]

    try:
        parsed = json.loads(raw_content)
    except Exception:
        parsed = {"strategy_config": raw_content}

    # 提取顶层属性
    name = parsed.get("name") or "AI 生成策略"
    description = parsed.get("description") or prompt
    timeframe = parsed.get("timeframe") or "1H"
    leverage = float(parsed.get("leverage") or 1.0)
    monitor_interval_sec = int(parsed.get("monitor_interval_sec") or 60)
    stop_loss_pct = float(parsed["stop_loss_pct"]) if parsed.get("stop_loss_pct") is not None else None
    take_profit_pct = float(parsed["take_profit_pct"]) if parsed.get("take_profit_pct") is not None else None
    trailing_stop_pct = float(parsed["trailing_stop_pct"]) if parsed.get("trailing_stop_pct") is not None else None

    # 匹配 symbol_id
    symbol_suggest = str(parsed.get("symbol_suggest") or "").upper()
    symbol_id = None
    if symbol_suggest in symbol_map:
        symbol_id = symbol_map[symbol_suggest]
    else:
        # 模糊匹配
        for inst_id, sid in symbol_map.items():
            if inst_id.startswith(symbol_suggest) or symbol_suggest in inst_id:
                symbol_id = sid
                break
    if not symbol_id:
        # 默认使用第一个 Symbol
        symbol_id = symbols[0].id if symbols else 1

    # 提取核心策略规则并规范化
    if "config_json" in parsed and isinstance(parsed["config_json"], dict):
        rule_set = parsed["config_json"]
    elif "buy_groups" in parsed or "sell_groups" in parsed or "open_long_groups" in parsed:
        rule_set = {
            "open_long_groups": parsed.get("open_long_groups") or parsed.get("buy_groups", []),
            "close_long_groups": parsed.get("close_long_groups") or parsed.get("sell_groups", []),
            "open_short_groups": parsed.get("open_short_groups", []),
            "close_short_groups": parsed.get("close_short_groups", []),
        }
    else:
        rule_set = {"open_long_groups": [], "close_long_groups": [], "open_short_groups": [], "close_short_groups": []}

    clean_config_str = json.dumps(rule_set, indent=2, ensure_ascii=False)

    return {
        "name": name,
        "description": description,
        "symbol_id": symbol_id,
        "timeframe": timeframe,
        "leverage": leverage,
        "monitor_interval_sec": monitor_interval_sec,
        "stop_loss_pct": stop_loss_pct,
        "take_profit_pct": take_profit_pct,
        "trailing_stop_pct": trailing_stop_pct,
        "strategy_config": clean_config_str,
    }


from pydantic import BaseModel


class BacktestDiagnoseRequest(BaseModel):
    strategy_id: Optional[int] = None
    strategy_name: str
    timeframe: str
    config_json: Any = None
    total_return: float
    benchmark_return: float = 0.0
    win_rate: float
    sharpe_ratio: float
    max_drawdown: float
    profit_factor: float
    trade_count: int
    win_count: int
    loss_count: int
    stop_loss_pct: Optional[float] = None
    take_profit_pct: Optional[float] = None
    trailing_stop_pct: Optional[float] = None


@router.post("/diagnose-backtest")
async def diagnose_backtest(req: BacktestDiagnoseRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """AI 回测报告深度诊断与自动调优方案生成"""
    
    # 构造专业提示词
    diag_prompt = f"""请作为资深加密货币量化对冲基金风控与策略专家，深度诊断以下量化策略的回测表现并给出具体调优方案：

【策略信息】
- 策略名称: {req.strategy_name}
- 执行周期: {req.timeframe}
- 当前止损: {req.stop_loss_pct or '未设置'}% | 止盈: {req.take_profit_pct or '未设置'}% | 移动追踪: {req.trailing_stop_pct or '未设置'}%

【回测数据统计】
- 策略总收益率: {req.total_return:.2f}% (买入持有基准: {req.benchmark_return:.2f}%)
- 最大历史回撤: {req.max_drawdown:.2f}%
- 夏普比率 (Sharpe): {req.sharpe_ratio:.3f}
- 交易胜率: {req.win_rate:.1f}% (盈利笔数: {req.win_count} / 亏损笔数: {req.loss_count})
- 盈亏比 (Profit Factor): {req.profit_factor:.2f}
- 总交易次数: {req.trade_count} 笔

【当前策略规则】
{json.dumps(req.config_json, indent=2, ensure_ascii=False) if req.config_json else '{}'}

请严格输出如下 JSON 格式的专业诊断报告与优化方案（不要包裹 markdown 代码块）：
{{
  "overall_rating": "A", // 评级：S (卓越), A (优秀), B (良好), C (一般需调优), D (高风险或亏损)
  "rating_label": "良好但回撤偏大",
  "summary": "一两句话概括该策略在当前行情下的核心表现与特征",
  "strengths": ["优势点1", "优势点2"],
  "bottlenecks": ["核心痛点/风险1 (例如：止损距离过短导致频繁被洗盘)", "痛点2 (例如：震荡市缺乏大周期均线滤波产生假突破亏损)"],
  "suggestions": ["调优建议1", "调优建议2", "调优建议3"],
  "optimized_strategy": {{
    "name": "{req.strategy_name} (AI调优增强版)",
    "description": "基于AI回测诊断调优后的策略",
    "stop_loss_pct": 2.5,
    "take_profit_pct": 6.0,
    "trailing_stop_pct": 1.5,
    "config_json": {json.dumps(req.config_json if req.config_json else {}, ensure_ascii=False)}
  }}
}}
"""

    # 如果配置了大模型API，尝试调用LLM
    if settings.ai_api_key and settings.ai_base_url:
        try:
            async with httpx.AsyncClient(timeout=35.0, trust_env=True) as client:
                headers = {
                    "Authorization": f"Bearer {settings.ai_api_key}",
                    "Content-Type": "application/json",
                }
                base_url = settings.ai_base_url.rstrip("/")
                payload = {
                    "model": settings.ai_model,
                    "messages": [
                        {"role": "system", "content": "你是一个严格输出纯 JSON 的专业量化对冲交易专家。"},
                        {"role": "user", "content": diag_prompt},
                    ],
                    "temperature": 0.3,
                }
                resp = await client.post(f"{base_url}/chat/completions", headers=headers, json=payload)
                if resp.status_code == 200:
                    content = resp.json()["choices"][0]["message"]["content"].strip()
                    if content.startswith("```"):
                        content = content.split("```")[1]
                        if content.startswith("json"):
                            content = content[4:]
                    content = content.strip()
                    parsed = json.loads(content)
                    return parsed
        except Exception as e:
            print(f"[AI] LLM 调用失败，使用专家规则引擎诊断: {e}")

    # 规则专家系统回退诊断逻辑 (Rule-based Expert Diagnostic Fallback)
    # 根据多维指标精确诊断
    ret = req.total_return
    mdd = req.max_drawdown
    sharpe = req.sharpe_ratio
    wr = req.win_rate
    pf = req.profit_factor
    trades = req.trade_count

    strengths = []
    bottlenecks = []
    suggestions = []

    # 评级计算
    if ret > 20 and mdd < 15 and sharpe > 1.2:
        rating = "S"
        rating_label = "表现卓越，风险收益比极佳"
        strengths.append("策略收益率大幅跑赢市场，夏普比率处于顶尖水平")
        strengths.append("最大回撤控制良好，资金曲线平稳上升")
    elif ret > 5 and mdd < 25 and sharpe > 0.5:
        rating = "A"
        rating_label = "表现优秀，具备稳健实盘潜力"
        strengths.append("实现了正向期望收益，盈亏比处于健康区间")
    elif ret >= 0:
        rating = "B"
        rating_label = "盈利但回撤偏大，需收紧风控"
    elif ret > -15:
        rating = "C"
        rating_label = "轻微亏损，信号过滤不足"
    else:
        rating = "D"
        rating_label = "大幅亏损，策略逻辑与当前行情不匹配"

    # 痛点与建议细分
    if mdd > 20:
        bottlenecks.append(f"历史最大回撤达 {mdd:.1f}%，在极端单边下跌中承受较大净值压力")
        suggestions.append("建议开启移动追踪止损 (Trailing Stop 1.5%~2.0%)，防止大幅盈利后利润严重回吐")
    if wr < 40 and pf < 1.2:
        bottlenecks.append("交易胜率与盈亏比偏低，可能在横盘震荡行情中被反复假信号磨损本金")
        suggestions.append("建议增加大周期 (4H/1D) 均线或 MACD 0轴趋势滤波，仅在顺大势时开仓")
    if req.stop_loss_pct is None or req.stop_loss_pct <= 0:
        bottlenecks.append("策略未配置硬止损风控，极易遭遇黑天鹅单边爆仓")
        suggestions.append("强烈建议设定 1.5% ~ 3.0% 的硬止损阈值")
    elif req.stop_loss_pct < 1.0:
        bottlenecks.append("止损设置过窄 (<1%)，在正常日内波动中极易被无谓震出")
        suggestions.append("建议将止损适度放宽至 1.8% ~ 2.5%，给予行情足够的呼吸空间")

    if trades < 5:
        bottlenecks.append("回测交易样本数偏少 (<5笔)，统计学显著性不足，需更长历史周期检验")
    elif trades > 150:
        bottlenecks.append("交易过于频繁，可能产生过高手续费磨损")
        suggestions.append("建议提高指标灵敏度阈值（如 RSI 超买超卖设为 20/80），降低交易噪音")

    if not strengths:
        strengths.append(f"完成了 {trades} 笔回测交易，提供了完整的数据验证样本")

    if not suggestions:
        suggestions.append("可进一步通过「参数网格寻优」微调均线周期与止盈止损配比")

    # 推荐优化后的风控参数
    opt_sl = max(1.5, min(3.0, (req.stop_loss_pct or 2.0) * 1.1))
    opt_tp = max(4.0, (req.take_profit_pct or 5.0) * 1.2)
    opt_ts = max(1.0, (req.trailing_stop_pct or 1.5))

    return {
        "overall_rating": rating,
        "rating_label": rating_label,
        "summary": f"该策略在所选历史区间实现总收益率 {ret:+.2f}%，最大回撤 {mdd:.2f}%，盈亏比 {pf:.2f}。整体表现为「{rating_label}」。",
        "strengths": strengths,
        "bottlenecks": bottlenecks,
        "suggestions": suggestions,
        "optimized_strategy": {
            "name": f"{req.strategy_name} (AI调优增强版)",
            "description": f"由 AI 根据回测数据针对性调优：优化止损至 {opt_sl:.1f}%，止盈至 {opt_tp:.1f}%，移动追踪至 {opt_ts:.1f}%",
            "stop_loss_pct": round(opt_sl, 1),
            "take_profit_pct": round(opt_tp, 1),
            "trailing_stop_pct": round(opt_ts, 1),
            "config_json": req.config_json or {},
        },
    }



