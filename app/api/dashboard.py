from datetime import datetime
from typing import Any, List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import AccountEquitySnapshot, LiveTrade
from app.core.config import settings
from app.services.okx_client import OkxClient

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/equity", response_model=List[dict])
def get_account_equity_snapshots(db: Session = Depends(get_db)) -> List[dict]:
    rows = (
        db.query(AccountEquitySnapshot)
        .order_by(AccountEquitySnapshot.ts.asc())
        .all()
    )
    return [
        {"ts": row.ts.isoformat(), "equity": row.equity}
        for row in rows
    ]


@router.get("/recent-trades", response_model=List[dict])
def get_recent_trades(db: Session = Depends(get_db)) -> List[dict]:
    rows = (
        db.query(LiveTrade)
        .order_by(LiveTrade.ts.desc())
        .limit(100)
        .all()
    )
    result: List[dict] = []
    for row in rows:
        item: dict[str, Any] = {
            "ts": row.ts.isoformat(),
            "side": row.side,
            "price": row.price,
            "qty": row.qty,
            "status": row.status,
            "pnl": row.pnl,
        }
        result.append(item)
    return result


@router.get("/account-balance")
async def get_account_balance() -> dict:
    """
    实时获取OKX账户余额信息
    需要在.env中配置OKX API密钥
    """
    if not settings.okx_api_key or not settings.okx_api_secret or not settings.okx_passphrase:
        return {
            "success": False,
            "message": "OKX API未配置，请检查.env文件",
            "total_equity": 0,
            "balances": []
        }
    
    try:
        client = OkxClient(
            api_key=settings.okx_api_key,
            api_secret=settings.okx_api_secret,
            passphrase=settings.okx_passphrase
        )
        
        # 获取账户概览
        account_resp = await client.get_account_overview()
        
        if account_resp.get("code") != "0":
            return {
                "success": False,
                "message": f"API调用失败: {account_resp.get('msg')}",
                "total_equity": 0,
                "balances": []
            }
        
        data = account_resp.get("data", [])
        if not data:
            return {
                "success": True,
                "message": "账户数据为空",
                "total_equity": 0,
                "balances": []
            }
        
        account_data = data[0]
        total_eq = float(account_data.get("totalEq", "0"))
        
        # 提取各币种余额（仅显示有余额的）
        balances = []
        details = account_data.get("details", [])
        for detail in details:
            ccy = detail.get("ccy", "")
            eq = float(detail.get("eq", "0"))
            eq_usd = float(detail.get("eqUsd", "0"))
            
            if eq > 0:  # 只显示有余额的币种
                balances.append({
                    "currency": ccy,
                    "balance": eq,
                    "balance_usd": eq_usd
                })
        
        await client.close()
        
        return {
            "success": True,
            "message": "获取成功",
            "total_equity": total_eq,
            "balances": balances
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": f"获取账户信息失败: {str(e)}",
            "total_equity": 0,
            "balances": []
        }
