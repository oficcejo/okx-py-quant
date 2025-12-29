from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text, UniqueConstraint, ForeignKey
from sqlalchemy.orm import relationship

from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    password_hash = Column(String(128), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    exchange_accounts = relationship("ExchangeAccount", back_populates="user")


class ExchangeAccount(Base):
    __tablename__ = "exchange_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    exchange_name = Column(String(32), nullable=False, default="OKX")
    api_key = Column(String(128), nullable=False)
    api_secret = Column(String(256), nullable=False)
    passphrase = Column(String(128), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="exchange_accounts")


class Symbol(Base):
    __tablename__ = "symbols"

    id = Column(Integer, primary_key=True, index=True)
    exchange_name = Column(String(32), nullable=False, default="OKX")
    inst_id = Column(String(64), unique=True, nullable=False, index=True)  # 如 BTC-USDT-SWAP
    base_ccy = Column(String(32), nullable=True)
    quote_ccy = Column(String(32), nullable=True)
    inst_type = Column(String(32), nullable=True)  # SWAP / SPOT 等
    is_active = Column(Boolean, default=True)


class Kline(Base):
    __tablename__ = "klines"
    __table_args__ = (
        UniqueConstraint("symbol_id", "timeframe", "ts", name="uix_symbol_tf_ts"),
    )

    id = Column(Integer, primary_key=True, index=True)
    symbol_id = Column(Integer, ForeignKey("symbols.id"), nullable=False)
    timeframe = Column(String(16), nullable=False)  # 1m / 5m / 1H 等
    ts = Column(DateTime, nullable=False)
    open = Column(Float, nullable=False)
    high = Column(Float, nullable=False)
    low = Column(Float, nullable=False)
    close = Column(Float, nullable=False)
    volume = Column(Float, nullable=True)
    quote_volume = Column(Float, nullable=True)


class Strategy(Base):
    __tablename__ = "strategies"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    symbol_id = Column(Integer, ForeignKey("symbols.id"), nullable=False)
    timeframe = Column(String(16), nullable=False)
    leverage = Column(Float, nullable=True)
    monitor_interval_sec = Column(Integer, default=20)
    status = Column(String(32), default="DRAFT")  # DRAFT/ACTIVE/INACTIVE
    config_json = Column(Text, nullable=False)
    created_from_ai = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Backtest(Base):
    __tablename__ = "backtests"

    id = Column(Integer, primary_key=True, index=True)
    strategy_id = Column(Integer, ForeignKey("strategies.id"), nullable=False)
    start_ts = Column(DateTime, nullable=False)
    end_ts = Column(DateTime, nullable=False)
    initial_balance = Column(Float, nullable=False)
    status = Column(String(32), default="PENDING")  # PENDING/RUNNING/FINISHED/FAILED
    result_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class BacktestTrade(Base):
    __tablename__ = "backtest_trades"

    id = Column(Integer, primary_key=True, index=True)
    backtest_id = Column(Integer, ForeignKey("backtests.id"), nullable=False)
    side = Column(String(8), nullable=False)  # BUY/SELL
    ts = Column(DateTime, nullable=False)
    price = Column(Float, nullable=False)
    qty = Column(Float, nullable=False)
    fee = Column(Float, nullable=True)
    pnl = Column(Float, nullable=True)


class StrategyInstance(Base):
    __tablename__ = "strategy_instances"

    id = Column(Integer, primary_key=True, index=True)
    strategy_id = Column(Integer, ForeignKey("strategies.id"), nullable=False)
    symbol_id = Column(Integer, ForeignKey("symbols.id"), nullable=False)  # 实际交易的品种
    timeframe = Column(String(16), nullable=False)  # 实际使用的K线周期
    leverage = Column(Float, nullable=True, default=1.0)  # 杠杆倍数
    status = Column(String(32), default="STOPPED")  # RUNNING/STOPPED
    started_at = Column(DateTime, nullable=True)
    stopped_at = Column(DateTime, nullable=True)


class LiveTrade(Base):
    __tablename__ = "live_trades"

    id = Column(Integer, primary_key=True, index=True)
    strategy_instance_id = Column(Integer, ForeignKey("strategy_instances.id"), nullable=False)
    ts = Column(DateTime, default=datetime.utcnow)
    side = Column(String(8), nullable=False)
    price = Column(Float, nullable=False)
    qty = Column(Float, nullable=False)
    order_id = Column(String(64), nullable=True)
    status = Column(String(32), nullable=True)  # FILLED/REJECTED/PARTIAL 等
    pnl = Column(Float, nullable=True)
    extra_json = Column(Text, nullable=True)


class AccountEquitySnapshot(Base):
    __tablename__ = "account_equity_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    ts = Column(DateTime, default=datetime.utcnow)
    equity = Column(Float, nullable=False)
