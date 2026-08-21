"""
初始化交易环境：创建交易品种和账户
运行此脚本后，会显示所有可用的 Symbol ID 和账户 ID
"""
from app.db.session import SessionLocal
from app.models import Symbol, ExchangeAccount, User
import hashlib

def setup():
    db = SessionLocal()
    
    print("=" * 60)
    print("初始化交易环境")
    print("=" * 60)
    
    # 1. 创建用户
    user = db.query(User).filter(User.username == "admin").first()
    if not user:
        pwd_hash = hashlib.sha256(b"admin123").hexdigest()
        user = User(
            username="admin",
            password_hash=pwd_hash
        )
        db.add(user)
        db.commit()

        print(f"✅ 创建用户: admin (ID: {user.id})")
    else:
        print(f"ℹ️  用户已存在: admin (ID: {user.id})")
    
    # 2. 创建交易品种
    symbols_data = [
        {"inst_id": "BTC-USDT-SWAP", "base": "BTC", "quote": "USDT", "type": "SWAP"},
        {"inst_id": "ETH-USDT-SWAP", "base": "ETH", "quote": "USDT", "type": "SWAP"},
        {"inst_id": "SOL-USDT-SWAP", "base": "SOL", "quote": "USDT", "type": "SWAP"},
        {"inst_id": "BTC-USDT", "base": "BTC", "quote": "USDT", "type": "SPOT"},
        {"inst_id": "ETH-USDT", "base": "ETH", "quote": "USDT", "type": "SPOT"},
    ]
    
    for s in symbols_data:
        existing = db.query(Symbol).filter(Symbol.inst_id == s["inst_id"]).first()
        if not existing:
            symbol = Symbol(
                exchange_name="OKX",
                inst_id=s["inst_id"],
                base_ccy=s["base"],
                quote_ccy=s["quote"],
                inst_type=s["type"]
            )
            db.add(symbol)
            db.commit()
            print(f"✅ 创建品种: {symbol.inst_id} (Symbol ID: {symbol.id})")
        else:
            print(f"ℹ️  品种已存在: {existing.inst_id} (Symbol ID: {existing.id})")
    
    # 3. 创建交易账户
    account = db.query(ExchangeAccount).filter(ExchangeAccount.user_id == user.id).first()
    if not account:
        print("\n⚠️  请配置你的 OKX API 密钥：")
        api_key = input("API Key (直接回车使用默认值): ").strip() or "YOUR_API_KEY"
        api_secret = input("API Secret (直接回车使用默认值): ").strip() or "YOUR_API_SECRET"
        passphrase = input("Passphrase (直接回车使用默认值): ").strip() or "YOUR_PASSPHRASE"
        
        account = ExchangeAccount(
            user_id=user.id,
            exchange_name="OKX",
            api_key=api_key,
            api_secret=api_secret,
            passphrase=passphrase,
            is_active=True
        )
        db.add(account)
        db.commit()
        print(f"✅ 创建交易账户 (账户 ID: {account.id})")
    else:
        print(f"ℹ️  交易账户已存在 (账户 ID: {account.id})")
    
    # 4. 显示汇总信息
    print("\n" + "=" * 60)
    print("设置完成！以下是可用的 ID：")
    print("=" * 60)
    
    symbols = db.query(Symbol).all()
    print("\n📊 Symbol ID（创建策略时使用）：")
    for s in symbols:
        print(f"  - Symbol ID: {s.id:2d} → {s.inst_id:20s} ({s.inst_type})")
    
    accounts = db.query(ExchangeAccount).all()
    print("\n🔑 账户 ID（实盘交易时使用）：")
    for acc in accounts:
        masked_key = acc.api_key[:8] + "****" + acc.api_key[-4:] if len(acc.api_key) > 12 else "****"
        print(f"  - 账户 ID: {acc.id} → {acc.exchange_name} (API Key: {masked_key})")
    
    print("\n" + "=" * 60)
    print("💡 使用提示：")
    print("=" * 60)
    print("1. 创建策略时，填写 Symbol ID（如 1 代表 BTC-USDT-SWAP）")
    print("2. 启动实盘时，填写账户 ID（如 1 代表第一个 OKX 账户）")
    print("3. 运行 'python quick_start.py' 可快速创建示例策略")
    print("4. 访问 http://127.0.0.1:5173 使用可视化界面")
    print("")
    
    db.close()

if __name__ == "__main__":
    setup()
