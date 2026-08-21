from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from app.services.backtest_engine import BacktestResult, run_backtest
from app.services.strategy_engine import StrategyRuleSet


@dataclass
class PortfolioStrategyConfig:
    strategy_id: int
    strategy_name: str
    weight: float  # 权重 0.0 - 1.0 (如 0.5)
    df: pd.DataFrame
    rule_set: StrategyRuleSet
    stop_loss_pct: Optional[float] = None
    take_profit_pct: Optional[float] = None
    trailing_stop_pct: Optional[float] = None


def run_portfolio_backtest(
    strategies: List[PortfolioStrategyConfig],
    initial_balance: float = 10000.0,
) -> Dict[str, Any]:
    """运行多策略投资组合回测，计算组合综合净值、分散风险指标与策略收益相关性矩阵"""
    if not strategies:
        return {"error": "未提供策略配置"}

    # 归一化权重
    total_weight = sum(s.weight for s in strategies)
    if total_weight <= 0:
        total_weight = 1.0

    individual_summaries: List[Dict[str, Any]] = []
    equity_series_map: Dict[str, pd.Series] = {}
    return_series_map: Dict[str, pd.Series] = {}

    all_trades: List[Dict[str, Any]] = []

    for s in strategies:
        norm_weight = s.weight / total_weight
        allocated_capital = initial_balance * norm_weight

        bt_res: BacktestResult = run_backtest(
            df=s.df,
            rule_set=s.rule_set,
            initial_balance=allocated_capital,
            stop_loss_pct=s.stop_loss_pct,
            take_profit_pct=s.take_profit_pct,
            trailing_stop_pct=s.trailing_stop_pct,
        )

        individual_summaries.append(
            {
                "strategy_id": s.strategy_id,
                "strategy_name": s.strategy_name,
                "weight_pct": round(norm_weight * 100, 1),
                "allocated_capital": round(allocated_capital, 2),
                "final_equity": round(bt_res.equity_curve[-1]["equity"] if bt_res.equity_curve else allocated_capital, 2),
                "total_return": round(bt_res.total_return, 2),
                "win_rate": round(bt_res.win_rate, 2),
                "sharpe_ratio": round(bt_res.sharpe_ratio, 3),
                "max_drawdown": round(bt_res.max_drawdown, 2),
                "trade_count": bt_res.trade_count,
            }
        )

        for t in bt_res.trades_list:
            t_copy = dict(t)
            t_copy["strategy_name"] = s.strategy_name
            all_trades.append(t_copy)

        # 构建时间序列
        if bt_res.equity_curve:
            ts_list = [p["ts"] for p in bt_res.equity_curve]
            eq_list = [p["equity"] for p in bt_res.equity_curve]
            s_eq = pd.Series(eq_list, index=pd.to_datetime(ts_list), name=s.strategy_name)
            s_eq = s_eq[~s_eq.index.duplicated(keep="first")]
            equity_series_map[s.strategy_name] = s_eq

            # 收益率序列
            ret_series = s_eq.pct_change().dropna()
            return_series_map[s.strategy_name] = ret_series

    # 合并净值曲线
    if equity_series_map:
        df_equities = pd.DataFrame(equity_series_map).ffill().bfill()
        df_equities["portfolio_equity"] = df_equities.sum(axis=1)

        portfolio_curve: List[Dict[str, Any]] = []

        for ts, row in df_equities.iterrows():
            portfolio_curve.append(
                {
                    "ts": ts.isoformat(),
                    "equity": round(float(row["portfolio_equity"]), 2),
                }
            )
    else:
        portfolio_curve = []

    # 计算组合统计指标
    portfolio_total_return = 0.0
    portfolio_sharpe = 0.0
    portfolio_max_dd = 0.0

    if portfolio_curve:
        final_eq = portfolio_curve[-1]["equity"]
        portfolio_total_return = ((final_eq - initial_balance) / initial_balance) * 100.0

        # 计算组合最大回撤
        peak = initial_balance
        max_dd = 0.0
        for p in portfolio_curve:
            eq_val = p["equity"]
            if eq_val > peak:
                peak = eq_val
            dd = (peak - eq_val) / peak * 100.0
            if dd > max_dd:
                max_dd = dd
        portfolio_max_dd = max_dd

        # 计算组合夏普比率
        if len(portfolio_curve) > 1:
            returns = []
            for i in range(1, len(portfolio_curve)):
                prev = portfolio_curve[i - 1]["equity"]
                curr = portfolio_curve[i]["equity"]
                if prev > 0:
                    returns.append((curr - prev) / prev)
            if returns:
                m = np.mean(returns)
                sd = np.std(returns)
                if sd > 0:
                    portfolio_sharpe = float((m / sd) * np.sqrt(252))

    # 计算策略收益相关性矩阵 (Correlation Matrix)
    correlation_matrix: List[Dict[str, Any]] = []
    strategy_names = list(return_series_map.keys())

    if len(strategy_names) >= 1:
        df_returns = pd.DataFrame(return_series_map).fillna(0.0)
        corr_df = df_returns.corr().fillna(0.0)

        for s1 in strategy_names:
            for s2 in strategy_names:
                correlation_matrix.append(
                    {
                        "source": s1,
                        "target": s2,
                        "correlation": round(float(corr_df.loc[s1, s2]), 3),
                    }
                )

    return {
        "portfolio_summary": {
            "initial_balance": initial_balance,
            "final_equity": round(portfolio_curve[-1]["equity"] if portfolio_curve else initial_balance, 2),
            "net_profit": round((portfolio_curve[-1]["equity"] if portfolio_curve else initial_balance) - initial_balance, 2),
            "total_return": round(portfolio_total_return, 2),
            "sharpe_ratio": round(portfolio_sharpe, 3),
            "max_drawdown": round(portfolio_max_dd, 2),
            "total_strategies": len(strategies),
            "total_trades": len(all_trades),
        },
        "portfolio_curve": portfolio_curve,
        "individual_summaries": individual_summaries,
        "correlation_matrix": correlation_matrix,
        "strategy_names": strategy_names,
    }
