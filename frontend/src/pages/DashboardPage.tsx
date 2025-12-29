import React, { useEffect, useState } from 'react'
import { Card, Col, Row, Statistic, Table, Alert, Button, Space, Tag } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'

import api from '../api'

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

const DashboardPage: React.FC = () => {
  const [equity, setEquity] = useState<EquityPoint[]>([])
  const [trades, setTrades] = useState<TradeRow[]>([])
  const [accountBalance, setAccountBalance] = useState<AccountBalanceResponse | null>(null)
  const [loading, setLoading] = useState(false)

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
