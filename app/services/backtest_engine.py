from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List

import numpy as np
import pandas as pd

from app.models import BacktestTrade
from app.services.strategy_engine import (
    StrategyRuleSet,
    should_buy,
    should_sell,
    should_open_long,
    should_close_long,
    should_open_short,
    should_close_short,
)



def compute_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """计算所有技术指标（包含高精度 Wilder RSI、完整 MA 均线族、MACD、KDJ、BOLL、BBI、CCI 等）"""
    close = df["close"].astype(float)
    high = df["high"].astype(float)
    low = df["low"].astype(float)
    open_price = df["open"].astype(float)

    # 1. MACD (DIF, DEA, HIST)
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    macd = ema12 - ema26
    macd_signal = macd.ewm(span=9, adjust=False).mean()
    macd_hist = macd - macd_signal

    df["macd"] = macd
    df["macd_signal"] = macd_signal
    df["macd_hist"] = macd_hist

    # 2. RSI (Wilder RMA 平滑法，支持 6, 12, 14, 24 周期及金叉死叉判断)
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    for w in [6, 12, 14, 24]:
        avg_gain = gain.ewm(alpha=1.0 / w, min_periods=w, adjust=False).mean()
        avg_loss = loss.ewm(alpha=1.0 / w, min_periods=w, adjust=False).mean()
        rs = avg_gain / avg_loss.replace(0, np.nan)
        rsi_series = 100.0 - (100.0 / (1.0 + rs))
        df[f"rsi{w}"] = rsi_series.fillna(50.0)
    df["rsi"] = df["rsi14"]

    # 3. KDJ (中国交易所标准 9, 3, 3)
    low_9 = low.rolling(window=9, min_periods=1).min()
    high_9 = high.rolling(window=9, min_periods=1).max()
    rsv = (close - low_9) / (high_9 - low_9).replace(0, np.nan) * 100.0
    rsv = rsv.fillna(50.0)
    k = rsv.ewm(com=2, adjust=False).mean()
    d = k.ewm(com=2, adjust=False).mean()
    j = 3.0 * k - 2.0 * d
    df["kdj_k"] = k
    df["kdj_d"] = d
    df["kdj_j"] = j

    # 4. 布林带 (BOLL, 20, 2)
    ma20 = close.rolling(window=20, min_periods=1).mean()
    std20 = close.rolling(window=20, min_periods=1).std(ddof=0).fillna(0.0)
    boll_upper = ma20 + 2.0 * std20
    boll_middle = ma20
    boll_lower = ma20 - 2.0 * std20
    boll_width = (boll_upper - boll_lower) / boll_middle.replace(0, np.nan)
    df["boll_upper"] = boll_upper
    df["boll_middle"] = boll_middle
    df["boll_lower"] = boll_lower
    df["boll_width"] = boll_width.fillna(0.0)

    # 5. BBI (多空指标 3, 6, 12, 24)
    ma3 = close.rolling(window=3, min_periods=1).mean()
    ma6 = close.rolling(window=6, min_periods=1).mean()
    ma12 = close.rolling(window=12, min_periods=1).mean()
    ma24 = close.rolling(window=24, min_periods=1).mean()
    df["bbi"] = (ma3 + ma6 + ma12 + ma24) / 4.0

    # 6. CCI (顺势指标 14)
    tp = (high + low + close) / 3.0
    ma_tp = tp.rolling(window=14, min_periods=1).mean()
    md = tp.rolling(window=14, min_periods=1).apply(lambda x: np.abs(x - x.mean()).mean(), raw=True)
    cci = (tp - ma_tp) / (0.015 * md.replace(0, np.nan))
    df["cci"] = cci.fillna(0.0)

    # 7. 均线族 (MA)
    df["ma3"] = ma3
    df["ma5"] = close.rolling(window=5, min_periods=1).mean()
    df["ma6"] = ma6
    df["ma10"] = close.rolling(window=10, min_periods=1).mean()
    df["ma12"] = ma12
    df["ma15"] = close.rolling(window=15, min_periods=1).mean()
    df["ma20"] = ma20
    df["ma24"] = ma24
    df["ma30"] = close.rolling(window=30, min_periods=1).mean()
    df["ma60"] = close.rolling(window=60, min_periods=1).mean()
    df["ma120"] = close.rolling(window=120, min_periods=1).mean()

    return df


