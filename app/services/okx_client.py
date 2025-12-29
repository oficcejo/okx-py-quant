from __future__ import annotations

import base64
import hashlib
import hmac
import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import httpx

from app.core.config import settings


class OkxClient:
    def __init__(self, api_key: str, api_secret: str, passphrase: str, base_url: Optional[str] = None) -> None:
        self.api_key = api_key
        self.api_secret = api_secret
        self.passphrase = passphrase
        self.base_url = base_url or settings.okx_base_url.rstrip("/")
        # 增加超时时间到60秒，并支持系统代理
        self._client = httpx.AsyncClient(
            base_url=self.base_url, 
            timeout=60.0,  # 增加超时时间
            trust_env=True  # 使用系统代理设置（HTTP_PROXY, HTTPS_PROXY）
        )

    async def _signed_headers(self, method: str, request_path: str, body: str) -> Dict[str, str]:
        ts = datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
        if not self.api_secret:
            sign = ""
        else:
            message = f"{ts}{method.upper()}{request_path}{body}".encode("utf-8")
            secret = self.api_secret.encode("utf-8")
            digest = hmac.new(secret, message, hashlib.sha256).digest()
            sign = base64.b64encode(digest).decode()

        return {
            "OK-ACCESS-KEY": self.api_key or "",
            "OK-ACCESS-SIGN": sign,
            "OK-ACCESS-PASSPHRASE": self.passphrase or "",
            "OK-ACCESS-TIMESTAMP": ts,
            "Content-Type": "application/json",
        }

    async def _request(self, method: str, path: str, params: Optional[Dict[str, Any]] = None, json: Optional[Dict[str, Any]] = None) -> Any:
        body_str = json and json.dumps(json, separators=(",", ":")) or ""
        from urllib.parse import urlencode

        if params:
            query = "?" + urlencode(params, doseq=True)
        else:
            query = ""
        request_path = f"{path}{query}"

        headers = await self._signed_headers(method, request_path, body_str)
        resp = await self._client.request(method, path, params=params, json=json, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        return data

    async def get_account_overview(self) -> Any:
        return await self._request("GET", "/api/v5/account/balance")

    async def get_candles(self, inst_id: str, bar: str, limit: int = 100, before: Optional[str] = None, after: Optional[str] = None) -> Any:
        params: Dict[str, Any] = {"instId": inst_id, "bar": bar, "limit": str(limit)}
        if before is not None:
            params["before"] = before
        if after is not None:
            params["after"] = after
        return await self._request("GET", "/api/v5/market/candles", params=params)

    async def place_order(self, inst_id: str, side: str, size: str, ord_type: str = "market", **extra: Any) -> Any:
        body: Dict[str, Any] = {
            "instId": inst_id,
            "side": side,
            "sz": size,
            "ordType": ord_type,
        }
        body.update(extra)

        tag_value = "c314b0aecb5bBCDE"
        body["tag"] = tag_value

        return await self._request("POST", "/api/v5/trade/order", json=body)

    async def close(self) -> None:
        await self._client.aclose()
