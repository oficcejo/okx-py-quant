from __future__ import annotations

import json
import traceback
from datetime import datetime
from typing import Any, Dict, Optional

import httpx

from app.core.config import settings
from app.db.session import SessionLocal
from app.models import NotificationConfig


async def send_telegram_message(bot_token: str, chat_id: str, message: str) -> bool:
    """通过 Telegram Bot 发送 Markdown 消息"""
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "Markdown",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
        return True


async def send_feishu_message(webhook_url: str, title: str, content: str) -> bool:
    """通过飞书自定义机器人 Webhook 发送富文本卡片消息"""
    payload = {
        "msg_type": "post",
        "content": {
            "post": {
                "zh_cn": {
                    "title": title,
                    "content": [
                        [{"tag": "text", "text": content}]
                    ],
                }
            }
        },
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(webhook_url, json=payload)
        resp.raise_for_status()
        return True


async def send_wechat_message(webhook_url: str, markdown_text: str) -> bool:
    """通过企业微信群机器人 Webhook 发送 Markdown 消息"""
    payload = {
        "msg_type": "markdown",
        "markdown": {
            "content": markdown_text,
        },
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(webhook_url, json=payload)
        resp.raise_for_status()
        return True


async def send_dingtalk_message(webhook_url: str, title: str, content: str) -> bool:
    """通过钉钉群自定义机器人 Webhook 发送 ActionCard/Markdown 消息"""
    payload = {
        "msgtype": "markdown",
        "markdown": {
            "title": title,
            "text": f"### {title}\n\n{content}",
        },
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(webhook_url, json=payload)
        resp.raise_for_status()
        return True


async def send_notification_to_all(title: str, content: str, level: str = "INFO") -> Dict[str, Any]:
    """向所有已启用的渠道分发消息"""
    results: Dict[str, Any] = {}
    db = SessionLocal()
    try:
        configs = db.query(NotificationConfig).filter(NotificationConfig.is_enabled == True).all()
        for cfg in configs:
            try:
                cfg_data = json.loads(cfg.config_json)
                if cfg.channel == "TELEGRAM":
                    token = cfg_data.get("bot_token")
                    chat_id = cfg_data.get("chat_id")
                    if token and chat_id:
                        msg = f"*{title}*\n\n{content}"
                        await send_telegram_message(token, chat_id, msg)
                        results["telegram"] = "success"

                elif cfg.channel == "FEISHU":
                    webhook = cfg_data.get("webhook_url")
                    if webhook:
                        await send_feishu_message(webhook, title, content)
                        results["feishu"] = "success"

                elif cfg.channel == "WECHAT":
                    webhook = cfg_data.get("webhook_url")
                    if webhook:
                        wx_content = f"### {title}\n{content}"
                        await send_wechat_message(webhook, wx_content)
                        results["wechat"] = "success"

                elif cfg.channel == "DINGTALK":
                    webhook = cfg_data.get("webhook_url")
                    if webhook:
                        await send_dingtalk_message(webhook, title, content)
                        results["dingtalk"] = "success"
            except Exception as e:
                results[cfg.channel.lower()] = f"error: {str(e)}"
    finally:
        db.close()

    return results


async def send_trade_notification(
    symbol: str,
    side: str,
    price: float,
    qty: float,
    reason: str,
    pnl: Optional[float] = None,
    pnl_pct: Optional[float] = None,
    strategy_name: Optional[str] = None,
) -> None:
    """发送量化交易成交通知"""
    emoji_map = {
        "BUY": "🟢 【开仓买入】",
        "SELL": "🔴 【平仓卖出】",
        "STOP_LOSS": "⚠️ 【触发止损】",
        "TAKE_PROFIT": "🎯 【触发止盈】",
        "TRAILING_STOP": "🛡️ 【移动止盈止损】",
    }
    action_title = emoji_map.get(reason, emoji_map.get(side, f"🔔 【交易提醒】{side}"))
    title = f"{action_title} {symbol}"

    lines = [
        f"⏰ 时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        f"📊 品种: {symbol}",
        f"🎯 策略: {strategy_name or '默认策略'}",
        f"🧭 动作: {side} ({reason})",
        f"💰 成交价: {price:.4f} USDT",
        f"📦 数量: {qty:.4f}",
    ]

    if pnl is not None:
        pnl_symbol = "+" if pnl >= 0 else ""
        lines.append(f"💵 本笔盈亏: {pnl_symbol}{pnl:.2f} USDT ({pnl_symbol}{pnl_pct:.2f}%)")

    content = "\n".join(lines)
    try:
        await send_notification_to_all(title, content, level="INFO")
    except Exception as e:
        print(f"[Notification] 推送交易通知失败: {e}")