@dataclass
class BacktestResult:
    trades: List[BacktestTrade]
    trades_list: List[Dict[str, Any]]
    equity_curve: List[Dict[str, Any]]
    benchmark_curve: List[Dict[str, Any]]
    total_return: float = 0.0  # 策略总收益率(%)
    benchmark_return: float = 0.0  # 基准收益率(%)
    win_rate: float = 0.0  # 胜率(%)
    sharpe_ratio: float = 0.0  # 夏普比率
    max_drawdown: float = 0.0  # 最大回撤(%)
    profit_factor: float = 0.0  # 盈亏比
    trade_count: int = 0  # 总交易次数
    win_count: int = 0  # 盈利笔数
    loss_count: int = 0  # 亏损笔数
    avg_trade_pnl: float = 0.0  # 平均每笔盈亏
    avg_pnl_pct: float = 0.0  # 平均单笔收益率(%)
    max_win: float = 0.0  # 单笔最大盈利
    max_profit: float = 0.0  # 单笔最大盈利
    max_loss: float = 0.0  # 单笔最大亏损



def run_backtest(
    df: pd.DataFrame,
    rule_set: StrategyRuleSet,
    initial_balance: float = 10000.0,
    stop_loss_pct: Optional[float] = None,
    take_profit_pct: Optional[float] = None,
    trailing_stop_pct: Optional[float] = None,
    fee_rate: float = 0.0,
    slippage_pct: float = 0.0,
) -> BacktestResult:
    """运行回测，支持多空双向、止损、止盈、追踪止损、手续费与滑点模拟，并生成逐笔交易明细和基准收益对比"""
    df = compute_indicators(df)

    cash = initial_balance
    position = 0.0
    entry_price = 0.0
    entry_ts: Optional[datetime] = None
    entry_idx: int = 0
    highest_price_since_entry = 0.0

    trades: List[BacktestTrade] = []
    trades_list: List[Dict[str, Any]] = []
    equity_curve: List[Dict[str, Any]] = []
    benchmark_curve: List[Dict[str, Any]] = []

    first_close = float(df.iloc[0]["close"]) if len(df) > 0 else 1.0

    for idx in range(len(df)):
        row = df.iloc[idx]
        raw_ts = row["ts"]
        ts = raw_ts if isinstance(raw_ts, datetime) else datetime.fromisoformat(str(raw_ts))
        close_price = float(row["close"])
        high_price = float(row["high"])
        low_price = float(row["low"])
        exited_this_bar = False

        # 计算买入并持有基准净值
        benchmark_equity = (close_price / first_close) * initial_balance
        benchmark_curve.append({"ts": ts.isoformat(), "equity": benchmark_equity})

        # 检查多头持仓平仓触发条件
        if position > 0:
            highest_price_since_entry = max(highest_price_since_entry, high_price)
            exit_reason: Optional[str] = None
            exit_price = close_price

            # 1. 多头止损判断 (Stop Loss)
            if stop_loss_pct is not None and stop_loss_pct > 0:
                sl_price = entry_price * (1.0 - stop_loss_pct / 100.0)
                if low_price <= sl_price:
                    exit_reason = "STOP_LOSS"
                    exit_price = min(close_price, sl_price)

            # 2. 多头止盈判断 (Take Profit)
            if exit_reason is None and take_profit_pct is not None and take_profit_pct > 0:
                tp_price = entry_price * (1.0 + take_profit_pct / 100.0)
                if high_price >= tp_price:
                    exit_reason = "TAKE_PROFIT"
                    exit_price = max(close_price, tp_price)

            # 3. 多头移动追踪止损 (Trailing Stop)
            if exit_reason is None and trailing_stop_pct is not None and trailing_stop_pct > 0:
                trailing_trigger_price = entry_price * (1.0 + trailing_stop_pct / 100.0)
                if highest_price_since_entry >= trailing_trigger_price:
                    trailing_stop_line = highest_price_since_entry * (1.0 - trailing_stop_pct / 100.0)
                    if low_price <= trailing_stop_line:
                        exit_reason = "TRAILING_STOP"
                        exit_price = min(close_price, trailing_stop_line)

            # 4. 多头常规平仓信号 (Close Long)
            if exit_reason is None and (should_close_long(rule_set, df, idx) or should_sell(rule_set, df, idx)):
                exit_reason = "SIGNAL_CLOSE_LONG"
                exit_price = close_price

            # 执行多头平仓
            if exit_reason is not None:
                exited_this_bar = True
                effective_exit_price = exit_price * (1.0 - slippage_pct)
                gross_revenue = position * effective_exit_price
                exit_fee = gross_revenue * fee_rate
                net_revenue = gross_revenue - exit_fee
                cash += net_revenue

                entry_cost = position * entry_price
                entry_fee = entry_cost * fee_rate
                total_fee = entry_fee + exit_fee
                trade_pnl = net_revenue - (entry_cost + entry_fee)
                trade_pnl_pct = (trade_pnl / (entry_cost + entry_fee)) * 100.0

                trades.append(
                    BacktestTrade(
                        backtest_id=0,
                        side="SELL",
                        ts=ts,
                        price=effective_exit_price,
                        qty=position,
                        fee=exit_fee,
                        pnl=trade_pnl,
                    )
                )

                holding_bars = idx - entry_idx
                trades_list.append(
                    {
                        "id": len(trades_list) + 1,
                        "position_side": "LONG",
                        "entry_time": entry_ts.isoformat() if entry_ts else ts.isoformat(),
                        "entry_price": round(entry_price, 4),
                        "exit_time": ts.isoformat(),
                        "exit_price": round(effective_exit_price, 4),
                        "qty": round(position, 4),
                        "pnl": round(trade_pnl, 2),
                        "pnl_pct": round(trade_pnl_pct, 2),
                        "fee": round(total_fee, 2),
                        "exit_reason": exit_reason,
                        "holding_bars": holding_bars,
                    }
                )

                position = 0.0
                entry_price = 0.0
                entry_ts = None
                highest_price_since_entry = 0.0

        # 检查空头持仓平仓触发条件
        elif position < 0:
            abs_pos = abs(position)
            lowest_price_since_entry = min(lowest_price_since_entry, low_price)
            exit_reason = None
            exit_price = close_price

            # 1. 空头止损判断 (价格上涨达到阈值止损)
            if stop_loss_pct is not None and stop_loss_pct > 0:
                sl_price = entry_price * (1.0 + stop_loss_pct / 100.0)
                if high_price >= sl_price:
                    exit_reason = "STOP_LOSS"
                    exit_price = max(close_price, sl_price)

            # 2. 空头止盈判断 (价格下跌达到目标止盈)
            if exit_reason is None and take_profit_pct is not None and take_profit_pct > 0:
                tp_price = entry_price * (1.0 - take_profit_pct / 100.0)
                if low_price <= tp_price:
                    exit_reason = "TAKE_PROFIT"
                    exit_price = min(close_price, tp_price)

            # 3. 空头移动追踪止损 (从低点回弹超过追踪幅度)
            if exit_reason is None and trailing_stop_pct is not None and trailing_stop_pct > 0:
                trailing_trigger_price = entry_price * (1.0 - trailing_stop_pct / 100.0)
                if lowest_price_since_entry <= trailing_trigger_price:
                    trailing_stop_line = lowest_price_since_entry * (1.0 + trailing_stop_pct / 100.0)
                    if high_price >= trailing_stop_line:
                        exit_reason = "TRAILING_STOP"
                        exit_price = max(close_price, trailing_stop_line)

            # 4. 空头常规平仓信号 (Close Short)
            if exit_reason is None and should_close_short(rule_set, df, idx):
                exit_reason = "SIGNAL_CLOSE_SHORT"
                exit_price = close_price

            # 执行空头平仓
            if exit_reason is not None:
                exited_this_bar = True
                effective_exit_price = exit_price * (1.0 + slippage_pct)
                cover_cost = abs_pos * effective_exit_price
                exit_fee = cover_cost * fee_rate

                entry_cost = abs_pos * entry_price
                entry_fee = entry_cost * fee_rate
                total_fee = entry_fee + exit_fee

                # 空头盈利 = (开仓价 - 平仓价) * 数量 - 手续费
                trade_pnl = (entry_price - effective_exit_price) * abs_pos - total_fee
                trade_pnl_pct = (trade_pnl / (entry_cost + entry_fee)) * 100.0
                cash += (entry_cost + trade_pnl)

                trades.append(
                    BacktestTrade(
                        backtest_id=0,
                        side="BUY",  # 平空为买入平仓
                        ts=ts,
                        price=effective_exit_price,
                        qty=abs_pos,
                        fee=exit_fee,
                        pnl=trade_pnl,
                    )
                )

                holding_bars = idx - entry_idx
                trades_list.append(
                    {
                        "id": len(trades_list) + 1,
                        "position_side": "SHORT",
                        "entry_time": entry_ts.isoformat() if entry_ts else ts.isoformat(),
                        "entry_price": round(entry_price, 4),
                        "exit_time": ts.isoformat(),
                        "exit_price": round(effective_exit_price, 4),
                        "qty": round(abs_pos, 4),
                        "pnl": round(trade_pnl, 2),
                        "pnl_pct": round(trade_pnl_pct, 2),
                        "fee": round(total_fee, 2),
                        "exit_reason": exit_reason,
                        "holding_bars": holding_bars,
                    }
                )

                position = 0.0
                entry_price = 0.0
                entry_ts = None
                lowest_price_since_entry = float("inf")

        # 检查空仓时的开仓信号 (做多或做空)
        if position == 0 and not exited_this_bar:
            if should_open_long(rule_set, df, idx) or should_buy(rule_set, df, idx):

                effective_entry_price = close_price * (1.0 + slippage_pct)
                buy_fee = cash * fee_rate
                usable_cash = cash - buy_fee
                if usable_cash > 0:
                    size = usable_cash / effective_entry_price
                    position = size
                    entry_price = effective_entry_price
                    entry_ts = ts
                    entry_idx = idx
                    highest_price_since_entry = effective_entry_price
                    cash = 0.0

                    trades.append(
                        BacktestTrade(
                            backtest_id=0,
                            side="BUY",
                            ts=ts,
                            price=effective_entry_price,
                            qty=size,
                            fee=buy_fee,
                            pnl=0.0,
                        )
                    )

            elif should_open_short(rule_set, df, idx):
                effective_entry_price = close_price * (1.0 - slippage_pct)
                short_fee = cash * fee_rate
                usable_cash = cash - short_fee
                if usable_cash > 0:
                    size = usable_cash / effective_entry_price
                    position = -size  # 负数表示空头仓位
                    entry_price = effective_entry_price
                    entry_ts = ts
                    entry_idx = idx
                    lowest_price_since_entry = effective_entry_price
                    cash = 0.0

                    trades.append(
                        BacktestTrade(
                            backtest_id=0,
                            side="SELL",  # 开空为卖出开仓
                            ts=ts,
                            price=effective_entry_price,
                            qty=size,
                            fee=short_fee,
                            pnl=0.0,
                        )
                    )

        # 计算当前动态权益
        if position > 0:
            current_equity = cash + (position * close_price)
        elif position < 0:
            abs_pos = abs(position)
            unrealized_pnl = (entry_price - close_price) * abs_pos
            current_equity = (abs_pos * entry_price) + unrealized_pnl
        else:
            current_equity = cash

        equity_curve.append({"ts": ts.isoformat(), "equity": max(current_equity, 0.0)})


    # 计算整体统计指标
    total_return = 0.0
    benchmark_return = 0.0
    win_rate = 0.0
    sharpe_ratio = 0.0
    max_drawdown = 0.0
    profit_factor = 0.0
    win_count = 0
    loss_count = 0
    avg_trade_pnl = 0.0
    max_win = 0.0
    max_loss = 0.0

    if equity_curve:
        final_equity = equity_curve[-1]["equity"]
        total_return = ((final_equity - initial_balance) / initial_balance) * 100.0

        if benchmark_curve:
            final_bench = benchmark_curve[-1]["equity"]
            benchmark_return = ((final_bench - initial_balance) / initial_balance) * 100.0

        # 交易统计分析
        if trades_list:
            pnls = [t["pnl"] for t in trades_list]
            win_pnls = [p for p in pnls if p > 0]
            loss_pnls = [p for p in pnls if p <= 0]
            win_count = len(win_pnls)
            loss_count = len(loss_pnls)
            win_rate = (win_count / len(trades_list)) * 100.0
            avg_trade_pnl = float(np.mean(pnls)) if pnls else 0.0
            max_win = max(pnls) if pnls else 0.0
            max_loss = min(pnls) if pnls else 0.0

            total_profit = sum(win_pnls)
            total_loss = abs(sum(loss_pnls))
            if total_loss > 0:
                profit_factor = total_profit / total_loss
            elif total_profit > 0:
                profit_factor = 999.0

        # 计算最大回撤
        peak = initial_balance
        max_dd = 0.0
        for point in equity_curve:
            equity_val = point["equity"]
            if equity_val > peak:
                peak = equity_val
            drawdown = (peak - equity_val) / peak * 100.0
            if drawdown > max_dd:
                max_dd = drawdown
        max_drawdown = max_dd

        # 计算夏普比率
        if len(equity_curve) > 1:
            returns = []
            for i in range(1, len(equity_curve)):
                prev_equity = equity_curve[i - 1]["equity"]
                curr_equity = equity_curve[i]["equity"]
                if prev_equity > 0:
                    ret = (curr_equity - prev_equity) / prev_equity
                    returns.append(ret)

            if returns:
                mean_return = np.mean(returns)
                std_return = np.std(returns)
                if std_return > 0:
                    sharpe_ratio = float((mean_return / std_return) * np.sqrt(252))

    return BacktestResult(
        trades=trades,
        trades_list=trades_list,
        equity_curve=equity_curve,
        benchmark_curve=benchmark_curve,
        total_return=total_return,
        benchmark_return=benchmark_return,
        win_rate=win_rate,
        sharpe_ratio=sharpe_ratio,
        max_drawdown=max_drawdown,
        profit_factor=profit_factor,
        trade_count=len(trades_list),
        win_count=win_count,
        loss_count=loss_count,
        avg_trade_pnl=avg_trade_pnl,
        max_win=max_win,
        max_loss=max_loss,
    )

