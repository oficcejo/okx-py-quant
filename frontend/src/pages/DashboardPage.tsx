import React, { useEffect, useState } from 'react'
import { Card, Col, Row, Statistic, Table, Alert, Button, Space, Tag, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'

import api from '../api'

const { Text } = Typography


interface EquityPoint {
  ts: string
  equity: number
}

interface TradeRow {
  ts: string
  side: string
  price: number
  qty: number
  status?: string
  pnl?: number | null
}

interface Balance {
  currency: string
  balance: number
  balance_usd: number
}

interface AccountBalanceResponse {
  success: boolean
  message: string
  total_equity: number
  balances: Balance[]
}

interface TickerItem {
  instId: string
  last: string
  open24h: string
  high24h: string
  low24h: string
  vol24h: string
  change24h: string
  ts: string
}

const DashboardPage: React.FC = () => {
  const [equity, setEquity] = useState<EquityPoint[]>([])
  const [trades, setTrades] = useState<TradeRow[]>([])
  const [accountBalance, setAccountBalance] = useState<AccountBalanceResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)
  const [tickers, setTickers] = useState<Record<string, TickerItem>>({
    'BTC-USDT-SWAP': {
      instId: 'BTC-USDT-SWAP',
      last: '96500.0',
      open24h: '94200.0',
      high24h: '97200.0',
      low24h: '93800.0',
      vol24h: '125000',
      change24h: '+2.44%',
      ts: new Date().toISOString(),
    },
    'ETH-USDT-SWAP': {
      instId: 'ETH-USDT-SWAP',
      last: '2780.0',
      open24h: '2690.0',
      high24h: '2820.0',
      low24h: '2660.0',
      vol24h: '480000',
      change24h: '+3.35%',
      ts: new Date().toISOString(),
    },
    'SOL-USDT-SWAP': {
      instId: 'SOL-USDT-SWAP',
      last: '185.5',
      open24h: '178.0',
      high24h: '191.0',
      low24h: '175.2',
      vol24h: '920000',
      change24h: '+4.21%',
      ts: new Date().toISOString(),
    },
  })

  const loadAccountBalance = async () => {
    setLoading(true)
    try {
      const res = await api.get<AccountBalanceResponse>('/dashboard/account-balance')
      setAccountBalance(res.data)
    } catch (error) {
      console.error('获取账户余额失败:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    api.get<EquityPoint[]>('/dashboard/equity').then(res => setEquity(res.data))
    api.get<TradeRow[]>('/dashboard/recent-trades').then(res => setTrades(res.data))
    loadAccountBalance()

    // 建立 WebSocket 实时行情连接
    let ws: WebSocket | null = null
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const defaultHost = import.meta.env.DEV ? '127.0.0.1:8000' : window.location.host
      const wsUrl = `${protocol}//${defaultHost}/ws/market`
      ws = new WebSocket(wsUrl)


      ws.onopen = () => {
        setWsConnected(true)
      }

      ws.onmessage = event => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'snapshot' && Array.isArray(msg.tickers)) {
            const map: Record<string, TickerItem> = {}
            msg.tickers.forEach((t: TickerItem) => {
              map[t.instId] = t
            })
            setTickers(prev => ({ ...prev, ...map }))
          } else if (msg.type === 'ticker' && msg.data) {
            const t = msg.data as TickerItem
            setTickers(prev => ({ ...prev, [t.instId]: t }))
          }
        } catch (e) {
          // ignore
        }
      }

      ws.onclose = () => {
        setWsConnected(false)
      }
    } catch (e) {
      console.error('WS 连接异常:', e)
    }

    return () => {
      if (ws) ws.close()
    }
  }, [])


  const latestEquity = equity.length ? equity[equity.length - 1].equity : 0

  const equityOption = {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: equity.map(p => p.ts),
    },
    yAxis: { type: 'value' },
    series: [
      {
        type: 'line',
        data: equity.map(p => p.equity),
        smooth: true,
        areaStyle: {},
      },
    ],
  }

  return (
    <div>
      {/* OKX WebSocket 实时行情推送 */}
      <Card
        title={
          <Space>
            <span>⚡ OKX WebSocket 实时行情流</span>
            {wsConnected ? (
              <Tag color="success">🟢 实时推送中</Tag>
            ) : (
              <Tag color="default">⚪ 连接中 / 轮询就绪</Tag>
            )}
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Row gutter={16}>
          {Object.values(tickers).map(t => {
            const isPos = !t.change24h.startsWith('-')
            return (
              <Col xs={24} sm={12} md={8} lg={6} key={t.instId}>
                <Card size="small" style={{ background: '#fafafa' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text strong>{t.instId}</Text>
                    <Tag color={isPos ? 'green' : 'red'}>{t.change24h}</Tag>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 'bold', color: isPos ? '#3f8600' : '#cf1322' }}>
                    ${Number(t.last).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                    24h 高: ${Number(t.high24h).toLocaleString()} | 低: ${Number(t.low24h).toLocaleString()}
                  </div>
                </Card>
              </Col>
            )
          })}
        </Row>
      </Card>

      {/* 账户余额卡片 */}
      <Card 
        title="OKX 账户信息" 
        style={{ marginBottom: 16 }}
        extra={
          <Button 
            icon={<ReloadOutlined />} 
            onClick={loadAccountBalance}

            loading={loading}
          >
            刷新
          </Button>
        }
      >
        {accountBalance && !accountBalance.success && (
          <Alert 
            message={accountBalance.message} 
            type="warning" 
            showIcon 
            style={{ marginBottom: 16 }}
          />
        )}
        
        {accountBalance && accountBalance.success && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Statistic 
                  title="账户总权益 (USDT)" 
                  value={accountBalance.total_equity} 
                  precision={2} 
                />
              </Col>
              <Col span={8}>
                <Statistic 
                  title="持有币种数量" 
                  value={accountBalance.balances.length} 
                />
              </Col>
            </Row>
            
            <Table
              size="small"
              dataSource={accountBalance.balances}
              rowKey="currency"
              pagination={false}
              columns={[
                { 
                  title: '币种', 
                  dataIndex: 'currency',
                  render: (text) => <Tag color="blue">{text}</Tag>
                },
                { 
                  title: '数量', 
                  dataIndex: 'balance',
                  align: 'right',
                  render: (val) => val.toFixed(8)
                },
                { 
                  title: '估值 (USDT)', 
                  dataIndex: 'balance_usd',
                  align: 'right',
                  render: (val) => val.toFixed(2)
                },
              ]}
            />
          </>
        )}
      </Card>

      {/* 账户权益曲线（历史数据） */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="账户总权益（历史）" value={latestEquity} precision={2} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={16}>
          <Card title="账户权益曲线" bordered={false}>
            <ReactECharts style={{ height: 320 }} option={equityOption} notMerge lazyUpdate />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="最近交易" bordered={false}>
            <Table
              size="small"
              rowKey={(_, idx) => String(idx)}
              dataSource={trades}
              pagination={{ pageSize: 8 }}
              columns={[
                { title: '时间', dataIndex: 'ts', width: 120 },
                { title: '方向', dataIndex: 'side', width: 80 },
                { title: '价格', dataIndex: 'price', width: 90 },
                { title: '数量', dataIndex: 'qty', width: 90 },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default DashboardPage
