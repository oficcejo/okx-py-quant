"""
初始化常见交易对到数据库
"""
from app.db.session import SessionLocal
from app.models import Symbol

# 常见交易对配置
COMMON_SYMBOLS = [
    # 永续合约
    {"inst_id": "BTC-USDT-SWAP", "base": "BTC", "quote": "USDT", "type": "SWAP", "name": "BTC永续"},
    {"inst_id": "ETH-USDT-SWAP", "base": "ETH", "quote": "USDT", "type": "SWAP", "name": "ETH永续"},
    {"inst_id": "SOL-USDT-SWAP", "base": "SOL", "quote": "USDT", "type": "SWAP", "name": "SOL永续"},
    {"inst_id": "BNB-USDT-SWAP", "base": "BNB", "quote": "USDT", "type": "SWAP", "name": "BNB永续"},
    {"inst_id": "XRP-USDT-SWAP", "base": "XRP", "quote": "USDT", "type": "SWAP", "name": "XRP永续"},
    {"inst_id": "ADA-USDT-SWAP", "base": "ADA", "quote": "USDT", "type": "SWAP", "name": "ADA永续"},
    {"inst_id": "DOGE-USDT-SWAP", "base": "DOGE", "quote": "USDT", "type": "SWAP", "name": "DOGE永续"},
    {"inst_id": "MATIC-USDT-SWAP", "base": "MATIC", "quote": "USDT", "type": "SWAP", "name": "MATIC永续"},
    {"inst_id": "DOT-USDT-SWAP", "base": "DOT", "quote": "USDT", "type": "SWAP", "name": "DOT永续"},
    {"inst_id": "AVAX-USDT-SWAP", "base": "AVAX", "quote": "USDT", "type": "SWAP", "name": "AVAX永续"},
    
    # 现货
    {"inst_id": "BTC-USDT", "base": "BTC", "quote": "USDT", "type": "SPOT", "name": "BTC现货"},
    {"inst_id": "ETH-USDT", "base": "ETH", "quote": "USDT", "type": "SPOT", "name": "ETH现货"},
    {"inst_id": "SOL-USDT", "base": "SOL", "quote": "USDT", "type": "SPOT", "name": "SOL现货"},
    {"inst_id": "BNB-USDT", "base": "BNB", "quote": "USDT", "type": "SPOT", "name": "BNB现货"},
]


def init_symbols():
    """初始化常见交易对"""
    db = SessionLocal()
    
    print("=" * 60)
    print("初始化常见交易对")
    print("=" * 60)
    
    added_count = 0
    existing_count = 0
    
    for s in COMMON_SYMBOLS:
        existing = db.query(Symbol).filter(Symbol.inst_id == s["inst_id"]).first()
        if not existing:
            symbol = Symbol(
                exchange_name="OKX",
                inst_id=s["inst_id"],
                base_ccy=s["base"],
                quote_ccy=s["quote"],
                inst_type=s["type"],
                is_active=True
            )
            db.add(symbol)
            db.commit()
            db.refresh(symbol)
            print(f"✅ 添加: {s['name']:15s} (ID: {symbol.id:2d}) - {s['inst_id']}")
            added_count += 1
        else:
            print(f"ℹ️  已存在: {s['name']:15s} (ID: {existing.id:2d}) - {s['inst_id']}")
            existing_count += 1
    
    print("\n" + "=" * 60)
    print(f"完成！新增 {added_count} 个，已存在 {existing_count} 个")
    print("=" * 60)
    
    # 显示所有交易对
    all_symbols = db.query(Symbol).order_by(Symbol.id).all()
    print("\n📊 所有可用交易对：")
    print(f"{'ID':<4} {'品种代码':<20} {'类型':<8} {'基础币':<8} {'计价币'}")
    print("-" * 60)
    for sym in all_symbols:
        print(f"{sym.id:<4} {sym.inst_id:<20} {sym.inst_type:<8} {sym.base_ccy:<8} {sym.quote_ccy}")
    
    db.close()


if __name__ == "__main__":
    init_symbols()
