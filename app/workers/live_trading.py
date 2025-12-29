from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

import pandas as pd
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.db.session import SessionLocal
from app.models import (
    AccountEquitySnapshot,
    LiveTrade,
    Strategy,
    StrategyInstance,
    Symbol,
)
from app.core.config import settings
from app.services.backtest_engine import compute_indicators
from app.services.okx_client import OkxClient
from app.services.strategy_engine import StrategyRuleSet, should_buy, should_sell


scheduler = AsyncIOScheduler()


async def _run_strategy_instance(instance_id: int) -> None:
    """执行实盘策略实例（使用.env中的OKX配置）"""
    db = SessionLocal()
    try:
        instance = db.query(StrategyInstance).filter(StrategyInstance.id == instance_id).first()
        if not instance or instance.status != "RUNNING":
            return

        strategy = db.query(Strategy).filter(Strategy.id == instance.strategy_id).first()
        if not strategy:
            return

        # 使用实例中指定的symbol和timeframe，而不是策略中的
        symbol = db.query(Symbol).filter(Symbol.id == instance.symbol_id).first()
        if not symbol:
            return

        # 从.env读取OKX配置
        if not settings.okx_api_key or not settings.okx_api_secret or not settings.okx_passphrase:
            print(f"[实盘{instance_id}] OKX API配置未设置，请检查.env文件")
            return

        client = OkxClient(
            api_key=settings.okx_api_key,
            api_secret=settings.okx_api_secret,
            passphrase=settings.okx_passphrase
        )

        try:
            # 使用实例的timeframe
            candles_resp = await client.get_candles(symbol.inst_id, instance.timeframe, limit=200)
            rows = candles_resp.get("data", []) if isinstance(candles_resp, dict) else []
            if not rows:
                return

            parsed = []
            for item in rows:
                ts_ms = int(item[0])
                ts = datetime.fromtimestamp(ts_ms / 1000.0, tz=timezone.utc)
                parsed.append(
                    {
                        "ts": ts,
                        "open": float(item[1]),
                        "high": float(item[2]),
                        "low": float(item[3]),
                        "close": float(item[4]),
                        "volume": float(item[5]),
                    }
                )

            df = pd.DataFrame(parsed).sort_values("ts").reset_index(drop=True)
            df = compute_indicators(df)

            rule_set: StrategyRuleSet = json.loads(strategy.config_json)
            idx = len(df) - 1
            if idx < 0:
                return

            buy_signal = should_buy(rule_set, df, idx)
            sell_signal = should_sell(rule_set, df, idx)

            trades = (
                db.query(LiveTrade)
                .filter(LiveTrade.strategy_instance_id == instance.id)
                .all()
            )
            net_qty = 0.0
            for t in trades:
                if t.side.upper() == "BUY":
                    net_qty += t.qty
                elif t.side.upper() == "SELL":
                    net_qty -= t.qty

            order_side: str | None = None
            order_size: float | None = None

            if buy_signal and net_qty <= 0:
                order_side = "buy"
                order_size = 1.0
            elif sell_signal and net_qty > 0:
                order_side = "sell"
                order_size = abs(net_qty)

            now = datetime.now(timezone.utc)

            if order_side and order_size and order_size > 0:
                order_resp = await client.place_order(symbol.inst_id, order_side, str(order_size), ord_type="market")
                order_id = None
                try:
                    if isinstance(order_resp, dict):
                        data_list = order_resp.get("data") or []
                        if data_list:
                            order_id = data_list[0].get("ordId")
                except Exception:
                    order_id = None

                trade = LiveTrade(
                    strategy_instance_id=instance.id,
                    ts=now,
                    side=order_side.upper(),
                    price=float(df["close"].iloc[idx]),
                    qty=order_size,
                    order_id=order_id,
                    status="SENT",
                    pnl=None,
                    extra_json=json.dumps(order_resp) if isinstance(order_resp, dict) else None,
                )
                db.add(trade)

            # 记录账户权益快照
            overview = await client.get_account_overview()
            try:
                total_eq = None
                if isinstance(overview, dict):
                    data_list = overview.get("data") or []
                    if data_list:
                        total_eq = float(data_list[0].get("totalEq"))
                if total_eq is not None:
                    snapshot = AccountEquitySnapshot(
                        ts=now,
                        equity=total_eq,
                    )
                    db.add(snapshot)
            except Exception:
                pass

            db.commit()

        finally:
            await client.close()

    finally:
        db.close()


def start_strategy_instance(instance_id: int, interval_sec: int) -> None:
    job_id = f"strategy-{instance_id}"
    scheduler.add_job(_run_strategy_instance, "interval", seconds=interval_sec, id=job_id, args=[instance_id], replace_existing=True)


def stop_strategy_instance(instance_id: int) -> None:
    job_id = f"strategy-{instance_id}"
    try:
        scheduler.remove_job(job_id)
    except Exception:
        pass


def start_scheduler() -> None:
    if not scheduler.running:
        scheduler.start()
