"""
诊断K线数据下载返回0条的原因
"""
import requests
from datetime import datetime, timedelta
import json

BASE_URL = "http://127.0.0.1:8000"

print("=" * 60)
print("🔍 诊断K线数据下载问题")
print("=" * 60)

# 1. 检查现有数据
print("\n📊 步骤1: 检查数据库中已有的K线数据")
try:
    resp = requests.get(f"{BASE_URL}/market/klines/stats", timeout=10)
    stats = resp.json()
    
    if stats:
        print(f"✅ 数据库中已有 {len(stats)} 个数据集:")
        for s in stats:
            print(f"   - {s['inst_id']} {s['timeframe']}: {s['count']}条")
            print(f"     时间范围: {s['start_ts'][:19]} ~ {s['end_ts'][:19]}")
    else:
        print("⚠️  数据库为空")
except Exception as e:
    print(f"❌ 查询失败: {e}")

# 2. 测试下载新数据（不同的时间范围）
print("\n📥 步骤2: 测试下载不同时间范围的数据")

test_cases = [
    {
        "name": "最近1天",
        "days": 1,
        "inst_id": "ETH-USDT-SWAP",  # 使用不同的交易对避免重复
        "timeframe": "1H"
    },
    {
        "name": "最近3天",
        "days": 3,
        "inst_id": "ETH-USDT-SWAP",
        "timeframe": "4H"
    }
]

for test in test_cases:
    print(f"\n🧪 测试: {test['name']} - {test['inst_id']} {test['timeframe']}")
    
    payload = {
        "inst_id": test['inst_id'],
        "timeframe": test['timeframe'],
        "start_ts": (datetime.now() - timedelta(days=test['days'])).isoformat(),
        "end_ts": datetime.now().isoformat(),
        "limit_per_call": 300
    }
    
    print(f"   时间范围: {payload['start_ts'][:16]} ~ {payload['end_ts'][:16]}")
    
    try:
        resp = requests.post(
            f"{BASE_URL}/market/klines/sync",
            json=payload,
            timeout=60
        )
        
        if resp.status_code == 200:
            result = resp.json()
            print(f"   ✅ 响应成功: 插入 {result['inserted']} 条")
            
            if result['inserted'] == 0:
                print(f"   💡 可能原因:")
                print(f"      1. 数据已存在（重复下载）")
                print(f"      2. 时间范围内无数据")
                print(f"      3. OKX API返回空数据")
        else:
            print(f"   ❌ 请求失败: {resp.status_code}")
            print(f"      错误: {resp.text[:200]}")
            
    except requests.exceptions.Timeout:
        print(f"   ⚠️  请求超时（60秒）")
    except Exception as e:
        print(f"   ❌ 错误: {e}")

# 3. 直接测试OKX API
print("\n\n🌐 步骤3: 直接测试OKX API连接")
try:
    okx_url = "https://www.okx.com/api/v5/market/candles"
    params = {
        "instId": "BTC-USDT-SWAP",
        "bar": "1H",
        "limit": "10"
    }
    
    print(f"   测试URL: {okx_url}")
    print(f"   参数: {params}")
    
    resp = requests.get(okx_url, params=params, timeout=30)
    
    if resp.status_code == 200:
        data = resp.json()
        if data.get('code') == '0':
            rows = data.get('data', [])
            print(f"   ✅ OKX API正常，返回 {len(rows)} 条数据")
            if rows:
                first_ts = datetime.fromtimestamp(int(rows[0][0]) / 1000.0)
                print(f"   最新K线时间: {first_ts}")
        else:
            print(f"   ⚠️  OKX API返回错误: {data}")
    else:
        print(f"   ❌ HTTP错误: {resp.status_code}")
        
except requests.exceptions.Timeout:
    print(f"   ⚠️  OKX API连接超时")
    print(f"   💡 可能需要配置代理或检查网络")
except Exception as e:
    print(f"   ❌ 错误: {e}")

print("\n" + "=" * 60)
print("📋 诊断完成！")
print("=" * 60)

print("\n💡 常见原因和解决方案:")
print("\n1️⃣  数据已存在")
print("   - 如果相同交易对、相同周期、相同时间范围的数据已下载")
print("   - 系统会跳过重复数据，返回插入0条")
print("   - 解决: 尝试下载不同的交易对或时间范围")

print("\n2️⃣  时间范围过滤")
print("   - 如果选择的时间范围与API返回数据不匹配")
print("   - 所有数据可能被过滤掉")
print("   - 解决: 使用最近几天的时间范围")

print("\n3️⃣  网络问题")
print("   - OKX API连接超时或失败")
print("   - 解决: 检查网络、配置代理")

print("\n4️⃣  后端服务未重启")
print("   - 代码修改后未生效")
print("   - 解决: 重启uvicorn服务")
