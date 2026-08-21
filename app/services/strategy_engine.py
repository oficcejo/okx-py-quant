from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional

import pandas as pd


class Side(str, Enum):
    BUY = "BUY"
    SELL = "SELL"
    OPEN_LONG = "OPEN_LONG"
    CLOSE_LONG = "CLOSE_LONG"
    OPEN_SHORT = "OPEN_SHORT"
    CLOSE_SHORT = "CLOSE_SHORT"



class LogicOp(str, Enum):
    AND = "AND"
    OR = "OR"


class IndicatorType(str, Enum):
    MACD = "MACD"
    KDJ = "KDJ"
    BOLL = "BOLL"
    RSI = "RSI"
    BBI = "BBI"
    CCI = "CCI"
    MA = "MA"
    CANDLE = "CANDLE"


class SignalType(str, Enum):
    # MACD
    MACD_GOLDEN_CROSS = "MACD_GOLDEN_CROSS"
    MACD_DEAD_CROSS = "MACD_DEAD_CROSS"
    MACD_ABOVE_ZERO = "MACD_ABOVE_ZERO"
    MACD_BELOW_ZERO = "MACD_BELOW_ZERO"
    MACD_BULLISH_ARRANGE = "MACD_BULLISH_ARRANGE"
    MACD_BEARISH_ARRANGE = "MACD_BEARISH_ARRANGE"
    MACD_DOUBLE_GOLDEN = "MACD_DOUBLE_GOLDEN"
    MACD_LOW_GOLDEN = "MACD_LOW_GOLDEN"
    MACD_BOTTOM_DIVERGENCE = "MACD_BOTTOM_DIVERGENCE"
    MACD_TOP_DIVERGENCE = "MACD_TOP_DIVERGENCE"
    
    # RSI
    RSI_OVERSOLD = "RSI_OVERSOLD"
    RSI_OVERBOUGHT = "RSI_OVERBOUGHT"
    RSI_GOLDEN_CROSS = "RSI_GOLDEN_CROSS"
    RSI_DEAD_CROSS = "RSI_DEAD_CROSS"
    RSI_TURN_UP = "RSI_TURN_UP"
    RSI_TURN_DOWN = "RSI_TURN_DOWN"
    RSI_LOW_GOLDEN = "RSI_LOW_GOLDEN"
    RSI_CROSS_30_UP = "RSI_CROSS_30_UP"
    RSI_CROSS_70_DOWN = "RSI_CROSS_70_DOWN"
    
    # K线形态
    CANDLE_BAREFOOT_BEARISH = "CANDLE_BAREFOOT_BEARISH"
    CANDLE_BAREFOOT_BULLISH = "CANDLE_BAREFOOT_BULLISH"
    CANDLE_BALD_BEARISH = "CANDLE_BALD_BEARISH"
    CANDLE_BALD_BULLISH = "CANDLE_BALD_BULLISH"
    CANDLE_DOJI = "CANDLE_DOJI"
    CANDLE_BIG_YANG = "CANDLE_BIG_YANG"
    CANDLE_BIG_YIN = "CANDLE_BIG_YIN"
    CANDLE_LONG_UPPER_SHADOW = "CANDLE_LONG_UPPER_SHADOW"
    CANDLE_SHOOTING_STAR = "CANDLE_SHOOTING_STAR"
    CANDLE_BULLISH_ENGULFING = "CANDLE_BULLISH_ENGULFING"
    CANDLE_BEARISH_ENGULFING = "CANDLE_BEARISH_ENGULFING"
    CANDLE_MORNING_STAR = "CANDLE_MORNING_STAR"
    CANDLE_EVENING_STAR = "CANDLE_EVENING_STAR"
    CANDLE_THREE_RED_SOLDIERS = "CANDLE_THREE_RED_SOLDIERS"
    CANDLE_FOUR_CROWS = "CANDLE_FOUR_CROWS"
    
    # KDJ
    KDJ_GOLDEN_CROSS = "KDJ_GOLDEN_CROSS"
    KDJ_DEAD_CROSS = "KDJ_DEAD_CROSS"
    KDJ_OVERSOLD = "KDJ_OVERSOLD"
    KDJ_OVERBOUGHT = "KDJ_OVERBOUGHT"
    KDJ_BOTTOM_DIVERGENCE = "KDJ_BOTTOM_DIVERGENCE"
    KDJ_TOP_DIVERGENCE = "KDJ_TOP_DIVERGENCE"
    KDJ_TURN_UP = "KDJ_TURN_UP"
    KDJ_TURN_DOWN = "KDJ_TURN_DOWN"
    KDJ_BULLISH_ARRANGE = "KDJ_BULLISH_ARRANGE"
    KDJ_BEARISH_ARRANGE = "KDJ_BEARISH_ARRANGE"
    KDJ_LOW_GOLDEN = "KDJ_LOW_GOLDEN"
    
    # BOLL
    BOLL_OPEN_EXPAND = "BOLL_OPEN_EXPAND"
    BOLL_OPEN_SHRINK = "BOLL_OPEN_SHRINK"
    BOLL_BREAK_UPPER = "BOLL_BREAK_UPPER"
    BOLL_BREAK_MIDDLE = "BOLL_BREAK_MIDDLE"
    BOLL_BREAK_LOWER = "BOLL_BREAK_LOWER"
    BOLL_BREAK_UPPER_DOWN = "BOLL_BREAK_UPPER_DOWN"
    BOLL_BREAK_MIDDLE_DOWN = "BOLL_BREAK_MIDDLE_DOWN"
    BOLL_BREAK_LOWER_DOWN = "BOLL_BREAK_LOWER_DOWN"
    
    # BBI
    BBI_PRICE_CROSS_UP = "BBI_PRICE_CROSS_UP"
    BBI_PRICE_CROSS_DOWN = "BBI_PRICE_CROSS_DOWN"
    
    # CCI
    CCI_BELOW_NEG100 = "CCI_BELOW_NEG100"
    CCI_ABOVE_100 = "CCI_ABOVE_100"
    
    # MA
    MA_GOLDEN_CROSS = "MA_GOLDEN_CROSS"
    MA_DEAD_CROSS = "MA_DEAD_CROSS"
    MA_PRICE_ABOVE_MA5 = "MA_PRICE_ABOVE_MA5"
    MA_PRICE_ABOVE_MA10 = "MA_PRICE_ABOVE_MA10"
    MA_PRICE_ABOVE_MA20 = "MA_PRICE_ABOVE_MA20"
    MA_PRICE_ABOVE_MA30 = "MA_PRICE_ABOVE_MA30"
    MA_PRICE_ABOVE_MA60 = "MA_PRICE_ABOVE_MA60"
    MA_PRICE_BELOW_MA5 = "MA_PRICE_BELOW_MA5"
    MA_PRICE_BELOW_MA10 = "MA_PRICE_BELOW_MA10"
    MA_PRICE_BELOW_MA20 = "MA_PRICE_BELOW_MA20"
    MA_PRICE_BELOW_MA30 = "MA_PRICE_BELOW_MA30"
    MA_PRICE_BELOW_MA60 = "MA_PRICE_BELOW_MA60"
    MA_MA5_CROSS_MA10 = "MA_MA5_CROSS_MA10"
    MA_MA5_CROSS_MA20 = "MA_MA5_CROSS_MA20"
    MA_MA5_CROSS_MA30 = "MA_MA5_CROSS_MA30"
    MA_MA3_CROSS_MA15 = "MA_MA3_CROSS_MA15"
    MA_MA5_DEAD_CROSS_MA10 = "MA_MA5_DEAD_CROSS_MA10"
    MA_MA5_DEAD_CROSS_MA20 = "MA_MA5_DEAD_CROSS_MA20"
    MA_MA5_DEAD_CROSS_MA30 = "MA_MA5_DEAD_CROSS_MA30"
    MA_MA3_DEAD_CROSS_MA15 = "MA_MA3_DEAD_CROSS_MA15"
    MA_BULLISH_ARRANGE_5_10_20 = "MA_BULLISH_ARRANGE_5_10_20"
    MA_BEARISH_ARRANGE_5_10_20 = "MA_BEARISH_ARRANGE_5_10_20"



