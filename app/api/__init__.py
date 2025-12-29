from fastapi import APIRouter

from app.api import dashboard, backtest, ai, market, strategies, instances


api_router = APIRouter()

api_router.include_router(dashboard.router)
api_router.include_router(backtest.router)
api_router.include_router(ai.router)
api_router.include_router(market.router)
api_router.include_router(strategies.router)
api_router.include_router(instances.router)
