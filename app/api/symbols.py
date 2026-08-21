from __future__ import annotations

from typing import Any, List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.db.session import get_db
from app.models import Symbol, Kline, Strategy
from app.schemas import Symbol as SymbolSchema, SymbolCreate, SymbolUpdate

router = APIRouter(prefix="/symbols", tags=["symbols"])


@router.get("/", response_model=List[SymbolSchema])
def list_symbols(
    category: Optional[str] = Query(None, description="分类: CRYPTO / COMMODITY / STOCK / INDEX / CUSTOM 等"),
    inst_type: Optional[str] = Query(None, description="标的类型: SWAP / SPOT / COMMODITY / STOCK / INDEX"),
    is_active: Optional[bool] = Query(None, description="是否启用"),
    search: Optional[str] = Query(None, description="代码或名称模糊搜索"),
    db: Session = Depends(get_db),
) -> List[SymbolSchema]:
    """获取所有交易品种列表，支持分类、标的类型和模糊检索"""
    query = db.query(Symbol)

    if category and category.upper() != "ALL":
        if category.upper() == "CUSTOM":
            query = query.filter(Symbol.is_custom == True)
        else:
            query = query.filter(Symbol.category == category.upper())

    if inst_type:
        query = query.filter(Symbol.inst_type == inst_type.upper())

    if is_active is not None:
        query = query.filter(Symbol.is_active == is_active)

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Symbol.inst_id.ilike(search_pattern),
                Symbol.base_ccy.ilike(search_pattern),
                Symbol.display_name.ilike(search_pattern),
                Symbol.description.ilike(search_pattern),
            )
        )

    # 排序：启用的优先，然后按分类与 ID 排序
    return query.order_by(Symbol.is_active.desc(), Symbol.category.asc(), Symbol.id.asc()).all()


@router.get("/categories")
def get_symbol_categories(db: Session = Depends(get_db)) -> dict:
    """获取各资产分类下的标的数量统计"""
    symbols = db.query(Symbol).all()
    categories = {
        "ALL": len(symbols),
        "COMMODITY": 0,  # 🪙 大宗商品与贵金属
        "STOCK": 0,      # 📈 美股股票
        "INDEX": 0,      # 📊 指数与 ETF
        "CRYPTO": 0,     # 🚀 加密货币
        "CUSTOM": 0,     # ⭐ 自定义品种
    }
    for s in symbols:
        cat = (s.category or "CRYPTO").upper()
        if cat in categories:
            categories[cat] += 1
        if s.is_custom:
            categories["CUSTOM"] += 1

    return categories


@router.post("/", response_model=SymbolSchema)
def create_symbol(payload: SymbolCreate, db: Session = Depends(get_db)) -> Any:
    """新增自定义交易品种"""
    clean_inst_id = payload.inst_id.strip().upper()
    existing = db.query(Symbol).filter(Symbol.inst_id == clean_inst_id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"交易品种代码 {clean_inst_id} 已存在！")

    base = payload.base_ccy.strip().upper() if payload.base_ccy else clean_inst_id.split("-")[0]
    quote = payload.quote_ccy.strip().upper() if payload.quote_ccy else "USDT"
    display = payload.display_name.strip() if payload.display_name else f"{base}/{quote} ({payload.inst_type or 'SWAP'})"

    new_symbol = Symbol(
        inst_id=clean_inst_id,
        base_ccy=base,
        quote_ccy=quote,
        inst_type=(payload.inst_type or "SWAP").upper(),
        category=(payload.category or "CUSTOM").upper(),
        display_name=display,
        description=payload.description.strip() if payload.description else "用户自定义品种",
        is_custom=True,
        is_active=payload.is_active if payload.is_active is not None else True,
        exchange_name=payload.exchange_name or "OKX",
        created_at=datetime.utcnow(),
    )
    db.add(new_symbol)
    db.commit()
    db.refresh(new_symbol)
    return new_symbol


@router.put("/{symbol_id}", response_model=SymbolSchema)
def update_symbol(symbol_id: int, payload: SymbolUpdate, db: Session = Depends(get_db)) -> Any:
    """编辑或启停特定交易品种"""
    symbol = db.query(Symbol).filter(Symbol.id == symbol_id).first()
    if not symbol:
        raise HTTPException(status_code=404, detail="交易品种不存在")

    if payload.display_name is not None:
        symbol.display_name = payload.display_name.strip()
    if payload.category is not None:
        symbol.category = payload.category.strip().upper()
    if payload.inst_type is not None:
        symbol.inst_type = payload.inst_type.strip().upper()
    if payload.description is not None:
        symbol.description = payload.description.strip()
    if payload.is_active is not None:
        symbol.is_active = payload.is_active

    db.commit()
    db.refresh(symbol)
    return symbol


@router.delete("/{symbol_id}")
def delete_symbol(symbol_id: int, db: Session = Depends(get_db)) -> dict:
    """删除自定义交易品种（若已有K线数据或关联策略则安全禁用）"""
    symbol = db.query(Symbol).filter(Symbol.id == symbol_id).first()
    if not symbol:
        raise HTTPException(status_code=404, detail="交易品种不存在")

    # 检查是否有依赖
    has_klines = db.query(Kline).filter(Kline.symbol_id == symbol_id).first() is not None
    has_strats = db.query(Strategy).filter(Strategy.symbol_id == symbol_id).first() is not None

    if has_klines or has_strats:
        symbol.is_active = False
        db.commit()
        return {
            "message": "该品种已有历史K线数据或关联策略，已自动设为【停用状态】以保护历史数据安全",
            "action": "deactivated",
            "id": symbol_id,
        }

    db.delete(symbol)
    db.commit()
    return {"message": "交易品种已成功删除", "action": "deleted", "id": symbol_id}
