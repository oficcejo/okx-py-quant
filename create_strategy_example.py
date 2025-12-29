"""
创建示例策略：买入光脚阴线，卖出RSI超买
运行此脚本前请确保后端服务正在运行
"""
import json
import requests

# 后端API地址
BASE_URL = "http://127.0.0.1:8000"

# 策略配置
strategy_config = {
    "buy_groups": [
        {
            "logic": "AND",
            "conditions": [
                {
                    "side": "BUY",
                    "indicator_type": "CANDLE",
                    "signal_type": "CANDLE_BAREFOOT_BEARISH",
                    "params": {
                        "tolerance": 0.0001
                    }
                }
            ]
        }
    ],
    "sell_groups": [
        {
            "logic": "AND",
            "conditions": [
                {
                    "side": "SELL",
                    "indicator_type": "RSI",
                    "signal_type": "RSI_OVERBOUGHT",
                    "params": {
                        "threshold": 70
                    }
                }
            ]
        }
    ]
}

def create_symbol_if_not_exists():
    """确保有可用的交易品种"""
    # 先检查是否有Symbol
    try:
        # 创建一个BTC-USDT-SWAP品种（如果不存在）
        from app.db.session import SessionLocal
        from app.models import Symbol
        
        db = SessionLocal()
        symbol = db.query(Symbol).filter(Symbol.inst_id == "BTC-USDT-SWAP").first()
        if not symbol:
            symbol = Symbol(
                exchange_name="OKX",
                inst_id="BTC-USDT-SWAP",
                base_ccy="BTC",
                quote_ccy="USDT",
                inst_type="SWAP",
                is_active=True
            )
            db.add(symbol)
            db.commit()
            db.refresh(symbol)
            print(f"✅ 创建交易品种: {symbol.inst_id} (ID: {symbol.id})")
        else:
            print(f"✅ 交易品种已存在: {symbol.inst_id} (ID: {symbol.id})")
        
        symbol_id = symbol.id
        db.close()
        return symbol_id
    except Exception as e:
        print(f"⚠️  直接操作数据库失败: {e}")
        print("请手动确保数据库中有Symbol数据，或使用API创建")
        return 1  # 默认使用ID=1

def create_strategy_via_api(symbol_id: int):
    """通过API创建策略"""
    payload = {
        "name": "光脚阴线买入-RSI超买卖出",
        "description": "买入信号：K线形态为光脚阴线（收盘价=最低价的阴线）\n卖出信号：RSI超买（RSI>70）",
        "symbol_id": symbol_id,
        "timeframe": "1H",  # 1小时周期
        "leverage": 1.0,
        "monitor_interval_sec": 60,  # 每60秒检查一次
        "config_json": json.dumps(strategy_config, ensure_ascii=False)
    }
    
    try:
        response = requests.post(f"{BASE_URL}/strategies/", json=payload)
        response.raise_for_status()
        result = response.json()
        print("\n🎉 策略创建成功！")
        print(f"策略ID: {result['id']}")
        print(f"策略名称: {result['name']}")
        print(f"交易品种ID: {result['symbol_id']}")
        print(f"时间周期: {result['timeframe']}")
        print(f"\n策略配置:")
        print(json.dumps(strategy_config, indent=2, ensure_ascii=False))
        return result
    except requests.exceptions.ConnectionError:
        print("❌ 无法连接到后端服务，请确保后端正在运行: uvicorn app.main:app --reload")
    except Exception as e:
        print(f"❌ 创建策略失败: {e}")
        if hasattr(e, 'response'):
            print(f"响应内容: {e.response.text}")

if __name__ == "__main__":
    print("=" * 60)
    print("创建策略：光脚阴线买入 + RSI超买卖出")
    print("=" * 60)
    
    # 确保有Symbol数据
    symbol_id = create_symbol_if_not_exists()
    
    # 创建策略
    create_strategy_via_api(symbol_id)
