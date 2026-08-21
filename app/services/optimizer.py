from __future__ import annotations

import copy
import itertools
import time
from typing import Any, Dict, List, Optional

import pandas as pd

from app.services.backtest_engine import BacktestResult, run_backtest
from app.services.strategy_engine import StrategyRuleSet


def _apply_param_to_rule_set(rule_set: Dict[str, Any], key: str, val: Any) -> Dict[str, Any]:
    """若参数属于指标内部参数（如 rsi_threshold / ma_fast 等），递归替换 rule_set 中的参数"""
    new_rule = copy.deepcopy(rule_set)

    # 遍历 buy_groups 和 sell_groups 中的 conditions
    for group_key in ["buy_groups", "sell_groups"]:
        if group_key in new_rule:
            for group in new_rule[group_key]:
                for cond in group.get("conditions", []):
                    params = cond.get("params", {})
                    # 匹配参数键，如 threshold, period 等
                    if key in params:
                        params[key] = val
                    elif key == "rsi_threshold" and cond.get("indicator_type") == "RSI":
                        params["threshold"] = val
                    elif key == "kdj_threshold" and cond.get("indicator_type") == "KDJ":
                        params["threshold"] = val

    return new_rule


def run_grid_search(
    df: pd.DataFrame,
    base_rule_set: Dict[str, Any],
    param_grid: Dict[str, List[Any]],
    initial_balance: float = 10000.0,
    max_combinations: int = 100,
) -> Dict[str, Any]:
    """运行网格参数寻优，测试各种参数组合并按综合得分排序"""
    start_time = time.time()

    # 提取所有要遍历的参数键与取值列表
    keys = list(param_grid.keys())
    value_lists = [param_grid[k] for k in keys]

    # 生成笛卡尔积组合
    all_combinations = list(itertools.product(*value_lists))
    if len(all_combinations) > max_combinations:
        all_combinations = all_combinations[:max_combinations]

    results: List[Dict[str, Any]] = []

    for idx, combo in enumerate(all_combinations):
        current_params = dict(zip(keys, combo))

        sl_pct = current_params.get("stop_loss_pct")
        if sl_pct is not None:
            sl_pct = float(sl_pct) if float(sl_pct) > 0 else None

        tp_pct = current_params.get("take_profit_pct")
        if tp_pct is not None:
            tp_pct = float(tp_pct) if float(tp_pct) > 0 else None

        ts_pct = current_params.get("trailing_stop_pct")
        if ts_pct is not None:
            ts_pct = float(ts_pct) if float(ts_pct) > 0 else None

        # 构建此组合下的 rule_set
        combo_rule_set = base_rule_set
        for k, v in current_params.items():
            if k not in ["stop_loss_pct", "take_profit_pct", "trailing_stop_pct"]:
                combo_rule_set = _apply_param_to_rule_set(combo_rule_set, k, v)

        # 运行回测
        bt_res: BacktestResult = run_backtest(
            df=df,
            rule_set=combo_rule_set,
            initial_balance=initial_balance,
            stop_loss_pct=sl_pct,
            take_profit_pct=tp_pct,
            trailing_stop_pct=ts_pct,
        )

        # 计算综合评分 (Sharpe比率*20 + 总收益率 - 最大回撤*1.2)
        score = (
            (bt_res.sharpe_ratio * 20.0)
            + bt_res.total_return
            - (bt_res.max_drawdown * 1.2)
            + (bt_res.win_rate * 0.2)
        )

        results.append(
            {
                "rank": 0,
                "params": current_params,
                "score": round(score, 2),
                "total_return": round(bt_res.total_return, 2),
                "benchmark_return": round(bt_res.benchmark_return, 2),
                "win_rate": round(bt_res.win_rate, 2),
                "sharpe_ratio": round(bt_res.sharpe_ratio, 3),
                "max_drawdown": round(bt_res.max_drawdown, 2),
                "profit_factor": round(bt_res.profit_factor, 2),
                "trade_count": bt_res.trade_count,
                "win_count": bt_res.win_count,
                "loss_count": bt_res.loss_count,
                "avg_trade_pnl": round(bt_res.avg_trade_pnl, 2),
            }
        )

    # 排序并分配名次
    results.sort(key=lambda x: x["score"], reverse=True)
    for i, r in enumerate(results):
        r["rank"] = i + 1

    elapsed = round(time.time() - start_time, 2)
    best_result = results[0] if results else None

    return {
        "total_combinations": len(results),
        "elapsed_seconds": elapsed,
        "best_result": best_result,
        "results": results,
    }
