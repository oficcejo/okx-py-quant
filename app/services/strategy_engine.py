from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional

import pandas as pd


class Side(str, Enum):
    BUY = "BUY"
    SELL = "SELL"


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
        indicator_type = IndicatorType(cond["indicator_type"])
        signal_type = SignalType(cond["signal_type"])
    except Exception:
        return False

    try:
        if indicator_type == IndicatorType.RSI and signal_type == SignalType.RSI_OVERSOLD:
            value = df["rsi"].iloc[idx]
            threshold = cond.get("params", {}).get("threshold", 30)
            return value < threshold

        if indicator_type == IndicatorType.RSI and signal_type == SignalType.RSI_OVERBOUGHT:
            value = df["rsi"].iloc[idx]
            threshold = cond.get("params", {}).get("threshold", 70)
            return value > threshold

        if indicator_type == IndicatorType.MACD:
            macd = df["macd"]
            signal = df["macd_signal"]

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
                return macd.iloc[idx] > 0

            if signal_type == SignalType.MACD_BELOW_ZERO:
                return macd.iloc[idx] < 0

        if indicator_type == IndicatorType.CANDLE:
            open_price = df["open"].iloc[idx]
            close_price = df["close"].iloc[idx]
            high_price = df["high"].iloc[idx]
            low_price = df["low"].iloc[idx]
            
            if signal_type == SignalType.CANDLE_BAREFOOT_BEARISH:
                tolerance = cond.get("params", {}).get("tolerance", 0.0001)
                is_bearish = close_price < open_price
                is_barefoot = abs(close_price - low_price) / low_price < tolerance
                return is_bearish and is_barefoot
            
            if signal_type == SignalType.CANDLE_BAREFOOT_BULLISH:
                tolerance = cond.get("params", {}).get("tolerance", 0.0001)
                is_bullish = close_price > open_price
                is_barefoot = abs(close_price - high_price) / high_price < tolerance
                return is_bullish and is_barefoot
            
            if signal_type == SignalType.CANDLE_BALD_BEARISH:
                tolerance = cond.get("params", {}).get("tolerance", 0.0001)
                is_bearish = close_price < open_price
                is_bald = abs(open_price - high_price) / high_price < tolerance
                return is_bearish and is_bald
            
            if signal_type == SignalType.CANDLE_BALD_BULLISH:
                tolerance = cond.get("params", {}).get("tolerance", 0.0001)
                is_bullish = close_price > open_price
                is_bald = abs(close_price - high_price) / high_price < tolerance
                return is_bullish and is_bald
            
            # 十字星
            if signal_type == SignalType.CANDLE_DOJI:
                body = abs(close_price - open_price)
                range_size = high_price - low_price
                return body / range_size < 0.1 if range_size > 0 else False
            
            # 大阳线
            if signal_type == SignalType.CANDLE_BIG_YANG:
                body = close_price - open_price
                range_size = high_price - low_price
                return body > 0 and body / range_size > 0.7 if range_size > 0 else False
            
            # 大阴线
            if signal_type == SignalType.CANDLE_BIG_YIN:
                body = open_price - close_price
                range_size = high_price - low_price
                return body > 0 and body / range_size > 0.7 if range_size > 0 else False
            
            # 长上影线
            if signal_type == SignalType.CANDLE_LONG_UPPER_SHADOW:
                upper_shadow = high_price - max(open_price, close_price)
                body = abs(close_price - open_price)
                return upper_shadow > body * 2
            
            # 看涨吞没
            if signal_type == SignalType.CANDLE_BULLISH_ENGULFING:
                if idx == 0:
                    return False
                prev_open = df["open"].iloc[idx - 1]
                prev_close = df["close"].iloc[idx - 1]
                is_prev_bearish = prev_close < prev_open
                is_curr_bullish = close_price > open_price
                engulfing = close_price > prev_open and open_price < prev_close
                return is_prev_bearish and is_curr_bullish and engulfing
            
            # 看跌吞没
            if signal_type == SignalType.CANDLE_BEARISH_ENGULFING:
                if idx == 0:
                    return False
                prev_open = df["open"].iloc[idx - 1]
                prev_close = df["close"].iloc[idx - 1]
                is_prev_bullish = prev_close > prev_open
                is_curr_bearish = close_price < open_price
                engulfing = close_price < prev_open and open_price > prev_close
                return is_prev_bullish and is_curr_bearish and engulfing

        # KDJ 指标
        if indicator_type == IndicatorType.KDJ:
            k = df["kdj_k"].iloc[idx]
            d = df["kdj_d"].iloc[idx]
            j = df["kdj_j"].iloc[idx]
            
            if signal_type == SignalType.KDJ_GOLDEN_CROSS:
                if idx == 0:
                    return False
                prev_k = df["kdj_k"].iloc[idx - 1]
                prev_d = df["kdj_d"].iloc[idx - 1]
                return prev_k <= prev_d and k > d
            
            if signal_type == SignalType.KDJ_DEAD_CROSS:
                if idx == 0:
                    return False
                prev_k = df["kdj_k"].iloc[idx - 1]
                prev_d = df["kdj_d"].iloc[idx - 1]
                return prev_k >= prev_d and k < d
            
            if signal_type == SignalType.KDJ_OVERSOLD:
                threshold = cond.get("params", {}).get("threshold", 20)
                return j < threshold
            
            if signal_type == SignalType.KDJ_OVERBOUGHT:
                threshold = cond.get("params", {}).get("threshold", 80)
                return j > threshold

        # 布林带 (BOLL)
        if indicator_type == IndicatorType.BOLL:
            close = df["close"].iloc[idx]
            upper = df["boll_upper"].iloc[idx]
            middle = df["boll_middle"].iloc[idx]
            lower = df["boll_lower"].iloc[idx]
            width = df["boll_width"].iloc[idx]
            
            if signal_type == SignalType.BOLL_BREAK_UPPER:
                if idx == 0:
                    return False
                prev_close = df["close"].iloc[idx - 1]
                prev_upper = df["boll_upper"].iloc[idx - 1]
                return prev_close <= prev_upper and close > upper
            
            if signal_type == SignalType.BOLL_BREAK_LOWER:
                if idx == 0:
                    return False
                prev_close = df["close"].iloc[idx - 1]
                prev_lower = df["boll_lower"].iloc[idx - 1]
                return prev_close >= prev_lower and close < lower

        # BBI
        if indicator_type == IndicatorType.BBI:
            close = df["close"].iloc[idx]
            bbi = df["bbi"].iloc[idx]
            
            if signal_type == SignalType.BBI_PRICE_CROSS_UP:
                if idx == 0:
                    return False
                prev_close = df["close"].iloc[idx - 1]
                prev_bbi = df["bbi"].iloc[idx - 1]
                return prev_close <= prev_bbi and close > bbi
            
            if signal_type == SignalType.BBI_PRICE_CROSS_DOWN:
                if idx == 0:
                    return False
                prev_close = df["close"].iloc[idx - 1]
                prev_bbi = df["bbi"].iloc[idx - 1]
                return prev_close >= prev_bbi and close < bbi

        # CCI
        if indicator_type == IndicatorType.CCI:
            cci = df["cci"].iloc[idx]
            
            if signal_type == SignalType.CCI_BELOW_NEG100:
                return cci < -100
            
            if signal_type == SignalType.CCI_ABOVE_100:
                return cci > 100

        # 均线 (MA)
        if indicator_type == IndicatorType.MA:
            close = df["close"].iloc[idx]
            
            # 价格突破均线
            if signal_type == SignalType.MA_PRICE_ABOVE_MA5:
                return close > df["ma5"].iloc[idx]
            if signal_type == SignalType.MA_PRICE_ABOVE_MA10:
                return close > df["ma10"].iloc[idx]
            if signal_type == SignalType.MA_PRICE_ABOVE_MA20:
                return close > df["ma20"].iloc[idx]
            if signal_type == SignalType.MA_PRICE_ABOVE_MA30:
                return close > df["ma30"].iloc[idx]
            if signal_type == SignalType.MA_PRICE_ABOVE_MA60:
                return close > df["ma60"].iloc[idx]
            
            if signal_type == SignalType.MA_PRICE_BELOW_MA5:
                return close < df["ma5"].iloc[idx]
            if signal_type == SignalType.MA_PRICE_BELOW_MA10:
                return close < df["ma10"].iloc[idx]
            if signal_type == SignalType.MA_PRICE_BELOW_MA20:
                return close < df["ma20"].iloc[idx]
            if signal_type == SignalType.MA_PRICE_BELOW_MA30:
                return close < df["ma30"].iloc[idx]
            if signal_type == SignalType.MA_PRICE_BELOW_MA60:
                return close < df["ma60"].iloc[idx]
            
            # 均线金叉/死叉
            if signal_type == SignalType.MA_MA5_CROSS_MA10:
                if idx == 0:
                    return False
                prev_ma5 = df["ma5"].iloc[idx - 1]
                prev_ma10 = df["ma10"].iloc[idx - 1]
                curr_ma5 = df["ma5"].iloc[idx]
                curr_ma10 = df["ma10"].iloc[idx]
                return prev_ma5 <= prev_ma10 and curr_ma5 > curr_ma10
            
            if signal_type == SignalType.MA_MA5_DEAD_CROSS_MA10:
                if idx == 0:
                    return False
                prev_ma5 = df["ma5"].iloc[idx - 1]
                prev_ma10 = df["ma10"].iloc[idx - 1]
                curr_ma5 = df["ma5"].iloc[idx]
                curr_ma10 = df["ma10"].iloc[idx]
                return prev_ma5 >= prev_ma10 and curr_ma5 < curr_ma10
            
            # 多头/空头排列
            if signal_type == SignalType.MA_BULLISH_ARRANGE_5_10_20:
                ma5 = df["ma5"].iloc[idx]
                ma10 = df["ma10"].iloc[idx]
                ma20 = df["ma20"].iloc[idx]
                return ma5 > ma10 > ma20
            
            if signal_type == SignalType.MA_BEARISH_ARRANGE_5_10_20:
                ma5 = df["ma5"].iloc[idx]
                ma10 = df["ma10"].iloc[idx]
                ma20 = df["ma20"].iloc[idx]
                return ma5 < ma10 < ma20

    except KeyError:
        return False

    return False


def evaluate_group(group: ConditionGroup, df: pd.DataFrame, idx: int, side: Side) -> bool:
    logic = LogicOp(group["logic"])
    results: List[bool] = []
    for cond in group["conditions"]:
        if Side(cond["side"]) != side:
            continue
        results.append(evaluate_condition(cond, df, idx))

    if not results:
        return False

    if logic == LogicOp.AND:
        return all(results)
    return any(results)


def should_buy(rule_set: StrategyRuleSet, df: pd.DataFrame, idx: int) -> bool:
    for group in rule_set.get("buy_groups", []):
        if evaluate_group(group, df, idx, Side.BUY):
            return True
    return False


def should_sell(rule_set: StrategyRuleSet, df: pd.DataFrame, idx: int) -> bool:
    for group in rule_set.get("sell_groups", []):
        if evaluate_group(group, df, idx, Side.SELL):
            return True
    return False
