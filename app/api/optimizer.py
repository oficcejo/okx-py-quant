from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Dict, List, Optional

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Kline, Strategy
from app.services.optimizer import run_grid_search

router = APIRouter(prefix="/optimizer", tags=["optimizer"])


class OptimizerRunRequest(BaseModel):
    strategy_id: int
    start_ts: str
    end_ts: str
    initial_balance: float = 10000.0
    param_grid: Dict[str, List[Any]]
    max_combinations: int = 80


class ApplyBestParamsRequest(BaseModel):
    strategy_id: int
    params: Dict[str, Any]


@router.post("/run")
def run_optimization(payload: OptimizerRunRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """对指定策略在历史 K 线数据上运行网格参数寻优"""
    strategy = db.query(Strategy).filter(Strategy.id == payload.strategy_id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    start_dt = datetime.fromisoformat(payload.start_ts.replace("Z", "+00:00")).replace(tzinfo=None)
    end_dt = datetime.fromisoformat(payload.end_ts.replace("Z", "+00:00")).replace(tzinfo=None)

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
        raise HTTPException(status_code=400, detail="所选时间段内无已下载的K线数据，请先前往数据管理下载")

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

    rule_set = json.loads(strategy.config_json)

    search_result = run_grid_search(
        df=df,
        base_rule_set=rule_set,
        param_grid=payload.param_grid,
        initial_balance=payload.initial_balance,
        max_combinations=payload.max_combinations,
    )

    return {
        "strategy_id": strategy.id,
        "strategy_name": strategy.name,
        "timeframe": strategy.timeframe,
        "kline_count": len(klines),
        **search_result,
    }


@router.post("/apply-best")
def apply_best_params(payload: ApplyBestParamsRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """将寻优出的最优参数一键更新回策略"""
    strategy = db.query(Strategy).filter(Strategy.id == payload.strategy_id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    params = payload.params

    if "stop_loss_pct" in params:
        val = params["stop_loss_pct"]
        strategy.stop_loss_pct = float(val) if val is not None and float(val) > 0 else None

    if "take_profit_pct" in params:
        val = params["take_profit_pct"]
        strategy.take_profit_pct = float(val) if val is not None and float(val) > 0 else None

    if "trailing_stop_pct" in params:
        val = params["trailing_stop_pct"]
        strategy.trailing_stop_pct = float(val) if val is not None and float(val) > 0 else None

    db.commit()
    db.refresh(strategy)

    return {
        "status": "success",
        "message": "已成功将选定参数应用到策略！",
        "strategy_id": strategy.id,
        "stop_loss_pct": strategy.stop_loss_pct,
        "take_profit_pct": strategy.take_profit_pct,
        "trailing_stop_pct": strategy.trailing_stop_pct,
    }
