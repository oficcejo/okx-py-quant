from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from app.core.config import settings
from app.db.session import get_db
from app.models import Kline, Symbol

router = APIRouter(prefix="/market", tags=["market"])


class KlineSyncRequest(BaseModel):
    inst_id: str = Field(..., description="OKX 交易对，例如 BTC-USDT-SWAP")
    timeframe: str = Field(..., description="K线周期，对应 OKX bar 参数，如 1m/5m/1H/4H/1D")
    start_ts: Optional[datetime] = Field(None, description="开始时间，UTC 时间")
    end_ts: Optional[datetime] = Field(None, description="结束时间，UTC 时间")
    limit_per_call: int = Field(100, ge=1, le=300)


@router.post("/klines/sync")
async def sync_klines(payload: KlineSyncRequest, db: Session = Depends(get_db)) -> dict:
    """下载K线数据到数据库"""
    symbol = db.query(Symbol).filter(Symbol.inst_id == payload.inst_id).first()
    if not symbol:
        symbol = Symbol(inst_id=payload.inst_id, exchange_name="OKX")
        db.add(symbol)
        db.commit()
        db.refresh(symbol)

    end_ts = payload.end_ts or datetime.now(timezone.utc)
    start_ts = payload.start_ts or (end_ts - timedelta(days=7))
    
    # 重要：将时间对齐到K线周期
    # 1H K线只有整点才有数据，需要向下取整到小时
    # 例如：2025-12-26 16:30 -> 2025-12-26 16:00
    if payload.timeframe in ['1H', '2H', '4H', '6H', '12H']:
        # 小时级别，对齐到小时
        start_ts = start_ts.replace(minute=0, second=0, microsecond=0)
        end_ts = end_ts.replace(minute=0, second=0, microsecond=0)
    elif payload.timeframe in ['1D', '1W', '1M']:
        # 日级别，对齐到天
        start_ts = start_ts.replace(hour=0, minute=0, second=0, microsecond=0)
        end_ts = end_ts.replace(hour=0, minute=0, second=0, microsecond=0)
    elif payload.timeframe in ['1m', '5m', '15m', '30m']:
        # 分钟级别，对齐到分钟
        start_ts = start_ts.replace(second=0, microsecond=0)
        end_ts = end_ts.replace(second=0, microsecond=0)
    
    print(f"[K线下载] 开始下载: {payload.inst_id} {payload.timeframe}")
    print(f"[K线下载] 目标时间范围（已对齐）: {start_ts.isoformat()} ~ {end_ts.isoformat()}")

    base_url = settings.okx_base_url.rstrip("/")

    async with httpx.AsyncClient(base_url=base_url, timeout=60.0, trust_env=True) as client:
        # 关键修复：使用 history-candles 接口获取历史数据，而不是 candles 接口
        # history-candles 支持更长时间范围的历史数据，candles 只返回最近13天
        # 使用 after 参数从新到旧下载，after 表示获取该时间之前的数据
        after_ms: Optional[int] = int(end_ts.timestamp() * 1000)  # 从结束时间开始
        inserted = 0
        fetch_count = 0
        max_fetch_attempts = 100  # 增加到100次，支持更长时间范围

        while fetch_count < max_fetch_attempts:
            params: dict[str, Any] = {
                "instId": payload.inst_id,
                "bar": payload.timeframe,
                "limit": str(payload.limit_per_call),
            }
            # 使用 after 参数，获取在该时间之前的数据
            params["after"] = str(after_ms)
            
            fetch_count += 1
            after_dt = datetime.fromtimestamp(after_ms / 1000.0, tz=timezone.utc)
            print(f"[K线下载] 第{fetch_count}次请求, 已插入{inserted}条, after={after_dt.isoformat()}")
            print(f"[K线下载] 请求参数: {params}")
            
            try:
                # 关键：使用 history-candles 接口
                resp = await client.get("/api/v5/market/history-candles", params=params)
                print(f"[K线下载] HTTP响应状态码: {resp.status_code}")
                resp.raise_for_status()
                data = resp.json()
                print(f"[K线下载] API响应 code: {data.get('code')}, msg: {data.get('msg')}")
            except httpx.TimeoutException as e:
                print(f"[K线下载] 请求超时: {str(e)}，已下载{inserted}条")
                break
            except httpx.HTTPStatusError as e:
                print(f"[K线下载] HTTP错误: {e.response.status_code} - {e.response.text}")
                break
            except Exception as e:
                print(f"[K线下载] 请求异常: {type(e).__name__}: {str(e)}")
                import traceback
                print(f"[K线下载] 详细错误:\n{traceback.format_exc()}")
                break
            
            rows: List[list[Any]] = data.get("data", [])
            print(f"[K线下载] 获取到 {len(rows)} 条原始数据")
            
            if not rows:
                print(f"[K线下载] 没有更多数据")
                break

            # OKX API返回的数据是从新到旧排列，最后一条是最旧的
            # 打印原始顺序的第一条和最后一条
            first_raw_ts = datetime.fromtimestamp(int(rows[0][0]) / 1000.0, tz=timezone.utc)
            last_raw_ts = datetime.fromtimestamp(int(rows[-1][0]) / 1000.0, tz=timezone.utc)
            print(f"[K线下载] API返回数据: {last_raw_ts.isoformat()}(旧) ~ {first_raw_ts.isoformat()}(新)")
            
            # 按时间升序排列用于存储
            rows_sorted = sorted(rows, key=lambda r: int(r[0]))
            
            # 删除这个重复的调试输出，已经在上面打印过了
            # if rows_sorted:
            #     first_ts = datetime.fromtimestamp(int(rows_sorted[0][0]) / 1000.0, tz=timezone.utc)
            #     last_ts = datetime.fromtimestamp(int(rows_sorted[-1][0]) / 1000.0, tz=timezone.utc)
            #     print(f"[K线下载] 本批数据时间: {first_ts.isoformat()} ~ {last_ts.isoformat()}")
            
            skipped_early = 0
            skipped_late = 0
            skipped_exists = 0
            batch_inserted = 0  # 本批次插入数量

            for item in rows_sorted:
                ts_ms = int(item[0])
                ts = datetime.fromtimestamp(ts_ms / 1000.0, tz=timezone.utc)
                
                # 跳过超出时间范围的数据（太早的数据）
                if ts < start_ts:
                    skipped_early += 1
                    continue
                
                # 跳过超出时间范围的数据（太晚的数据）
                if ts > end_ts:
                    skipped_late += 1
                    continue

                open_price = float(item[1])
                high = float(item[2])
                low = float(item[3])
                close = float(item[4])
                vol = float(item[5])

                exists = (
                    db.query(Kline)
                    .filter(
                        Kline.symbol_id == symbol.id,
                        Kline.timeframe == payload.timeframe,
                        Kline.ts == ts,
                    )
                    .first()
                )
                if exists:
                    skipped_exists += 1
                    continue

                k = Kline(
                    symbol_id=symbol.id,
                    timeframe=payload.timeframe,
                    ts=ts,
                    open=open_price,
                    high=high,
                    low=low,
                    close=close,
                    volume=vol,
                    quote_volume=None,
                )
                db.add(k)
                inserted += 1
                batch_inserted += 1
            
            print(f"[K线下载] 过滤统计: 太早{skipped_early}条, 太晚{skipped_late}条, 已存在{skipped_exists}条, 本批插入{batch_inserted}条, 总计{inserted}条")

            db.commit()
            
            # 关键检查：如果本批所有数据都"too late"（太晚），说明after参数设置有问题
            # 这通常意味着end_ts已经是过去时间，API只能返回更新的数据
            if skipped_late == len(rows) and skipped_late > 0:
                print(f"[K线下载] 本批所有数据都超过end_ts，无法获取更早数据，停止下载")
                print(f"[K线下载] 提示：end_ts={end_ts.isoformat()}可能是过去时间，请检查时间范围设置")
                break
            
            # 如果本批数据全部已存在或被过滤，说明这个时间段的数据已经下载过了
            if batch_inserted == 0 and len(rows) > 0:
                print(f"[K线下载] 本批无新数据插入，可能是重复请求或数据已存在")
                # 但仍需继续往更早的时间下载，不要直接break

            # 使用最旧的数据作为下次请求的 after 参数
            # OKX API返回的数据是从新到旧，最后一条是最旧的
            oldest_ts_ms = int(rows[-1][0])
            oldest_ts = datetime.fromtimestamp(oldest_ts_ms / 1000.0, tz=timezone.utc)
            
            print(f"[K线下载] 本批最旧数据: {oldest_ts.isoformat()}")
            print(f"[K线下载] 下一次after参数: {oldest_ts.isoformat()}")
            
            # 如果最旧的数据已经比start_ts还早，停止下载
            if oldest_ts < start_ts:
                print(f"[K线下载] 已达到起始时间，停止下载")
                break
            
            # 如果时间戳没有变化，说明API没有返回更早的数据了
            if oldest_ts_ms >= after_ms:
                print(f"[K线下载] 时间戳未前进（{oldest_ts_ms} >= {after_ms}），API可能无更早数据")
                break
            
            # 更新after参数为本批最旧的时间戳
            after_ms = oldest_ts_ms

    print(f"[K线下载] 完成，总计插入{inserted}条")
    return {"inserted": inserted}


