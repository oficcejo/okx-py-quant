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
from app.services.strategy_engine import (
    StrategyRuleSet,
    should_buy,
    should_sell,
    should_open_long,
    should_close_long,
    should_open_short,
    should_close_short,
)



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

            open_long_sig = should_open_long(rule_set, df, idx) or should_buy(rule_set, df, idx)
            close_long_sig = should_close_long(rule_set, df, idx) or should_sell(rule_set, df, idx)
            open_short_sig = should_open_short(rule_set, df, idx)
            close_short_sig = should_close_short(rule_set, df, idx)

            trades = (
                db.query(LiveTrade)
                .filter(LiveTrade.strategy_instance_id == instance.id)
                .order_by(LiveTrade.id.asc())
                .all()
            )
            net_qty = 0.0
            last_entry_price = 0.0
            for t in trades:
                if t.side.upper() in ["BUY", "OPEN_LONG"]:
                    net_qty += t.qty
                    last_entry_price = t.price
                elif t.side.upper() in ["SELL", "CLOSE_LONG"]:
                    net_qty -= t.qty
                    if net_qty == 0:
                        last_entry_price = 0.0
                elif t.side.upper() in ["OPEN_SHORT"]:
                    net_qty -= t.qty
                    last_entry_price = t.price
                elif t.side.upper() in ["CLOSE_SHORT"]:
                    net_qty += t.qty
                    if net_qty == 0:
                        last_entry_price = 0.0

            current_price = float(df["close"].iloc[idx])
            order_side: str | None = None
            order_size: float | None = None
            pos_side: str = "net"
            action_reason: str = "SIGNAL"

            # 1. 持有多单：检查止损、止盈或平多信号
            if net_qty > 0 and last_entry_price > 0:
                pos_side = "long"
                if strategy.stop_loss_pct and strategy.stop_loss_pct > 0:
                    sl_price = last_entry_price * (1.0 - strategy.stop_loss_pct / 100.0)
                    if current_price <= sl_price:
                        order_side = "sell"
                        order_size = abs(net_qty)
                        action_reason = "STOP_LOSS"

                if not order_side and strategy.take_profit_pct and strategy.take_profit_pct > 0:
                    tp_price = last_entry_price * (1.0 + strategy.take_profit_pct / 100.0)
                    if current_price >= tp_price:
                        order_side = "sell"
                        order_size = abs(net_qty)
                        action_reason = "TAKE_PROFIT"

                if not order_side and close_long_sig:
                    order_side = "sell"
                    order_size = abs(net_qty)
                    action_reason = "SIGNAL_CLOSE_LONG"

            # 2. 持有空单：检查空头止损、止盈或平空信号
            elif net_qty < 0 and last_entry_price > 0:
                pos_side = "short"
                if strategy.stop_loss_pct and strategy.stop_loss_pct > 0:
                    sl_price = last_entry_price * (1.0 + strategy.stop_loss_pct / 100.0)
                    if current_price >= sl_price:
                        order_side = "buy"
                        order_size = abs(net_qty)
                        action_reason = "STOP_LOSS"

                if not order_side and strategy.take_profit_pct and strategy.take_profit_pct > 0:
                    tp_price = last_entry_price * (1.0 - strategy.take_profit_pct / 100.0)
                    if current_price <= tp_price:
                        order_side = "buy"
                        order_size = abs(net_qty)
                        action_reason = "TAKE_PROFIT"

                if not order_side and close_short_sig:
                    order_side = "buy"
                    order_size = abs(net_qty)
                    action_reason = "SIGNAL_CLOSE_SHORT"

            # 3. 空仓中：检查开多或开空信号
            elif net_qty == 0:
                if open_long_sig:
                    order_side = "buy"
                    order_size = 1.0
                    pos_side = "long"
                    action_reason = "SIGNAL_OPEN_LONG"
                elif open_short_sig:
                    order_side = "sell"
                    order_size = 1.0
                    pos_side = "short"
                    action_reason = "SIGNAL_OPEN_SHORT"

            now = datetime.now(timezone.utc)

            if order_side and order_size and order_size > 0:
                order_resp = await client.place_order(
                    symbol.inst_id,
                    order_side,
                    str(order_size),
                    ord_type="market",
                    posSide=pos_side if symbol.inst_type in ["SWAP", "FUTURES"] else None,
                )

                order_id = None
                try:
                    if isinstance(order_resp, dict):
                        data_list = order_resp.get("data") or []
                        if data_list:
                            order_id = data_list[0].get("ordId")
                except Exception:
                    order_id = None

                pnl = None
                pnl_pct = None
                if order_side == "sell" and last_entry_price > 0:
                    pnl = (current_price - last_entry_price) * order_size
                    pnl_pct = ((current_price - last_entry_price) / last_entry_price) * 100.0

                trade = LiveTrade(
                    strategy_instance_id=instance.id,
                    ts=now,
                    side=order_side.upper(),
                    price=current_price,
                    qty=order_size,
                    order_id=order_id,
                    status="SENT",
                    pnl=pnl,
                    extra_json=json.dumps(order_resp) if isinstance(order_resp, dict) else None,
                )
                db.add(trade)

                # 发送即时交易通知
                try:
                    await send_trade_notification(
                        symbol=symbol.inst_id,
                        side=order_side.upper(),
                        price=current_price,
                        qty=order_size,
                        reason=action_reason,
                        pnl=pnl,
                        pnl_pct=pnl_pct,
                        strategy_name=strategy.name,
                    )
                except Exception as notif_err:
                    print(f"发送交易通知异常: {notif_err}")

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


def shutdown_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown()

