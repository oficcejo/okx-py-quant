"""
快速开始：一键设置环境并创建示例策略
"""
from app.db.session import SessionLocal
from app.models import Symbol, ExchangeAccount, User
from passlib.hash import bcrypt
import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def quick_start():
    db = SessionLocal()
    
    print("🚀 开始快速设置...\n")
    
    # 1. 创建用户
    user = db.query(User).first()
    if not user:
        user = User(username="admin", password_hash=bcrypt.hash("admin123"))
        db.add(user)
        db.commit()
    print(f"✅ 用户 ID: {user.id}")
    
    # 2. 创建BTC品种
    btc = db.query(Symbol).filter(Symbol.inst_id == "BTC-USDT-SWAP").first()
    if not btc:
        btc = Symbol(
            exchange_name="OKX",
            inst_id="BTC-USDT-SWAP",
            base_ccy="BTC",
            quote_ccy="USDT",
            inst_type="SWAP"
        )
        db.add(btc)
        db.commit()
    print(f"✅ BTC Symbol ID: {btc.id}")
    
    # 3. 创建账户（请修改为真实API密钥）
    account = db.query(ExchangeAccount).filter(ExchangeAccount.user_id == user.id).first()
    if not account:
        account = ExchangeAccount(
            user_id=user.id,
            exchange_name="OKX",
            api_key="YOUR_API_KEY",
            api_secret="YOUR_SECRET",
            passphrase="YOUR_PASSPHRASE"
        )
        db.add(account)
        db.commit()
    print(f"✅ 账户 ID: {account.id}")
    
    db.close()
    
    # 4. 创建示例策略
    strategy_config = {
        "buy_groups": [{
            "logic": "AND",
            "conditions": [
                {"side": "BUY", "indicator_type": "MACD", "signal_type": "MACD_GOLDEN_CROSS", "params": {}},
                {"side": "BUY", "indicator_type": "RSI", "signal_type": "RSI_OVERSOLD", "params": {"threshold": 30}}
            ]
        }],
        "sell_groups": [{
            "logic": "OR",
            "conditions": [
                {"side": "SELL", "indicator_type": "MACD", "signal_type": "MACD_DEAD_CROSS", "params": {}},
                {"side": "SELL", "indicator_type": "RSI", "signal_type": "RSI_OVERBOUGHT", "params": {"threshold": 70}}
            ]
        }]
    }
    
    payload = {
        "name": "快速开始示例策略",
        "description": "MACD金叉+RSI超卖买入，MACD死叉或RSI超买卖出",
        "symbol_id": btc.id,
        "timeframe": "1H",
        "leverage": 1.0,
        "monitor_interval_sec": 60,
        "config_json": json.dumps(strategy_config)
    }
    
    try:
        response = requests.post(f"{BASE_URL}/strategies/", json=payload)
        strategy = response.json()
        print(f"✅ 策略 ID: {strategy['id']}")
        
        print("\n" + "="*60)
        print("✅ 设置完成！请记住以下 ID：")
        print("="*60)
        print(f"Symbol ID (BTC): {btc.id}")
        print(f"账户 ID: {account.id}")
        print(f"策略 ID: {strategy['id']}")
        print("\n下一步：")
        print("1. 访问 http://127.0.0.1:5173/strategies 查看策略")
        print("2. 使用可视化构建器创建更多策略")
        print("3. 运行回测验证策略")
        print("4. 配置真实API后启动实盘交易")
        
    except Exception as e:
        print(f"❌ 创建策略失败: {e}")
        print("提示：请确保后端服务正在运行 (uvicorn app.main:app --reload)")

if __name__ == "__main__":
    quick_start()
