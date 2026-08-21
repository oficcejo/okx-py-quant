from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class UserBase(BaseModel):
    username: str


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ExchangeAccountBase(BaseModel):
    exchange_name: str = "OKX"


class ExchangeAccountCreate(ExchangeAccountBase):
    api_key: str
    api_secret: str
    passphrase: str


class ExchangeAccount(ExchangeAccountBase):
    id: int
    user_id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SymbolBase(BaseModel):
    inst_id: str
    base_ccy: Optional[str] = None
    quote_ccy: Optional[str] = "USDT"
    inst_type: Optional[str] = "SWAP"  # SWAP / SPOT / COMMODITY / STOCK / INDEX
    category: Optional[str] = "CRYPTO"  # CRYPTO / COMMODITY / STOCK / INDEX / FOREX / CUSTOM
    display_name: Optional[str] = None
    description: Optional[str] = None
    exchange_name: Optional[str] = "OKX"


class SymbolCreate(SymbolBase):
    is_custom: Optional[bool] = True
    is_active: Optional[bool] = True


class SymbolUpdate(BaseModel):
    display_name: Optional[str] = None
    category: Optional[str] = None
    inst_type: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class Symbol(SymbolBase):
    id: int
    is_custom: bool = False
    is_active: bool = True
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True



class Kline(BaseModel):
    symbol_id: int
    timeframe: str
    ts: datetime
    open: float
    high: float
    low: float
    close: float
    volume: Optional[float] = None
    quote_volume: Optional[float] = None

    class Config:
        from_attributes = True


class StrategyBase(BaseModel):
    name: str
    description: Optional[str] = None
    symbol_id: int
    timeframe: str
    leverage: Optional[float] = None
    monitor_interval_sec: int = Field(default=60, ge=1)
    stop_loss_pct: Optional[float] = None
    take_profit_pct: Optional[float] = None
    trailing_stop_pct: Optional[float] = None
    config_json: str
    created_from_ai: bool = False


class StrategyCreate(StrategyBase):
    pass


class Strategy(StrategyBase):
    id: int
    user_id: int
    status: str
    created_from_ai: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NotificationConfigBase(BaseModel):
    channel: str
    config_json: str
    is_enabled: bool = False


class NotificationConfigCreate(NotificationConfigBase):
    pass


class NotificationConfigSchema(NotificationConfigBase):
    id: int
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True




class BacktestBase(BaseModel):
    strategy_id: int
    start_ts: Optional[datetime] = None
    end_ts: Optional[datetime] = None
    initial_balance: float = 10000.0
    fee_rate: float = 0.0
    slippage_pct: float = 0.0



class BacktestCreate(BacktestBase):
    pass


class Backtest(BacktestBase):
    id: int
    start_ts: datetime
    end_ts: datetime
    status: str
    result_json: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True



class BacktestTrade(BaseModel):
    backtest_id: int
    side: str
    ts: datetime
    price: float
    qty: float
    fee: Optional[float] = None
    pnl: Optional[float] = None

    class Config:
        from_attributes = True


class StrategyInstance(BaseModel):
    id: int
    strategy_id: int
    symbol_id: int  # 实际交易的品种
    timeframe: str  # 实际使用的K线周期
    leverage: float = 1.0  # 杠杆倍数
    status: str  # RUNNING/STOPPED
    started_at: Optional[datetime] = None
    stopped_at: Optional[datetime] = None
    strategy_name: Optional[str] = None
    symbol_inst_id: Optional[str] = None
    symbol_display_name: Optional[str] = None
    symbol_category: Optional[str] = None

    class Config:
        from_attributes = True



class LiveTrade(BaseModel):
    strategy_instance_id: int
    ts: datetime
    side: str
    price: float
    qty: float
    order_id: Optional[str] = None
    status: Optional[str] = None
    pnl: Optional[float] = None
    extra_json: Optional[str] = None

    class Config:
        from_attributes = True


class AccountEquitySnapshot(BaseModel):
    exchange_account_id: int
    ts: datetime
    equity: float

    class Config:
        from_attributes = True
