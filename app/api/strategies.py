from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Strategy, Symbol
from app.schemas import Strategy as StrategySchema, StrategyCreate

router = APIRouter(prefix="/strategies", tags=["strategies"])


@router.get("/symbols/list")
def list_symbols(db: Session = Depends(get_db)) -> List[dict]:
    """获取所有可用交易对列表"""
    symbols = db.query(Symbol).filter(Symbol.is_active == True).order_by(Symbol.id).all()
    return [
        {
            "id": s.id,
            "inst_id": s.inst_id,
            "base_ccy": s.base_ccy,
            "quote_ccy": s.quote_ccy,
            "inst_type": s.inst_type,
            "display_name": f"{s.base_ccy}/{s.quote_ccy} ({s.inst_type})"
        }
        for s in symbols
    ]


@router.get("/", response_model=List[StrategySchema])
def list_strategies(db: Session = Depends(get_db)) -> List[StrategySchema]:
    items = db.query(Strategy).order_by(Strategy.created_at.desc()).all()
    return items


@router.post("/", response_model=StrategySchema)
def create_strategy(payload: StrategyCreate, db: Session = Depends(get_db)) -> StrategySchema:
    # 当前没有鉴权，先用固定 user_id=1
    db_obj = Strategy(
        user_id=1,
        name=payload.name,
        description=payload.description,
        symbol_id=payload.symbol_id,
        timeframe=payload.timeframe,
        leverage=payload.leverage,
        monitor_interval_sec=payload.monitor_interval_sec,
        status="DRAFT",
        config_json=payload.config_json,
        created_from_ai=False,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


@router.get("/{strategy_id}", response_model=StrategySchema)
def get_strategy(strategy_id: int, db: Session = Depends(get_db)) -> StrategySchema:
    db_obj = db.query(Strategy).filter(Strategy.id == strategy_id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return db_obj


@router.put("/{strategy_id}", response_model=StrategySchema)
def update_strategy(strategy_id: int, payload: StrategyCreate, db: Session = Depends(get_db)) -> StrategySchema:
    db_obj = db.query(Strategy).filter(Strategy.id == strategy_id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Strategy not found")

    db_obj.name = payload.name
    db_obj.description = payload.description
    db_obj.symbol_id = payload.symbol_id
    db_obj.timeframe = payload.timeframe
    db_obj.leverage = payload.leverage
    db_obj.monitor_interval_sec = payload.monitor_interval_sec
    db_obj.config_json = payload.config_json

    db.commit()
    db.refresh(db_obj)
    return db_obj


@router.delete("/{strategy_id}")
def delete_strategy(strategy_id: int, db: Session = Depends(get_db)) -> dict:
    db_obj = db.query(Strategy).filter(Strategy.id == strategy_id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Strategy not found")
    db.delete(db_obj)
    db.commit()
    return {"ok": True}
