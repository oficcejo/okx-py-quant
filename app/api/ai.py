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
    elif "buy_groups" in parsed or "sell_groups" in parsed:
        rule_set = {
            "buy_groups": parsed.get("buy_groups", []),
            "sell_groups": parsed.get("sell_groups", []),
        }
    else:
        rule_set = {"buy_groups": [], "sell_groups": []}

    # 格式化规则集
    clean_config_str = json.dumps(rule_set, indent=2, ensure_ascii=False)

    return {
        "name": name,
        "description": description,
        "symbol_id": symbol_id,
        "timeframe": timeframe,
        "leverage": leverage,
        "monitor_interval_sec": monitor_interval_sec,
        "strategy_config": clean_config_str,
    }

