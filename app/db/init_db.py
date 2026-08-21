from sqlalchemy import text
from .session import Base, engine
import app.models  # noqa: F401


def init_db() -> None:
    Base.metadata.create_all(bind=engine)

    # 自动补充 SQLite 表新增字段（避免历史数据库未迁移报错）
    with engine.connect() as conn:
        try:
            res = conn.execute(text("PRAGMA table_info(strategies)"))
            columns = [row[1] for row in res.fetchall()]
            if "stop_loss_pct" not in columns:
                conn.execute(text("ALTER TABLE strategies ADD COLUMN stop_loss_pct FLOAT"))
            if "take_profit_pct" not in columns:
                conn.execute(text("ALTER TABLE strategies ADD COLUMN take_profit_pct FLOAT"))
            # 自动补充 symbols 表新增字段
            sym_info = conn.execute(text("PRAGMA table_info(symbols)"))
            sym_cols = [row[1] for row in sym_info.fetchall()]
            if "category" not in sym_cols:
                conn.execute(text("ALTER TABLE symbols ADD COLUMN category VARCHAR(32) DEFAULT 'CRYPTO'"))
            if "display_name" not in sym_cols:
                conn.execute(text("ALTER TABLE symbols ADD COLUMN display_name VARCHAR(128)"))
            if "description" not in sym_cols:
                conn.execute(text("ALTER TABLE symbols ADD COLUMN description VARCHAR(256)"))
            if "is_custom" not in sym_cols:
                conn.execute(text("ALTER TABLE symbols ADD COLUMN is_custom BOOLEAN DEFAULT 0"))
            if "created_at" not in sym_cols:
                conn.execute(text("ALTER TABLE symbols ADD COLUMN created_at DATETIME"))

            # 预置 TradFi 大宗商品、美股指数与加密货币标的列表
            preset_symbols = [
                # 🪙 贵金属与大宗商品
                ("XAU-USDT-SWAP", "XAU", "USDT", "SWAP", "COMMODITY", "黄金/USDT 永续合约 (Gold)", "OKX 国际黄金指数衍生品"),
                ("XAG-USDT-SWAP", "XAG", "USDT", "SWAP", "COMMODITY", "白银/USDT 永续合约 (Silver)", "OKX 国际白银衍生品"),
                ("OIL-USDT-SWAP", "OIL", "USDT", "SWAP", "COMMODITY", "原油/USDT 永续合约 (Crude Oil)", "WTI 美原油标的"),
                ("COPPER-USDT-SWAP", "COPPER", "USDT", "SWAP", "COMMODITY", "铜/USDT 永续合约 (Copper)", "国际高品位精铜衍生品"),
                ("NG-USDT-SWAP", "NG", "USDT", "SWAP", "COMMODITY", "天然气/USDT 永续合约 (Natural Gas)", "亨利港天然气合约"),
                # 📈 TradFi 美股热门股票与指数 ETF
                ("NVDA-USDT-SWAP", "NVDA", "USDT", "SWAP", "STOCK", "英伟达/USDT 股票合约 (NVIDIA)", "美股 AI 算力龙头"),
                ("TSLA-USDT-SWAP", "TSLA", "USDT", "SWAP", "STOCK", "特斯拉/USDT 股票合约 (Tesla)", "美股电动车与智能出行龙头"),
                ("AAPL-USDT-SWAP", "AAPL", "USDT", "SWAP", "STOCK", "苹果/USDT 股票合约 (Apple)", "全球消费电子科技龙头"),
                ("MSFT-USDT-SWAP", "MSFT", "USDT", "SWAP", "STOCK", "微软/USDT 股票合约 (Microsoft)", "云计算与软件巨头"),
                ("AMZN-USDT-SWAP", "AMZN", "USDT", "SWAP", "STOCK", "亚马逊/USDT 股票合约 (Amazon)", "全球电商与云计算龙头"),
                ("SPY-USDT-SWAP", "SPY", "USDT", "SWAP", "INDEX", "标普500 ETF 合约 (S&P 500)", "美股大盘基准指数"),
                ("QQQ-USDT-SWAP", "QQQ", "USDT", "SWAP", "INDEX", "纳斯达克100 ETF 合约 (Nasdaq 100)", "美股科技大盘指数"),
                # 🚀 主流加密货币
                ("BTC-USDT-SWAP", "BTC", "USDT", "SWAP", "CRYPTO", "BTC/USDT 永续合约", "比特币永续合约"),
                ("ETH-USDT-SWAP", "ETH", "USDT", "SWAP", "CRYPTO", "ETH/USDT 永续合约", "以太坊永续合约"),
                ("SOL-USDT-SWAP", "SOL", "USDT", "SWAP", "CRYPTO", "SOL/USDT 永续合约", "Solana 永续合约"),
                ("BNB-USDT-SWAP", "BNB", "USDT", "SWAP", "CRYPTO", "BNB/USDT 永续合约", "BNB 平台代币合约"),
                ("DOGE-USDT-SWAP", "DOGE", "USDT", "SWAP", "CRYPTO", "DOGE/USDT 永续合约", "狗狗币永续合约"),
                ("XRP-USDT-SWAP", "XRP", "USDT", "SWAP", "CRYPTO", "XRP/USDT 永续合约", "瑞波币永续合约"),
                ("BTC-USDT", "BTC", "USDT", "SPOT", "CRYPTO", "BTC/USDT 现货", "比特币现货交易"),
                ("ETH-USDT", "ETH", "USDT", "SPOT", "CRYPTO", "ETH/USDT 现货", "以太坊现货交易"),
            ]

            for inst_id, base, quote, inst_type, category, display_name, desc in preset_symbols:
                existing = conn.execute(text("SELECT id FROM symbols WHERE inst_id = :inst_id"), {"inst_id": inst_id}).scalar()
                if not existing:
                    conn.execute(
                        text(
                            "INSERT INTO symbols (inst_id, base_ccy, quote_ccy, inst_type, category, display_name, description, is_custom, is_active, exchange_name) "
                            "VALUES (:inst_id, :base, :quote, :inst_type, :category, :display_name, :desc, 0, 1, 'OKX')"
                        ),
                        {
                            "inst_id": inst_id,
                            "base": base,
                            "quote": quote,
                            "inst_type": inst_type,
                            "category": category,
                            "display_name": display_name,
                            "desc": desc,
                        },
                    )
                else:
                    conn.execute(
                        text(
                            "UPDATE symbols SET category = :category, display_name = :display_name, description = :desc "
                            "WHERE inst_id = :inst_id AND (category IS NULL OR display_name IS NULL)"
                        ),
                        {
                            "inst_id": inst_id,
                            "category": category,
                            "display_name": display_name,
                            "desc": desc,
                        },
                    )

            # 初始化基础通知渠道
            notif_count = conn.execute(text("SELECT count(*) FROM notification_configs")).scalar()
            if not notif_count:
                conn.execute(
                    text(
                        "INSERT INTO notification_configs (channel, config_json, is_enabled) "
                        "VALUES ('TELEGRAM', '{}', 0), ('FEISHU', '{}', 0), ('WECHAT', '{}', 0), ('DINGTALK', '{}', 0)"
                    )
                )

            conn.commit()
        except Exception as e:
            print(f"[init_db] 迁移检测提示: {e}")



