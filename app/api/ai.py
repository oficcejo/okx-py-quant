from __future__ import annotations

from typing import Any, Dict, List

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models import Strategy

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/generate-strategy", response_model=Dict[str, Any])
async def generate_strategy(prompt: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    if not settings.ai_base_url or not settings.ai_api_key:
        raise HTTPException(status_code=500, detail="AI config not set")

    payload = {
        "model": settings.ai_model,
        "messages": [
            {"role": "system", "content": "你是一个量化交易策略生成助手，输出严格遵守 JSON 结构。"},
            {
                "role": "user",
                "content": (
                    "根据以下描述生成一个策略配置 JSON，字段包括 buy_groups/sell_groups、指标类型和信号类型等。"
                    f"用户需求：{prompt}"
                ),
            },
        ],
        "response_format": {"type": "json_object"},
    }

    async with httpx.AsyncClient(base_url=settings.ai_base_url, timeout=20.0) as client:
        resp = await client.post(
            "/v1/chat/completions",
            json=payload,
            headers={"Authorization": f"Bearer {settings.ai_api_key}"},
        )
        resp.raise_for_status()
        data = resp.json()

    content = data["choices"][0]["message"]["content"]

    return {"strategy_config": content}
