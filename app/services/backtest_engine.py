from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List

import numpy as np
import pandas as pd

from app.models import BacktestTrade
from app.services.strategy_engine import StrategyRuleSet, should_buy, should_sell


def compute_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """计算所有技术指标"""
    close = df["close"].astype(float)
    high = df["high"].astype(float)
    low = df["low"].astype(float)
    open_price = df["open"].astype(float)

    # MACD
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    macd = ema12 - ema26
    macd_signal = macd.ewm(span=9, adjust=False).mean()
    macd_hist = macd - macd_signal

    df["macd"] = macd
    df["macd_signal"] = macd_signal
    df["macd_hist"] = macd_hist

    # RSI
    window = 14
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.rolling(window=window, min_periods=window).mean()
    avg_loss = loss.rolling(window=window, min_periods=window).mean()
    rs = avg_gain / avg_loss.replace(0, pd.NA)
    rsi = 100 - (100 / (1 + rs))
    df["rsi"] = rsi

    # KDJ
    low_9 = low.rolling(window=9, min_periods=1).min()
    high_9 = high.rolling(window=9, min_periods=1).max()
    rsv = (close - low_9) / (high_9 - low_9) * 100
    rsv = rsv.fillna(50)
    k = rsv.ewm(com=2, adjust=False).mean()
    d = k.ewm(com=2, adjust=False).mean()
    j = 3 * k - 2 * d
    df["kdj_k"] = k
    df["kdj_d"] = d
    df["kdj_j"] = j

    # 布林带 (BOLL)
    ma20 = close.rolling(window=20, min_periods=1).mean()
    std20 = close.rolling(window=20, min_periods=1).std()
    boll_upper = ma20 + 2 * std20
    boll_middle = ma20
    boll_lower = ma20 - 2 * std20
    boll_width = (boll_upper - boll_lower) / boll_middle
    df["boll_upper"] = boll_upper
    df["boll_middle"] = boll_middle
    df["boll_lower"] = boll_lower
    df["boll_width"] = boll_width

    # BBI (多空指标)
    ma3 = close.rolling(window=3, min_periods=1).mean()
    ma6 = close.rolling(window=6, min_periods=1).mean()
    ma12 = close.rolling(window=12, min_periods=1).mean()
    ma24 = close.rolling(window=24, min_periods=1).mean()
    bbi = (ma3 + ma6 + ma12 + ma24) / 4
    df["bbi"] = bbi

    # CCI (顺势指标)
    tp = (high + low + close) / 3
    ma_tp = tp.rolling(window=14, min_periods=1).mean()
    md = tp.rolling(window=14, min_periods=1).apply(lambda x: np.abs(x - x.mean()).mean(), raw=True)
    cci = (tp - ma_tp) / (0.015 * md)
    df["cci"] = cci

    # 均线 (MA)
    df["ma3"] = close.rolling(window=3, min_periods=1).mean()
    df["ma5"] = close.rolling(window=5, min_periods=1).mean()
    df["ma10"] = close.rolling(window=10, min_periods=1).mean()
    df["ma15"] = close.rolling(window=15, min_periods=1).mean()
    df["ma20"] = close.rolling(window=20, min_periods=1).mean()
    df["ma30"] = close.rolling(window=30, min_periods=1).mean()
    df["ma60"] = close.rolling(window=60, min_periods=1).mean()

    return df


@dataclass
class BacktestResult:
    trades: List[BacktestTrade]
    equity_curve: List[Dict[str, Any]]
    total_return: float = 0.0  # 总收益率
    win_rate: float = 0.0  # 胜率
    sharpe_ratio: float = 0.0  # 夏普比率
    max_drawdown: float = 0.0  # 最大回撤
    profit_factor: float = 0.0  # 盈亏比


def run_backtest(df: pd.DataFrame, rule_set: StrategyRuleSet, initial_balance: float = 1000.0) -> BacktestResult:
    df = compute_indicators(df)

    cash = initial_balance
    position = 0.0
    entry_price = 0.0

    trades: List[BacktestTrade] = []
    equity_curve: List[Dict[str, Any]] = []

    for idx in range(len(df)):
        row = df.iloc[idx]
        ts = row["ts"] if isinstance(row["ts"], datetime) else datetime.fromisoformat(str(row["ts"]))
        price = float(row["close"])

        if position <= 0 and should_buy(rule_set, df, idx):
            size = cash / price
            position = size
            entry_price = price
            cash = 0.0

            trades.append(
                BacktestTrade(
                    backtest_id=0,
                    side="BUY",
                    ts=ts,
                    price=price,
                    qty=size,
                    fee=0.0,
                    pnl=0.0,
                )
            )

        elif position > 0 and should_sell(rule_set, df, idx):
            cash = position * price
            pnl = (price - entry_price) * position

            trades.append(
                BacktestTrade(
                    backtest_id=0,
                    side="SELL",
                    ts=ts,
                    price=price,
                    qty=position,
                    fee=0.0,
                    pnl=pnl,
                )
            )

            position = 0.0
            entry_price = 0.0

        equity = cash + position * price
        equity_curve.append({"ts": ts.isoformat(), "equity": equity})
    
    # 计算统计指标
    total_return = 0.0
    win_rate = 0.0
    sharpe_ratio = 0.0
    max_drawdown = 0.0
    profit_factor = 0.0
    
    if equity_curve:
        final_equity = equity_curve[-1]["equity"]
        total_return = ((final_equity - initial_balance) / initial_balance) * 100
        
        # 计算胜率
        sell_trades = [t for t in trades if t.side == "SELL"]
        if sell_trades:
            winning_trades = [t for t in sell_trades if t.pnl > 0]
            win_rate = (len(winning_trades) / len(sell_trades)) * 100
            
            # 计算盈亏比
            total_profit = sum(t.pnl for t in sell_trades if t.pnl > 0)
            total_loss = abs(sum(t.pnl for t in sell_trades if t.pnl < 0))
            if total_loss > 0:
                profit_factor = total_profit / total_loss
        
        # 计算最大回撤
        peak = initial_balance
        max_dd = 0.0
        for point in equity_curve:
            equity_val = point["equity"]
            if equity_val > peak:
                peak = equity_val
            drawdown = (peak - equity_val) / peak * 100
            if drawdown > max_dd:
                max_dd = drawdown
        max_drawdown = max_dd
        
        # 计算夏普比率（简化版）
        if len(equity_curve) > 1:
            returns = []
            for i in range(1, len(equity_curve)):
                prev_equity = equity_curve[i-1]["equity"]
                curr_equity = equity_curve[i]["equity"]
                if prev_equity > 0:
                    ret = (curr_equity - prev_equity) / prev_equity
                    returns.append(ret)
            
            if returns:
                mean_return = np.mean(returns)
                std_return = np.std(returns)
                if std_return > 0:
                    # 假设无风险收益率0，年化因子为252（交易日）
                    sharpe_ratio = (mean_return / std_return) * np.sqrt(252)

    return BacktestResult(
        trades=trades, 
        equity_curve=equity_curve,
        total_return=total_return,
        win_rate=win_rate,
        sharpe_ratio=sharpe_ratio,
        max_drawdown=max_drawdown,
        profit_factor=profit_factor
    )
