"""
重建数据库脚本
注意：运行前请先停止后端服务！
"""
import os
import sys
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

def rebuild_database():
    """重建数据库"""
    db_file = Path(__file__).parent / "okx_quant.db"
    
    print("=" * 60)
    print("🔄 开始重建数据库")
    print("=" * 60)
    
    # 检查数据库文件是否存在
    if db_file.exists():
        try:
            os.remove(db_file)
            print(f"✅ 已删除旧数据库: {db_file}")
        except PermissionError:
            print("❌ 错误: 数据库文件被占用！")
            print("   请先停止后端服务 (Ctrl+C 停止 uvicorn)")
            print("   或关闭所有正在使用数据库的程序")
            return False
        except Exception as e:
            print(f"❌ 删除数据库失败: {e}")
            return False
    else:
        print("ℹ️  数据库文件不存在，跳过删除")
    
    # 初始化数据库
    print("\n📦 正在创建新数据库...")
    try:
        from app.db.init_db import init_db
        init_db()
        print("✅ 数据库表结构创建成功")
    except Exception as e:
        print(f"❌ 创建数据库失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # 初始化交易对
    print("\n📊 正在初始化交易对...")
    try:
        from init_symbols import init_symbols
        init_symbols()
        print("✅ 交易对初始化完成")
    except Exception as e:
        print(f"❌ 初始化交易对失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print("\n" + "=" * 60)
    print("🎉 数据库重建完成！")
    print("=" * 60)
    print("\n下一步:")
    print("1. 重启后端服务: uvicorn app.main:app --reload")
    print("2. 访问前端: http://127.0.0.1:5173")
    print("3. 如需测试，运行: python test_new_features.py")
    print()
    
    return True

if __name__ == "__main__":
    # 检查是否在虚拟环境中
    if not hasattr(sys, 'real_prefix') and not (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
        print("⚠️  警告: 未检测到虚拟环境")
        print("   建议先激活虚拟环境: .venv\\Scripts\\Activate.ps1")
        response = input("是否继续? (y/n): ")
        if response.lower() != 'y':
            print("已取消")
            sys.exit(0)
    
    success = rebuild_database()
    sys.exit(0 if success else 1)
