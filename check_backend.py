"""检查后端服务状态"""
import requests

BASE_URL = "http://127.0.0.1:8000"

try:
    # 检查健康端点
    resp = requests.get(f"{BASE_URL}/health", timeout=2)
    print(f"✅ 后端服务正常")
    print(f"   状态码: {resp.status_code}")
    print(f"   响应: {resp.text}")
except requests.exceptions.ConnectionError:
    print(f"❌ 无法连接到后端服务")
    print(f"   请检查后端是否在运行: uvicorn app.main:app --reload")
except Exception as e:
    print(f"❌ 错误: {e}")

# 检查一个简单的GET接口
try:
    resp = requests.get(f"{BASE_URL}/market/klines/stats", timeout=5)
    print(f"\n✅ /market/klines/stats 接口正常")
    print(f"   状态码: {resp.status_code}")
    print(f"   数据: {resp.json()}")
except Exception as e:
    print(f"\n❌ /market/klines/stats 接口错误: {e}")
