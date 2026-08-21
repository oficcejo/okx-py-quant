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
    """获取所有可用交易对列表，支持 TradFi 分类与自定义品种展示"""
    symbols = db.query(Symbol).filter(Symbol.is_active == True).order_by(Symbol.category.asc(), Symbol.id.asc()).all()
    return [
        {
            "id": s.id,
            "inst_id": s.inst_id,
            "base_ccy": s.base_ccy or s.inst_id.split("-")[0],
            "quote_ccy": s.quote_ccy or "USDT",
            "inst_type": s.inst_type or "SWAP",
            "category": s.category or "CRYPTO",
            "is_custom": bool(s.is_custom),
            "display_name": s.display_name or f"{s.base_ccy or s.inst_id.split('-')[0]}/{s.quote_ccy or 'USDT'} ({s.inst_type or 'SWAP'})",
            "description": s.description or "",
        }
        for s in symbols
    ]



from pydantic import BaseModel
from app.services.strategy_templates import get_all_templates, get_template_by_id


class ApplyTemplateRequest(BaseModel):
    template_id: str
    symbol_id: int
    timeframe: str = "1H"
    name_override: str | None = None


@router.get("/templates")
def list_strategy_templates() -> List[dict]:
    """获取所有内置经典量化策略预设模版"""
    return get_all_templates()


@router.post("/templates/apply", response_model=StrategySchema)
def apply_strategy_template(payload: ApplyTemplateRequest, db: Session = Depends(get_db)) -> StrategySchema:
    """基于内置模版一键创建策略"""
    tmpl = get_template_by_id(payload.template_id)
    if not tmpl:
        raise HTTPException(status_code=404, detail="模版不存在")

    name = payload.name_override or f"{tmpl['name']} (预设)"
    db_obj = Strategy(
        user_id=1,
        name=name,
        description=tmpl["description"],
        symbol_id=payload.symbol_id,
        timeframe=payload.timeframe,
        leverage=tmpl.get("suggested_leverage", 1.0),
        monitor_interval_sec=60,
        stop_loss_pct=tmpl.get("stop_loss_pct"),
        take_profit_pct=tmpl.get("take_profit_pct"),
        trailing_stop_pct=tmpl.get("trailing_stop_pct"),
        status="DRAFT",
        config_json=tmpl["config_json"],
        created_from_ai=False,
    )

    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


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
        stop_loss_pct=payload.stop_loss_pct,
        take_profit_pct=payload.take_profit_pct,
        trailing_stop_pct=payload.trailing_stop_pct,
        status="DRAFT",
        config_json=payload.config_json,
        created_from_ai=payload.created_from_ai,
    )

    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


@router.get("/{strategy_id:int}", response_model=StrategySchema)
def get_strategy(strategy_id: int, db: Session = Depends(get_db)) -> StrategySchema:
    db_obj = db.query(Strategy).filter(Strategy.id == strategy_id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return db_obj


@router.put("/{strategy_id:int}", response_model=StrategySchema)
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
    db_obj.stop_loss_pct = payload.stop_loss_pct
    db_obj.take_profit_pct = payload.take_profit_pct
    db_obj.trailing_stop_pct = payload.trailing_stop_pct
    db_obj.config_json = payload.config_json


    db.commit()
    db.refresh(db_obj)
    return db_obj


@router.delete("/{strategy_id:int}")
def delete_strategy(strategy_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    db_obj = db.query(Strategy).filter(Strategy.id == strategy_id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Strategy not found")
    db.delete(db_obj)
    db.commit()
    return {"ok": True}