class Condition(Dict[str, Any]):
    side: Side
    indicator_type: IndicatorType
    signal_type: SignalType
    params: Dict[str, Any]


class ConditionGroup(Dict[str, Any]):
    logic: LogicOp
    conditions: List[Condition]


class StrategyRuleSet(Dict[str, Any]):
    buy_groups: List[ConditionGroup]
    sell_groups: List[ConditionGroup]


def evaluate_condition(cond: Condition, df: pd.DataFrame, idx: int) -> bool:
    try:
        raw_indicator = cond.get("indicator_type") or cond.get("indicator") or ""
        raw_signal = cond.get("signal_type") or cond.get("signal") or ""
        raw_indicator_str = str(raw_indicator).strip().upper()
        raw_signal_str = str(raw_signal).strip().upper()

        # Handle common signal naming variations
        if raw_signal_str in ("CROSSOVER", "GOLDEN_CROSS", "GOLDEN"):
            if raw_indicator_str == "MACD":
                raw_signal_str = "MACD_GOLDEN_CROSS"
            elif raw_indicator_str == "RSI":
                raw_signal_str = "RSI_GOLDEN_CROSS"
            elif raw_indicator_str == "KDJ":
                raw_signal_str = "KDJ_GOLDEN_CROSS"
            elif raw_indicator_str == "MA":
                raw_signal_str = "MA_GOLDEN_CROSS"
        elif raw_signal_str in ("DEATH_CROSS", "DEAD_CROSS", "DEAD"):
            if raw_indicator_str == "MACD":
                raw_signal_str = "MACD_DEAD_CROSS"
            elif raw_indicator_str == "RSI":
                raw_signal_str = "RSI_DEAD_CROSS"
            elif raw_indicator_str == "KDJ":
                raw_signal_str = "KDJ_DEAD_CROSS"
            elif raw_indicator_str == "MA":
                raw_signal_str = "MA_DEAD_CROSS"
        elif raw_signal_str == "OVERSOLD":
            if raw_indicator_str == "RSI":
                raw_signal_str = "RSI_OVERSOLD"
            elif raw_indicator_str == "KDJ":
                raw_signal_str = "KDJ_OVERSOLD"
        elif raw_signal_str == "OVERBOUGHT":
            if raw_indicator_str == "RSI":
                raw_signal_str = "RSI_OVERBOUGHT"
            elif raw_indicator_str == "KDJ":
                raw_signal_str = "KDJ_OVERBOUGHT"
        elif raw_signal_str == "ABOVE_ZERO" and raw_indicator_str == "MACD":
            raw_signal_str = "MACD_ABOVE_ZERO"
        elif raw_signal_str == "BELOW_ZERO" and raw_indicator_str == "MACD":
            raw_signal_str = "MACD_BELOW_ZERO"

        indicator_type = IndicatorType(raw_indicator_str)
        signal_type = SignalType(raw_signal_str)
    except Exception:
        return False

    try:
        # RSI 指标体系
        if indicator_type == IndicatorType.RSI:
            rsi_col = "rsi" if "rsi" in df.columns else "rsi14"
            rsi_val = float(df[rsi_col].iloc[idx]) if rsi_col in df.columns else 50.0

            if signal_type == SignalType.RSI_OVERSOLD:
                threshold = float(cond.get("params", {}).get("threshold") or cond.get("threshold", 30))
                return rsi_val < threshold

            if signal_type == SignalType.RSI_OVERBOUGHT:
                threshold = float(cond.get("params", {}).get("threshold") or cond.get("threshold", 70))
                return rsi_val > threshold

            if signal_type == SignalType.RSI_GOLDEN_CROSS:
                if idx == 0 or "rsi6" not in df.columns or "rsi12" not in df.columns:
                    return False
                prev_6 = float(df["rsi6"].iloc[idx - 1])
                prev_12 = float(df["rsi12"].iloc[idx - 1])
                curr_6 = float(df["rsi6"].iloc[idx])
                curr_12 = float(df["rsi12"].iloc[idx])
                return prev_6 <= prev_12 and curr_6 > curr_12

            if signal_type == SignalType.RSI_DEAD_CROSS:
                if idx == 0 or "rsi6" not in df.columns or "rsi12" not in df.columns:
                    return False
                prev_6 = float(df["rsi6"].iloc[idx - 1])
                prev_12 = float(df["rsi12"].iloc[idx - 1])
                curr_6 = float(df["rsi6"].iloc[idx])
                curr_12 = float(df["rsi12"].iloc[idx])
                return prev_6 >= prev_12 and curr_6 < curr_12

            if signal_type == SignalType.RSI_LOW_GOLDEN:
                if idx == 0 or "rsi6" not in df.columns or "rsi12" not in df.columns:
                    return False
                curr_6 = float(df["rsi6"].iloc[idx])
                curr_12 = float(df["rsi12"].iloc[idx])
                prev_6 = float(df["rsi6"].iloc[idx - 1])
                prev_12 = float(df["rsi12"].iloc[idx - 1])
                return curr_6 < 40 and prev_6 <= prev_12 and curr_6 > curr_12

            if signal_type == SignalType.RSI_CROSS_30_UP:
                if idx == 0:
                    return False
                prev_rsi = float(df[rsi_col].iloc[idx - 1])
                return prev_rsi <= 30.0 and rsi_val > 30.0

            if signal_type == SignalType.RSI_CROSS_70_DOWN:
                if idx == 0:
                    return False
                prev_rsi = float(df[rsi_col].iloc[idx - 1])
                return prev_rsi >= 70.0 and rsi_val < 70.0

            if signal_type == SignalType.RSI_TURN_UP:
                if idx < 2:
                    return False
                r0 = float(df[rsi_col].iloc[idx])
                r1 = float(df[rsi_col].iloc[idx - 1])
                r2 = float(df[rsi_col].iloc[idx - 2])
                return r0 > r1 and r1 <= r2

            if signal_type == SignalType.RSI_TURN_DOWN:
                if idx < 2:
                    return False
                r0 = float(df[rsi_col].iloc[idx])
                r1 = float(df[rsi_col].iloc[idx - 1])
                r2 = float(df[rsi_col].iloc[idx - 2])
                return r0 < r1 and r1 >= r2

        # MACD 指标体系
        if indicator_type == IndicatorType.MACD:
            macd = df["macd"]
            signal = df["macd_signal"]
            hist = df["macd_hist"] if "macd_hist" in df.columns else (macd - signal)

            if signal_type == SignalType.MACD_GOLDEN_CROSS:
                if idx == 0:
                    return False
                prev_diff = macd.iloc[idx - 1] - signal.iloc[idx - 1]
                curr_diff = macd.iloc[idx] - signal.iloc[idx]
                return prev_diff <= 0 and curr_diff > 0

            if signal_type == SignalType.MACD_DEAD_CROSS:
                if idx == 0:
                    return False
                prev_diff = macd.iloc[idx - 1] - signal.iloc[idx - 1]
                curr_diff = macd.iloc[idx] - signal.iloc[idx]
                return prev_diff >= 0 and curr_diff < 0

            if signal_type == SignalType.MACD_ABOVE_ZERO:
                return float(macd.iloc[idx]) > 0

            if signal_type == SignalType.MACD_BELOW_ZERO:
                return float(macd.iloc[idx]) < 0

            if signal_type == SignalType.MACD_LOW_GOLDEN:
                if idx == 0:
                    return False
                prev_diff = macd.iloc[idx - 1] - signal.iloc[idx - 1]
                curr_diff = macd.iloc[idx] - signal.iloc[idx]
                return float(macd.iloc[idx]) < 0 and prev_diff <= 0 and curr_diff > 0

            if signal_type == SignalType.MACD_BULLISH_ARRANGE:
                return float(macd.iloc[idx]) > float(signal.iloc[idx]) and float(hist.iloc[idx]) > 0

            if signal_type == SignalType.MACD_BEARISH_ARRANGE:
                return float(macd.iloc[idx]) < float(signal.iloc[idx]) and float(hist.iloc[idx]) < 0

        # K线形态 (CANDLE)
        if indicator_type == IndicatorType.CANDLE:
            open_price = float(df["open"].iloc[idx])
            close_price = float(df["close"].iloc[idx])
            high_price = float(df["high"].iloc[idx])
            low_price = float(df["low"].iloc[idx])
            bar_range = max(high_price - low_price, 1e-6)
            body = abs(close_price - open_price)
            
            # 光脚阳线 (开盘即低点，无下影线)
            if signal_type == SignalType.CANDLE_BAREFOOT_BULLISH:
                is_bullish = close_price > open_price
                lower_shadow = open_price - low_price
                return is_bullish and (lower_shadow / bar_range < 0.08)

            # 光头阳线 (收盘即高点，无上影线)
            if signal_type == SignalType.CANDLE_BALD_BULLISH:
                is_bullish = close_price > open_price
                upper_shadow = high_price - close_price
                return is_bullish and (upper_shadow / bar_range < 0.08)

            # 光脚阴线 (收盘即低点，无下影线)
            if signal_type == SignalType.CANDLE_BAREFOOT_BEARISH:
                is_bearish = close_price < open_price
                lower_shadow = close_price - low_price
                return is_bearish and (lower_shadow / bar_range < 0.08)

            # 光头阴线 (开盘即高点，无上影线)
            if signal_type == SignalType.CANDLE_BALD_BEARISH:
                is_bearish = close_price < open_price
                upper_shadow = high_price - open_price
                return is_bearish and (upper_shadow / bar_range < 0.08)

            # 十字星
            if signal_type == SignalType.CANDLE_DOJI:
                return body / bar_range < 0.1

            # 大阳线
            if signal_type == SignalType.CANDLE_BIG_YANG:
                return close_price > open_price and (body / bar_range > 0.65)

            # 大阴线
            if signal_type == SignalType.CANDLE_BIG_YIN:
                return open_price > close_price and (body / bar_range > 0.65)

            # 长上影线 / 射击之星
            if signal_type in (SignalType.CANDLE_LONG_UPPER_SHADOW, SignalType.CANDLE_SHOOTING_STAR):
                upper_shadow = high_price - max(open_price, close_price)
                return upper_shadow > max(body * 2.0, bar_range * 0.5)

            # 看涨吞没
            if signal_type == SignalType.CANDLE_BULLISH_ENGULFING:
                if idx == 0:
                    return False
                prev_open = float(df["open"].iloc[idx - 1])
                prev_close = float(df["close"].iloc[idx - 1])
                is_prev_bearish = prev_close < prev_open
                is_curr_bullish = close_price > open_price
                engulfing = close_price >= prev_open and open_price <= prev_close
                return is_prev_bearish and is_curr_bullish and engulfing

            # 看跌吞没
            if signal_type == SignalType.CANDLE_BEARISH_ENGULFING:
                if idx == 0:
                    return False
                prev_open = float(df["open"].iloc[idx - 1])
                prev_close = float(df["close"].iloc[idx - 1])
                is_prev_bullish = prev_close > prev_open
                is_curr_bearish = close_price < open_price
                engulfing = close_price <= prev_open and open_price >= prev_close
                return is_prev_bullish and is_curr_bearish and engulfing

            # 早晨之星
            if signal_type == SignalType.CANDLE_MORNING_STAR:
                if idx < 2:
                    return False
                o1, c1 = float(df["open"].iloc[idx-2]), float(df["close"].iloc[idx-2])
                o2, c2 = float(df["open"].iloc[idx-1]), float(df["close"].iloc[idx-1])
                o3, c3 = float(df["open"].iloc[idx]), float(df["close"].iloc[idx])
                return (c1 < o1) and (abs(c2 - o2) < abs(c1 - o1) * 0.4) and (c3 > o3 and c3 > (o1 + c1) / 2)

            # 黄昏之星
            if signal_type == SignalType.CANDLE_EVENING_STAR:
                if idx < 2:
                    return False
                o1, c1 = float(df["open"].iloc[idx-2]), float(df["close"].iloc[idx-2])
                o2, c2 = float(df["open"].iloc[idx-1]), float(df["close"].iloc[idx-1])
                o3, c3 = float(df["open"].iloc[idx]), float(df["close"].iloc[idx])
                return (c1 > o1) and (abs(c2 - o2) < abs(c1 - o1) * 0.4) and (c3 < o3 and c3 < (o1 + c1) / 2)

            # 红三兵
            if signal_type == SignalType.CANDLE_THREE_RED_SOLDIERS:
                if idx < 2:
                    return False
                c1, o1 = float(df["close"].iloc[idx-2]), float(df["open"].iloc[idx-2])
                c2, o2 = float(df["close"].iloc[idx-1]), float(df["open"].iloc[idx-1])
                c3, o3 = float(df["close"].iloc[idx]), float(df["open"].iloc[idx])
                return (c1 > o1) and (c2 > o2 and c2 > c1) and (c3 > o3 and c3 > c2)

            # 连续阴线 (四只乌鸦 / 三只乌鸦)
            if signal_type == SignalType.CANDLE_FOUR_CROWS:
                if idx < 2:
                    return False
                c1, o1 = float(df["close"].iloc[idx-2]), float(df["open"].iloc[idx-2])
                c2, o2 = float(df["close"].iloc[idx-1]), float(df["open"].iloc[idx-1])
                c3, o3 = float(df["close"].iloc[idx]), float(df["open"].iloc[idx])
                return (c1 < o1) and (c2 < o2 and c2 < c1) and (c3 < o3 and c3 < c2)

        # KDJ 指标体系
        if indicator_type == IndicatorType.KDJ:
            k = float(df["kdj_k"].iloc[idx])
            d = float(df["kdj_d"].iloc[idx])
            j = float(df["kdj_j"].iloc[idx])
            
            if signal_type == SignalType.KDJ_GOLDEN_CROSS:
                if idx == 0:
                    return False
                prev_k = float(df["kdj_k"].iloc[idx - 1])
                prev_d = float(df["kdj_d"].iloc[idx - 1])
                return prev_k <= prev_d and k > d
            
            if signal_type == SignalType.KDJ_DEAD_CROSS:
                if idx == 0:
                    return False
                prev_k = float(df["kdj_k"].iloc[idx - 1])
                prev_d = float(df["kdj_d"].iloc[idx - 1])
                return prev_k >= prev_d and k < d
            
            if signal_type == SignalType.KDJ_OVERSOLD:
                threshold = float(cond.get("params", {}).get("threshold", 20))
                return j < threshold or k < threshold
            
            if signal_type == SignalType.KDJ_OVERBOUGHT:
                threshold = float(cond.get("params", {}).get("threshold", 80))
                return j > threshold or k > threshold

            if signal_type == SignalType.KDJ_LOW_GOLDEN:
                if idx == 0:
                    return False
                prev_k = float(df["kdj_k"].iloc[idx - 1])
                prev_d = float(df["kdj_d"].iloc[idx - 1])
                return k < 35 and prev_k <= prev_d and k > d

            if signal_type == SignalType.KDJ_BULLISH_ARRANGE:
                return k > d and j > k

            if signal_type == SignalType.KDJ_BEARISH_ARRANGE:
                return k < d and j < k

            if signal_type == SignalType.KDJ_TURN_UP:
                if idx < 2:
                    return False
                j0 = float(df["kdj_j"].iloc[idx])
                j1 = float(df["kdj_j"].iloc[idx - 1])
                j2 = float(df["kdj_j"].iloc[idx - 2])
                return j0 > j1 and j1 <= j2

            if signal_type == SignalType.KDJ_TURN_DOWN:
                if idx < 2:
                    return False
                j0 = float(df["kdj_j"].iloc[idx])
                j1 = float(df["kdj_j"].iloc[idx - 1])
                j2 = float(df["kdj_j"].iloc[idx - 2])
                return j0 < j1 and j1 >= j2

        # 布林带 (BOLL)
        if indicator_type == IndicatorType.BOLL:
            close = float(df["close"].iloc[idx])
            upper = float(df["boll_upper"].iloc[idx])
            middle = float(df["boll_middle"].iloc[idx])
            lower = float(df["boll_lower"].iloc[idx])
            width = float(df["boll_width"].iloc[idx]) if "boll_width" in df.columns else (upper - lower) / middle
            
            if signal_type == SignalType.BOLL_BREAK_UPPER:
                if idx == 0:
                    return False
                prev_close = float(df["close"].iloc[idx - 1])
                prev_upper = float(df["boll_upper"].iloc[idx - 1])
                return prev_close <= prev_upper and close > upper
            
            if signal_type == SignalType.BOLL_BREAK_LOWER:
                if idx == 0:
                    return False
                prev_close = float(df["close"].iloc[idx - 1])
                prev_lower = float(df["boll_lower"].iloc[idx - 1])
                return prev_close >= prev_lower and close < lower

            if signal_type == SignalType.BOLL_BREAK_MIDDLE:
                if idx == 0:
                    return False
                prev_close = float(df["close"].iloc[idx - 1])
                prev_middle = float(df["boll_middle"].iloc[idx - 1])
                return prev_close <= prev_middle and close > middle

            if signal_type == SignalType.BOLL_BREAK_MIDDLE_DOWN:
                if idx == 0:
                    return False
                prev_close = float(df["close"].iloc[idx - 1])
                prev_middle = float(df["boll_middle"].iloc[idx - 1])
                return prev_close >= prev_middle and close < middle

            if signal_type == SignalType.BOLL_BREAK_UPPER_DOWN:
                if idx == 0:
                    return False
                prev_close = float(df["close"].iloc[idx - 1])
                prev_upper = float(df["boll_upper"].iloc[idx - 1])
                return prev_close >= prev_upper and close < upper

            if signal_type == SignalType.BOLL_BREAK_LOWER_DOWN:
                if idx == 0:
                    return False
                prev_close = float(df["close"].iloc[idx - 1])
                prev_lower = float(df["boll_lower"].iloc[idx - 1])
                return prev_close >= prev_lower and close < lower

            if signal_type == SignalType.BOLL_OPEN_EXPAND:
                if idx == 0 or "boll_width" not in df.columns:
                    return False
                prev_w = float(df["boll_width"].iloc[idx - 1])
                return width > prev_w * 1.05

            if signal_type == SignalType.BOLL_OPEN_SHRINK:
                if idx == 0 or "boll_width" not in df.columns:
                    return False
                prev_w = float(df["boll_width"].iloc[idx - 1])
                return width < prev_w * 0.95

        # BBI 多空指标
        if indicator_type == IndicatorType.BBI:
            close = float(df["close"].iloc[idx])
            bbi = float(df["bbi"].iloc[idx])
            
            if signal_type == SignalType.BBI_PRICE_CROSS_UP:
                if idx == 0:
                    return False
                prev_close = float(df["close"].iloc[idx - 1])
                prev_bbi = float(df["bbi"].iloc[idx - 1])
                return prev_close <= prev_bbi and close > bbi
            
            if signal_type == SignalType.BBI_PRICE_CROSS_DOWN:
                if idx == 0:
                    return False
                prev_close = float(df["close"].iloc[idx - 1])
                prev_bbi = float(df["bbi"].iloc[idx - 1])
                return prev_close >= prev_bbi and close < bbi

        # CCI 顺势指标
        if indicator_type == IndicatorType.CCI:
            cci = float(df["cci"].iloc[idx])
            
            if signal_type == SignalType.CCI_BELOW_NEG100:
                return cci < -100.0
            
            if signal_type == SignalType.CCI_ABOVE_100:
                return cci > 100.0

        # 均线系统 (MA)
        if indicator_type == IndicatorType.MA:
            close = float(df["close"].iloc[idx])
            
            # 通用均线金叉 / 死叉（默认 MA5 上穿/下穿 MA10 或 MA20）
            if signal_type in (SignalType.MA_GOLDEN_CROSS, SignalType.MA_MA5_CROSS_MA10):
                if idx == 0 or "ma5" not in df.columns or "ma10" not in df.columns:
                    return False
                p5, p10 = float(df["ma5"].iloc[idx - 1]), float(df["ma10"].iloc[idx - 1])
                c5, c10 = float(df["ma5"].iloc[idx]), float(df["ma10"].iloc[idx])
                return p5 <= p10 and c5 > c10

            if signal_type in (SignalType.MA_DEAD_CROSS, SignalType.MA_MA5_DEAD_CROSS_MA10):
                if idx == 0 or "ma5" not in df.columns or "ma10" not in df.columns:
                    return False
                p5, p10 = float(df["ma5"].iloc[idx - 1]), float(df["ma10"].iloc[idx - 1])
                c5, c10 = float(df["ma5"].iloc[idx]), float(df["ma10"].iloc[idx])
                return p5 >= p10 and c5 < c10

            if signal_type == SignalType.MA_MA5_CROSS_MA20:
                if idx == 0 or "ma5" not in df.columns or "ma20" not in df.columns:
                    return False
                p5, p20 = float(df["ma5"].iloc[idx - 1]), float(df["ma20"].iloc[idx - 1])
                c5, c20 = float(df["ma5"].iloc[idx]), float(df["ma20"].iloc[idx])
                return p5 <= p20 and c5 > c20

            if signal_type == SignalType.MA_MA5_DEAD_CROSS_MA20:
                if idx == 0 or "ma5" not in df.columns or "ma20" not in df.columns:
                    return False
                p5, p20 = float(df["ma5"].iloc[idx - 1]), float(df["ma20"].iloc[idx - 1])
                c5, c20 = float(df["ma5"].iloc[idx]), float(df["ma20"].iloc[idx])
                return p5 >= p20 and c5 < c20

            if signal_type == SignalType.MA_MA5_CROSS_MA30:
                if idx == 0 or "ma5" not in df.columns or "ma30" not in df.columns:
                    return False
                p5, p30 = float(df["ma5"].iloc[idx - 1]), float(df["ma30"].iloc[idx - 1])
                c5, c30 = float(df["ma5"].iloc[idx]), float(df["ma30"].iloc[idx])
                return p5 <= p30 and c5 > c30

            if signal_type == SignalType.MA_MA5_DEAD_CROSS_MA30:
                if idx == 0 or "ma5" not in df.columns or "ma30" not in df.columns:
                    return False
                p5, p30 = float(df["ma5"].iloc[idx - 1]), float(df["ma30"].iloc[idx - 1])
                c5, c30 = float(df["ma5"].iloc[idx]), float(df["ma30"].iloc[idx])
                return p5 >= p30 and c5 < c30

            if signal_type == SignalType.MA_MA3_CROSS_MA15:
                if idx == 0 or "ma3" not in df.columns or "ma15" not in df.columns:
                    return False
                p3, p15 = float(df["ma3"].iloc[idx - 1]), float(df["ma15"].iloc[idx - 1])
                c3, c15 = float(df["ma3"].iloc[idx]), float(df["ma15"].iloc[idx])
                return p3 <= p15 and c3 > c15

            if signal_type == SignalType.MA_MA3_DEAD_CROSS_MA15:
                if idx == 0 or "ma3" not in df.columns or "ma15" not in df.columns:
                    return False
                p3, p15 = float(df["ma3"].iloc[idx - 1]), float(df["ma15"].iloc[idx - 1])
                c3, c15 = float(df["ma3"].iloc[idx]), float(df["ma15"].iloc[idx])
                return p3 >= p15 and c3 < c15

            # 价格突破均线
            if signal_type == SignalType.MA_PRICE_ABOVE_MA5 and "ma5" in df.columns:
                return close > float(df["ma5"].iloc[idx])
            if signal_type == SignalType.MA_PRICE_ABOVE_MA10 and "ma10" in df.columns:
                return close > float(df["ma10"].iloc[idx])
            if signal_type == SignalType.MA_PRICE_ABOVE_MA20 and "ma20" in df.columns:
                return close > float(df["ma20"].iloc[idx])
            if signal_type == SignalType.MA_PRICE_ABOVE_MA30 and "ma30" in df.columns:
                return close > float(df["ma30"].iloc[idx])
            if signal_type == SignalType.MA_PRICE_ABOVE_MA60 and "ma60" in df.columns:
                return close > float(df["ma60"].iloc[idx])
            
            if signal_type == SignalType.MA_PRICE_BELOW_MA5 and "ma5" in df.columns:
                return close < float(df["ma5"].iloc[idx])
            if signal_type == SignalType.MA_PRICE_BELOW_MA10 and "ma10" in df.columns:
                return close < float(df["ma10"].iloc[idx])
            if signal_type == SignalType.MA_PRICE_BELOW_MA20 and "ma20" in df.columns:
                return close < float(df["ma20"].iloc[idx])
            if signal_type == SignalType.MA_PRICE_BELOW_MA30 and "ma30" in df.columns:
                return close < float(df["ma30"].iloc[idx])
            if signal_type == SignalType.MA_PRICE_BELOW_MA60 and "ma60" in df.columns:
                return close < float(df["ma60"].iloc[idx])
            
            # 多头/空头排列
            if signal_type == SignalType.MA_BULLISH_ARRANGE_5_10_20 and "ma5" in df.columns and "ma10" in df.columns and "ma20" in df.columns:
                ma5 = float(df["ma5"].iloc[idx])
                ma10 = float(df["ma10"].iloc[idx])
                ma20 = float(df["ma20"].iloc[idx])
                return ma5 > ma10 > ma20
            
            if signal_type == SignalType.MA_BEARISH_ARRANGE_5_10_20 and "ma5" in df.columns and "ma10" in df.columns and "ma20" in df.columns:
                ma5 = float(df["ma5"].iloc[idx])
                ma10 = float(df["ma10"].iloc[idx])
                ma20 = float(df["ma20"].iloc[idx])
                return ma5 < ma10 < ma20

    except (KeyError, IndexError, ValueError):
        return False

    return False



