from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Dict, List

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Kline, Strategy
from app.services.portfolio_engine import PortfolioStrategyConfig, run_portfolio_backtest

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


class StrategyAllocationItem(BaseModel):
    strategy_id: int
    weight: float = 1.0
    start_ts: str
    end_ts: str


class PortfolioBacktestRequest(BaseModel):
    allocations: List[StrategyAllocationItem]
    initial_balance: float = 10000.0


@router.post("/backtest")
def run_portfolio_simulation(
    payload: PortfolioBacktestRequest, db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """运行多策略资产分配与投资组合回测模拟"""
    if not payload.allocations:
        raise HTTPException(status_code=400, detail="请至少选择一个策略参与投资组合")

    configs: List[PortfolioStrategyConfig] = []

    for alloc in payload.allocations:
        strategy = db.query(Strategy).filter(Strategy.id == alloc.strategy_id).first()
        if not strategy:
            continue

        start_dt = datetime.fromisoformat(alloc.start_ts.replace("Z", "+00:00")).replace(tzinfo=None)
        end_dt = datetime.fromisoformat(alloc.end_ts.replace("Z", "+00:00")).replace(tzinfo=None)

        klines = (
            db.query(Kline)
            .filter(
                Kline.symbol_id == strategy.symbol_id,
                Kline.timeframe == strategy.timeframe,
                Kline.ts >= start_dt,
                Kline.ts <= end_dt,
            )
            .order_by(Kline.ts.asc())
            .all()
        )

        if not klines:
            continue

        df = pd.DataFrame(
            [
                {
                    "ts": k.ts,
                    "open": k.open,
                    "high": k.high,
                    "low": k.low,
                    "close": k.close,
                    "volume": k.volume,
                }
                for k in klines
            ]
        )

        try:
            rule_set = json.loads(strategy.config_json)
        except Exception:
            rule_set = {"buy_groups": [], "sell_groups": []}

        configs.append(
            PortfolioStrategyConfig(
                strategy_id=strategy.id,
                strategy_name=f"{strategy.name} ({strategy.timeframe})",
                weight=alloc.weight,
                df=df,
                rule_set=rule_set,
                stop_loss_pct=strategy.stop_loss_pct,
                take_profit_pct=strategy.take_profit_pct,
                trailing_stop_pct=strategy.trailing_stop_pct,
            )
        )

    if not configs:
        raise HTTPException(status_code=400, detail="所选策略均无有效的本地K线数据，请先下载行情数据")

    result = run_portfolio_backtest(
        strategies=configs,
        initial_balance=payload.initial_balance,
    )

    return result
