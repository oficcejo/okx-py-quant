from __future__ import annotations

import json
from typing import Any, Dict, List

STRATEGY_TEMPLATES: List[Dict[str, Any]] = [
    {
        "id": "dual_ma_trend",
        "name": "双均线交叉趋势跟踪策略 (Dual MA Trend)",
        "category": "TREND",  # TREND / MEAN_REVERSION / MOMENTUM / PATTERN / OSCILLATOR
        "tags": ["趋势跟踪", "均线突破", "经典稳健"],
        "description": "经典趋势跟踪系统：当短期均线(如MA5)向上突破长期均线(如MA20)时金叉开仓做多；跌破均线死叉时平仓离场。配合合理的止损止盈保护利润。",
        "suitable_timeframes": ["1H", "4H", "1D"],
        "suggested_leverage": 1.0,
        "stop_loss_pct": 2.0,
        "take_profit_pct": 6.0,
        "trailing_stop_pct": 1.5,
        "config_json": json.dumps(
            {
                "buy_groups": [
                    {
                        "logic": "AND",
                        "conditions": [
                            {
                                "side": "BUY",
                                "indicator_type": "MA",
                                "signal_type": "MA_GOLDEN_CROSS",
                                "params": {},
                            }
                        ],
                    }
                ],
                "sell_groups": [
                    {
                        "logic": "AND",
                        "conditions": [
                            {
                                "side": "SELL",
                                "indicator_type": "MA",
                                "signal_type": "MA_DEAD_CROSS",
                                "params": {},
                            }
                        ],
                    }
                ],
            },
            ensure_ascii=False,
            indent=2,
        ),
    },
    {
        "id": "boll_mean_reversion",
        "name": "布林带均值回归策略 (Bollinger Reversion)",
        "category": "MEAN_REVERSION",
        "tags": ["震荡高抛低吸", "均值回归", "布林通道"],
        "description": "震荡行情利器：价格跌破布林带下轨超跌反弹时开仓买入；回升触及布林带上轨或中轨时平仓获利。适合箱体震荡走势。",
        "suitable_timeframes": ["15m", "30m", "1H"],
        "suggested_leverage": 2.0,
        "stop_loss_pct": 1.5,
        "take_profit_pct": 4.0,
        "trailing_stop_pct": 1.0,
        "config_json": json.dumps(
            {
                "buy_groups": [
                    {
                        "logic": "AND",
                        "conditions": [
                            {
                                "side": "BUY",
                                "indicator_type": "BOLL",
                                "signal_type": "BOLL_BREAK_LOWER",
                                "params": {},
                            }
                        ],
                    }
                ],
                "sell_groups": [
                    {
                        "logic": "OR",
                        "conditions": [
                            {
                                "side": "SELL",
                                "indicator_type": "BOLL",
                                "signal_type": "BOLL_BREAK_UPPER",
                                "params": {},
                            },
                            {
                                "side": "SELL",
                                "indicator_type": "BOLL",
                                "signal_type": "BOLL_BREAK_MIDDLE_DOWN",
                                "params": {},
                            },
                        ],
                    }
                ],
            },
            ensure_ascii=False,
            indent=2,
        ),
    },
    {
        "id": "macd_rsi_momentum",
        "name": "MACD + RSI 动量共振复合策略 (Momentum Combo)",
        "category": "MOMENTUM",
        "tags": ["多因子共振", "动量指标", "胜率优先"],
        "description": "多因子强确认：当 MACD 柱线上穿且出现金叉，同时 RSI 处于低位超卖回踩区间 (<50) 时买入；当 RSI 出现严重超买 (>75) 或 MACD 死叉时平仓。",
        "suitable_timeframes": ["1H", "4H"],
        "suggested_leverage": 1.0,
        "stop_loss_pct": 2.5,
        "take_profit_pct": 8.0,
        "trailing_stop_pct": 2.0,
        "config_json": json.dumps(
            {
                "buy_groups": [
                    {
                        "logic": "AND",
                        "conditions": [
                            {
                                "side": "BUY",
                                "indicator_type": "MACD",
                                "signal_type": "MACD_GOLDEN_CROSS",
                                "params": {},
                            },
                            {
                                "side": "BUY",
                                "indicator_type": "RSI",
                                "signal_type": "RSI_OVERSOLD",
                                "params": {"threshold": 40},
                            },
                        ],
                    }
                ],
                "sell_groups": [
                    {
                        "logic": "OR",
                        "conditions": [
                            {
                                "side": "SELL",
                                "indicator_type": "RSI",
                                "signal_type": "RSI_OVERBOUGHT",
                                "params": {"threshold": 75},
                            },
                            {
                                "side": "SELL",
                                "indicator_type": "MACD",
                                "signal_type": "MACD_DEAD_CROSS",
                                "params": {},
                            },
                        ],
                    }
                ],
            },
            ensure_ascii=False,
            indent=2,
        ),
    },
    {
        "id": "bbi_trend_filter",
        "name": "BBI 多空通道突破滤波策略 (BBI Breakout)",
        "category": "TREND",
        "tags": ["多空通道", "多均线滤波", "趋势顺势"],
        "description": "多空指标（BBI）将 3、6、12、24 日 4 条均线加权平均：价格放量上穿 BBI 线做多；跌破 BBI 时平仓避险，具有极佳的杂波过滤能力。",
        "suitable_timeframes": ["1H", "4H", "1D"],
        "suggested_leverage": 1.0,
        "stop_loss_pct": 2.0,
        "take_profit_pct": 7.0,
        "trailing_stop_pct": 1.5,
        "config_json": json.dumps(
            {
                "buy_groups": [
                    {
                        "logic": "AND",
                        "conditions": [
                            {
                                "side": "BUY",
                                "indicator_type": "BBI",
                                "signal_type": "BBI_PRICE_CROSS_UP",
                                "params": {},
                            }
                        ],
                    }
                ],
                "sell_groups": [
                    {
                        "logic": "AND",
                        "conditions": [
                            {
                                "side": "SELL",
                                "indicator_type": "BBI",
                                "signal_type": "BBI_PRICE_CROSS_DOWN",
                                "params": {},
                            }
                        ],
                    }
                ],
            },
            ensure_ascii=False,
            indent=2,
        ),
    },
    {
        "id": "candle_engulfing_reversal",
        "name": "K线形态反转策略 (Candle Engulfing Reversal)",
        "category": "PATTERN",
        "tags": ["K线形态", "裸K反转", "大阳线突破"],
        "description": "纯价格行为学（Price Action）：当底部出现看涨吞没、早晨之星或放量大阳线时顺势开仓；出现看跌吞没或黄昏之星时锁定利润离场。",
        "suitable_timeframes": ["4H", "1D"],
        "suggested_leverage": 1.0,
        "stop_loss_pct": 3.0,
        "take_profit_pct": 9.0,
        "trailing_stop_pct": 2.5,
        "config_json": json.dumps(
            {
                "buy_groups": [
                    {
                        "logic": "OR",
                        "conditions": [
                            {
                                "side": "BUY",
                                "indicator_type": "CANDLE",
                                "signal_type": "CANDLE_BULLISH_ENGULFING",
                                "params": {},
                            },
                            {
                                "side": "BUY",
                                "indicator_type": "CANDLE",
                                "signal_type": "CANDLE_BIG_YANG",
                                "params": {},
                            },
                        ],
                    }
                ],
                "sell_groups": [
                    {
                        "logic": "OR",
                        "conditions": [
                            {
                                "side": "SELL",
                                "indicator_type": "CANDLE",
                                "signal_type": "CANDLE_BEARISH_ENGULFING",
                                "params": {},
                            },
                            {
                                "side": "SELL",
                                "indicator_type": "CANDLE",
                                "signal_type": "CANDLE_BIG_YIN",
                                "params": {},
                            },
                        ],
                    }
                ],
            },
            ensure_ascii=False,
            indent=2,
        ),
    },
    {
        "id": "kdj_oscillator_band",
        "name": "KDJ 极限超买超卖波段策略 (KDJ Swing Trading)",
        "category": "OSCILLATOR",
        "tags": ["高频波段", "灵敏摆动", "极限反弹"],
        "description": "灵敏摆动指标体系：当 KDJ 深度超卖（J/K/D < 20）且金叉时介入；当 KDJ 进入超买区（> 80）或死叉时果断了结，捕捉日内与短波段利润。",
        "suitable_timeframes": ["5m", "15m", "30m"],
        "suggested_leverage": 2.0,
        "stop_loss_pct": 1.2,
        "take_profit_pct": 3.5,
        "trailing_stop_pct": 0.8,
        "config_json": json.dumps(
            {
                "buy_groups": [
                    {
                        "logic": "AND",
                        "conditions": [
                            {
                                "side": "BUY",
                                "indicator_type": "KDJ",
                                "signal_type": "KDJ_GOLDEN_CROSS",
                                "params": {},
                            },
                            {
                                "side": "BUY",
                                "indicator_type": "KDJ",
                                "signal_type": "KDJ_OVERSOLD",
                                "params": {"threshold": 20},
                            },
                        ],
                    }
                ],
                "sell_groups": [
                    {
                        "logic": "OR",
                        "conditions": [
                            {
                                "side": "SELL",
                                "indicator_type": "KDJ",
                                "signal_type": "KDJ_DEAD_CROSS",
                                "params": {},
                            },
                            {
                                "side": "SELL",
                                "indicator_type": "KDJ",
                                "signal_type": "KDJ_OVERBOUGHT",
                                "params": {"threshold": 80},
                            },
                        ],
                    }
                ],
            },
            ensure_ascii=False,
            indent=2,
        ),
    },
    {
        "id": "macd_low_gold_ma20_breakout",
        "name": "MACD低位金叉+MA20均线共振突破策略 (MACD Low Gold & MA20 Breakout)",
        "category": "MOMENTUM",
        "tags": ["MACD低位金叉", "站上MA20", "RSI超买止盈", "右侧动量", "经典共振"],
        "description": "经典底部右侧反转共振系统：当 MACD 在 0 轴下方低位形成向上金叉，且价格有效站上 MA20 生命线时确认多头趋势启动买入；当行情剧烈拉升导致 RSI(14) 达到 80 深度超买区域时止盈平仓，锁定波段最大利润。",
        "suitable_timeframes": ["15m", "1H", "4H", "1D"],
        "suggested_leverage": 1.0,
        "stop_loss_pct": 2.5,
        "take_profit_pct": 8.0,
        "trailing_stop_pct": 1.5,
        "config_json": json.dumps(
            {
                "buy_groups": [
                    {
                        "logic": "AND",
                        "conditions": [
                            {
                                "side": "BUY",
                                "indicator_type": "MACD",
                                "signal_type": "MACD_LOW_GOLDEN",
                                "params": {},
                            },
                            {
                                "side": "BUY",
                                "indicator_type": "MA",
                                "signal_type": "MA_PRICE_ABOVE_MA20",
                                "params": {},
                            },
                        ],
                    }
                ],
                "sell_groups": [
                    {
                        "logic": "AND",
                        "conditions": [
                            {
                                "side": "SELL",
                                "indicator_type": "RSI",
                                "signal_type": "RSI_OVERBOUGHT",
                                "params": {
                                    "threshold": 80
                                },
                            }
                        ],
                    }
                ],
            },
            ensure_ascii=False,
            indent=2,
        ),
    },
]



def get_all_templates() -> List[Dict[str, Any]]:
    return STRATEGY_TEMPLATES


def get_template_by_id(template_id: str) -> Dict[str, Any] | None:
    for t in STRATEGY_TEMPLATES:
        if t["id"] == template_id:
            return t
    return None