import json


def align_multi_timeframe_indicators(
    df_base: pd.DataFrame, df_higher: pd.DataFrame, higher_tf: str
) -> pd.DataFrame:
    """将大周期 K 线计算的指标前向填充对齐到小周期主 DataFrame 中，避免未来函数"""
    if df_higher is None or df_higher.empty or df_base is None or df_base.empty:
        return df_base

    from app.services.backtest_engine import compute_indicators
    df_h_ind = compute_indicators(df_higher.copy())
    suffix = f"_{higher_tf.upper()}"


    # 保留 ts 字段，将其余指标列添加后缀
    rename_map = {col: f"{col}{suffix}" for col in df_h_ind.columns if col != "ts"}
    df_h_ind = df_h_ind.rename(columns=rename_map)

    # 转换 ts 为 datetime 并排序
    df_base = df_base.copy()
    if not pd.api.types.is_datetime64_any_dtype(df_base["ts"]):
        df_base["ts"] = pd.to_datetime(df_base["ts"])
    if not pd.api.types.is_datetime64_any_dtype(df_h_ind["ts"]):
        df_h_ind["ts"] = pd.to_datetime(df_h_ind["ts"])

    df_base = df_base.sort_values("ts")
    df_h_ind = df_h_ind.sort_values("ts")

    # 使用 merge_asof 进行前向匹配（backward: 仅使用截至当前小周期已闭合的大周期 Bar 指标）
    merged = pd.merge_asof(df_base, df_h_ind, on="ts", direction="backward")
    return merged


