from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Strategy, StrategyInstance, LiveTrade, Symbol
from app.schemas import StrategyInstance as StrategyInstanceSchema, LiveTrade as LiveTradeSchema
from app.workers.live_trading import start_strategy_instance, stop_strategy_instance

router = APIRouter(prefix="/instances", tags=["instances"])


@router.get("/", response_model=List[StrategyInstanceSchema])
def list_instances(db: Session = Depends(get_db)) -> List[StrategyInstanceSchema]:
    items = db.query(StrategyInstance).all()
    return items


@router.post("/", response_model=StrategyInstanceSchema)
def create_instance(
    strategy_id: int,
    symbol_id: int,
    timeframe: str,
    leverage: float = 1.0,
    db: Session = Depends(get_db)
) -> StrategyInstanceSchema:
    """创建实盘实例（自动使用.env中的OKX配置）"""
    strategy = db.query(Strategy).filter(Strategy.id == strategy_id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    inst = StrategyInstance(
        strategy_id=strategy_id,
        symbol_id=symbol_id,
        timeframe=timeframe,
        leverage=leverage,
        status="STOPPED",
    )
    db.add(inst)
    db.commit()
    db.refresh(inst)
    return inst


@router.post("/{instance_id}/start", response_model=StrategyInstanceSchema)
def start_instance(instance_id: int, db: Session = Depends(get_db)) -> StrategyInstanceSchema:
    inst = db.query(StrategyInstance).filter(StrategyInstance.id == instance_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Instance not found")

    strategy = db.query(Strategy).filter(Strategy.id == inst.strategy_id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    inst.status = "RUNNING"
    db.commit()
    db.refresh(inst)

    start_strategy_instance(inst.id, strategy.monitor_interval_sec)

    return inst


@router.post("/{instance_id}/stop", response_model=StrategyInstanceSchema)
def stop_instance(instance_id: int, db: Session = Depends(get_db)) -> StrategyInstanceSchema:
    inst = db.query(StrategyInstance).filter(StrategyInstance.id == instance_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Instance not found")

    inst.status = "STOPPED"
    db.commit()
    db.refresh(inst)

    stop_strategy_instance(inst.id)

    return inst


@router.delete("/{instance_id}")
def delete_instance(instance_id: int, db: Session = Depends(get_db)) -> dict:
    """删除实盘实例（只能删除已停止的实例）"""
    inst = db.query(StrategyInstance).filter(StrategyInstance.id == instance_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Instance not found")
    
    # 如果实例正在运行，先停止它
    if inst.status == "RUNNING":
        stop_strategy_instance(inst.id)
        inst.status = "STOPPED"
        db.commit()
    
    # 删除实例
    db.delete(inst)
    db.commit()
    
    return {"ok": True, "message": "实例已删除"}


@router.get("/{instance_id}/trades", response_model=List[LiveTradeSchema])
def get_instance_trades(instance_id: int, db: Session = Depends(get_db)) -> List[LiveTradeSchema]:
    """获取实例的所有交易记录"""
    inst = db.query(StrategyInstance).filter(StrategyInstance.id == instance_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Instance not found")
    
    trades = (
        db.query(LiveTrade)
        .filter(LiveTrade.strategy_instance_id == instance_id)
        .order_by(LiveTrade.ts.desc())
        .all()
    )
    return trades


@router.get("/{instance_id}/summary")
def get_instance_summary(instance_id: int, db: Session = Depends(get_db)) -> dict:
    """获取实例的交易统计摘要"""
    inst = db.query(StrategyInstance).filter(StrategyInstance.id == instance_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Instance not found")
    
    strategy = db.query(Strategy).filter(Strategy.id == inst.strategy_id).first()
    symbol = db.query(Symbol).filter(Symbol.id == inst.symbol_id).first()
    
    trades = (
        db.query(LiveTrade)
        .filter(LiveTrade.strategy_instance_id == instance_id)
        .order_by(LiveTrade.ts.asc())
        .all()
    )
    
    # 计算统计数据
    total_trades = len(trades)
    buy_count = len([t for t in trades if t.side.upper() == "BUY"])
    sell_count = len([t for t in trades if t.side.upper() == "SELL"])
    
    # 计算当前持仓
    net_qty = 0.0
    for t in trades:
        if t.side.upper() == "BUY":
            net_qty += t.qty
        elif t.side.upper() == "SELL":
            net_qty -= t.qty
    
    return {
        "instance_id": instance_id,
        "strategy_name": strategy.name if strategy else "Unknown",
        "symbol": symbol.inst_id if symbol else "Unknown",
        "timeframe": inst.timeframe,
        "leverage": inst.leverage,
        "status": inst.status,
        "started_at": inst.started_at.isoformat() if inst.started_at else None,
        "stopped_at": inst.stopped_at.isoformat() if inst.stopped_at else None,
        "total_trades": total_trades,
        "buy_count": buy_count,
        "sell_count": sell_count,
        "current_position": net_qty,
        "recent_trades": [
            {
                "id": t.id,
                "ts": t.ts.isoformat(),
                "side": t.side,
                "price": t.price,
                "qty": t.qty,
                "order_id": t.order_id,
                "status": t.status,
            }
            for t in trades[-10:]  # 最近10条
        ]
    }
