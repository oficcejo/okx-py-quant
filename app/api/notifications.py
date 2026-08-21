from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import NotificationConfig
from app.schemas import NotificationConfigCreate, NotificationConfigSchema
from app.services.notification import (
    send_dingtalk_message,
    send_feishu_message,
    send_notification_to_all,
    send_telegram_message,
    send_wechat_message,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationConfigUpdate(BaseModel):
    channel: str  # TELEGRAM / FEISHU / WECHAT / DINGTALK
    config: Dict[str, Any]
    is_enabled: bool


class TestNotificationRequest(BaseModel):
    channel: str
    config: Dict[str, Any]


@router.get("/configs", response_model=List[NotificationConfigSchema])
def get_notification_configs(db: Session = Depends(get_db)) -> List[NotificationConfigSchema]:
    """获取所有通知渠道配置"""
    configs = db.query(NotificationConfig).all()
    return configs


@router.post("/configs", response_model=NotificationConfigSchema)
def save_notification_config(payload: NotificationConfigUpdate, db: Session = Depends(get_db)) -> Any:
    """保存或更新特定通知渠道配置"""
    channel = payload.channel.upper()
    existing = db.query(NotificationConfig).filter(NotificationConfig.channel == channel).first()
    config_str = json.dumps(payload.config, ensure_ascii=False)

    if existing:
        existing.config_json = config_str
        existing.is_enabled = payload.is_enabled
        existing.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_obj = NotificationConfig(
            channel=channel,
            config_json=config_str,
            is_enabled=payload.is_enabled,
        )
        db.add(new_obj)
        db.commit()
        db.refresh(new_obj)
        return new_obj


@router.post("/test")
async def test_notification(payload: TestNotificationRequest) -> Dict[str, Any]:
    """发送测试通知以验证 Webhook / Token 是否正常"""
    channel = payload.channel.upper()
    cfg = payload.config
    title = f"🧪 OKX 量化系统 - {channel} 连通性测试"
    content = (
        f"恭喜！您的 {channel} 通知渠道已成功配置并联通。\n"
        f"测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        f"系统状态: 正常运行中"
    )

    try:
        if channel == "TELEGRAM":
            token = cfg.get("bot_token")
            chat_id = cfg.get("chat_id")
            if not token or not chat_id:
                raise HTTPException(status_code=400, detail="请提供有效的 bot_token 与 chat_id")
            await send_telegram_message(token, chat_id, f"*{title}*\n\n{content}")

        elif channel == "FEISHU":
            webhook = cfg.get("webhook_url")
            if not webhook:
                raise HTTPException(status_code=400, detail="请提供有效的 Webhook URL")
            await send_feishu_message(webhook, title, content)

        elif channel == "WECHAT":
            webhook = cfg.get("webhook_url")
            if not webhook:
                raise HTTPException(status_code=400, detail="请提供有效的 Webhook URL")
            await send_wechat_message(webhook, f"### {title}\n\n{content}")

        elif channel == "DINGTALK":
            webhook = cfg.get("webhook_url")
            if not webhook:
                raise HTTPException(status_code=400, detail="请提供有效的 Webhook URL")
            await send_dingtalk_message(webhook, title, content)
        else:
            raise HTTPException(status_code=400, detail=f"不支持的渠道: {channel}")

        return {"status": "success", "message": f"{channel} 测试消息发送成功！"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"发送测试消息失败: {str(e)}")