def normalize_rule_set(rule_set: Any) -> dict:
    """规范化策略规则 JSON，兼容做多/做空/平多/平空与老版 buy_groups/sell_groups"""
    if isinstance(rule_set, str):
        try:
            rule_set = json.loads(rule_set)
        except Exception:
            return {"open_long_groups": [], "close_long_groups": [], "open_short_groups": [], "close_short_groups": []}
    if isinstance(rule_set, dict):
        if "config_json" in rule_set and isinstance(rule_set["config_json"], (dict, str)):
            if isinstance(rule_set["config_json"], str):
                try:
                    rule_set = json.loads(rule_set["config_json"])
                except Exception:
                    pass
            else:
                rule_set = rule_set["config_json"]
        elif "strategy_config" in rule_set and isinstance(rule_set["strategy_config"], (dict, str)):
            if isinstance(rule_set["strategy_config"], str):
                try:
                    rule_set = json.loads(rule_set["strategy_config"])
                except Exception:
                    pass
            else:
                rule_set = rule_set["strategy_config"]

    if not isinstance(rule_set, dict):
        rule_set = {}

    # 规范化别名
    open_long = rule_set.get("open_long_groups") or rule_set.get("buy_groups") or []
    close_long = rule_set.get("close_long_groups") or rule_set.get("sell_groups") or []
    open_short = rule_set.get("open_short_groups") or []
    close_short = rule_set.get("close_short_groups") or []

    return {
        "open_long_groups": open_long,
        "close_long_groups": close_long,
        "open_short_groups": open_short,
        "close_short_groups": close_short,
        # 兼容老版键名
        "buy_groups": open_long,
        "sell_groups": close_long,
    }