class KlineDataInfo(BaseModel):
    """K线数据统计信息"""
    inst_id: str
    timeframe: str
    count: int
    start_ts: Optional[datetime] = None
    end_ts: Optional[datetime] = None


@router.get("/klines/stats", response_model=List[KlineDataInfo])
def get_kline_stats(db: Session = Depends(get_db)) -> List[KlineDataInfo]:
    """
    获取数据库中所有K线数据的统计信息
    返回每个交易对、每个周期的数据条数和时间范围
    """
    results = []
    
    # 查询所有symbol
    symbols = db.query(Symbol).all()
    
    for symbol in symbols:
        # 查询该symbol下所有不同的timeframe
        timeframes = db.query(Kline.timeframe).filter(
            Kline.symbol_id == symbol.id
        ).distinct().all()
        
        for (tf,) in timeframes:
            # 统计该symbol+timeframe的数据
            stats = db.query(
                func.count(Kline.id).label('count'),
                func.min(Kline.ts).label('start_ts'),
                func.max(Kline.ts).label('end_ts')
            ).filter(
                and_(
                    Kline.symbol_id == symbol.id,
                    Kline.timeframe == tf
                )
            ).first()
            
            if stats and stats.count > 0:
                results.append(KlineDataInfo(
                    inst_id=symbol.inst_id,
                    timeframe=tf,
                    count=stats.count,
                    start_ts=stats.start_ts,
                    end_ts=stats.end_ts
                ))
    
    return results


@router.delete("/klines/clean")
def clean_klines(
    inst_id: Optional[str] = Query(None, description="交易对，不填则清空所有"),
    timeframe: Optional[str] = Query(None, description="K线周期，不填则清空该交易对所有周期"),
    db: Session = Depends(get_db)
) -> dict:
    """
    清理K线数据
    - 不传参数：清空所有K线数据
    - 只传inst_id：清空该交易对的所有周期数据
    - 传inst_id和timeframe：清空该交易对指定周期的数据
    """
    query = db.query(Kline)
    
    if inst_id:
        symbol = db.query(Symbol).filter(Symbol.inst_id == inst_id).first()
        if not symbol:
            raise HTTPException(status_code=404, detail=f"交易对 {inst_id} 不存在")
        query = query.filter(Kline.symbol_id == symbol.id)
        
        if timeframe:
            query = query.filter(Kline.timeframe == timeframe)
    
    deleted_count = query.delete()
    db.commit()
    
    return {
        "deleted": deleted_count,
        "inst_id": inst_id,
        "timeframe": timeframe
    }
