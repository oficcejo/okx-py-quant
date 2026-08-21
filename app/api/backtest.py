from __future__ import annotations

import json
import traceback
from datetime import datetime
from typing import Any, List

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Backtest, Kline, Strategy
from app.schemas import Backtest as BacktestSchema, BacktestCreate
from app.services.backtest_engine import run_backtest

router = APIRouter(prefix="/backtests", tags=["backtests"])


@router.get("/", response_model=List[BacktestSchema])
def list_backtests(db: Session = Depends(get_db)) -> List[BacktestSchema]:
    """获取所有回测记录"""
    backtests = db.query(Backtest).order_by(Backtest.id.desc()).all()
    return backtests


@router.delete("/{backtest_id}")
def delete_backtest(backtest_id: int, db: Session = Depends(get_db)) -> dict:
    """删除回测记录"""
    backtest = db.query(Backtest).filter(Backtest.id == backtest_id).first()
    if not backtest:
        raise HTTPException(status_code=404, detail="Backtest not found")
    
    db.delete(backtest)
    db.commit()
    return {"message": "Backtest deleted successfully", "id": backtest_id}


@router.post("/", response_model=BacktestSchema)
def create_backtest(payload: BacktestCreate, db: Session = Depends(get_db)) -> Any:
    try:
        strategy = db.query(Strategy).filter(Strategy.id == payload.strategy_id).first()
        if not strategy:
            raise HTTPException(status_code=404, detail="Strategy not found")

        query = db.query(Kline).filter(
            Kline.symbol_id == strategy.symbol_id,
            Kline.timeframe == strategy.timeframe,
        )
        if payload.start_ts:
            query = query.filter(Kline.ts >= payload.start_ts)
        if payload.end_ts:
            query = query.filter(Kline.ts <= payload.end_ts)

        klines = query.order_by(Kline.ts.asc()).all()
        if not klines:
            raise HTTPException(status_code=400, detail="未找到对应的K线回测数据，请先下载该周期的K线数据")

        actual_start_ts = payload.start_ts or klines[0].ts
        actual_end_ts = payload.end_ts or klines[-1].ts

        bt = Backtest(
            strategy_id=strategy.id,
            start_ts=actual_start_ts,
            end_ts=actual_end_ts,
            initial_balance=payload.initial_balance,
            status="RUNNING",
        )
        db.add(bt)
        db.commit()
        db.refresh(bt)

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
        result = run_backtest(
            df=df,
            rule_set=rule_set,
            initial_balance=payload.initial_balance,
            stop_loss_pct=strategy.stop_loss_pct,
            take_profit_pct=strategy.take_profit_pct,
            trailing_stop_pct=strategy.trailing_stop_pct,
            fee_rate=payload.fee_rate,
            slippage_pct=payload.slippage_pct,
        )


        bt.status = "FINISHED"
        bt.result_json = json.dumps({
            "equity_curve": result.equity_curve,
            "benchmark_curve": result.benchmark_curve,
            "trades_list": result.trades_list,
            "trade_count": result.trade_count,
            "win_count": result.win_count,
            "loss_count": result.loss_count,
            "total_return": result.total_return,
            "benchmark_return": result.benchmark_return,
            "win_rate": result.win_rate,
            "sharpe_ratio": result.sharpe_ratio,
            "max_drawdown": result.max_drawdown,
            "profit_factor": result.profit_factor,
            "avg_trade_pnl": result.avg_trade_pnl,
            "max_win": result.max_win,
            "max_loss": result.max_loss,
            "stop_loss_pct": strategy.stop_loss_pct,
            "take_profit_pct": strategy.take_profit_pct,
            "trailing_stop_pct": strategy.trailing_stop_pct,
        })
        db.commit()
        db.refresh(bt)

        return bt

        
    except HTTPException:
        raise
    except Exception as e:
        print(f"回测错误: {e}")
        traceback.print_exc()
        
        # 更新回测状态为失败
        if 'bt' in locals():
            bt.status = "FAILED"
            bt.result_json = json.dumps({"error": str(e)})
            db.commit()
        
        raise HTTPException(status_code=500, detail=f"回测执行失败: {str(e)}")