def evaluate_group(group: ConditionGroup, df: pd.DataFrame, idx: int, target_side: Side) -> bool:
    raw_logic = group.get("logic") or group.get("group_logic") or "AND"
    try:
        logic = LogicOp(str(raw_logic).strip().upper())
    except Exception:
        logic = LogicOp.AND

    results: List[bool] = []
    conditions = group.get("conditions") or []
    for cond in conditions:
        results.append(evaluate_condition(cond, df, idx))

    if not results:
        return False

    if logic == LogicOp.AND:
        return all(results)
    return any(results)


def should_open_long(rule_set: Any, df: pd.DataFrame, idx: int) -> bool:
    """判断是否触发开多买入信号"""
    norm = normalize_rule_set(rule_set)
    groups = norm.get("open_long_groups") or norm.get("buy_groups") or []
    for group in groups:
        if evaluate_group(group, df, idx, Side.OPEN_LONG):
            return True
    return False


def should_close_long(rule_set: Any, df: pd.DataFrame, idx: int) -> bool:
    """判断是否触发平多卖出信号"""
    norm = normalize_rule_set(rule_set)
    groups = norm.get("close_long_groups") or norm.get("sell_groups") or []
    for group in groups:
        if evaluate_group(group, df, idx, Side.CLOSE_LONG):
            return True
    return False


def should_open_short(rule_set: Any, df: pd.DataFrame, idx: int) -> bool:
    """判断是否触发开空卖出信号"""
    norm = normalize_rule_set(rule_set)
    groups = norm.get("open_short_groups") or []
    for group in groups:
        if evaluate_group(group, df, idx, Side.OPEN_SHORT):
            return True
    return False


def should_close_short(rule_set: Any, df: pd.DataFrame, idx: int) -> bool:
    """判断是否触发平空买入信号"""
    norm = normalize_rule_set(rule_set)
    groups = norm.get("close_short_groups") or []
    for group in groups:
        if evaluate_group(group, df, idx, Side.CLOSE_SHORT):
            return True
    return False


# 兼容老版调用
should_buy = should_open_long
should_sell = should_close_long


