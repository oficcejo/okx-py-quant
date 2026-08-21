import React, { useState, useEffect } from 'react'
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Select,
  InputNumber,
  Slider,
  Space,
  Tag,
  Alert,
  Statistic,
  message,
  Typography,
  Divider,
} from 'antd'
import {
  PieChartOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  ApartmentOutlined,
  SlidersOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import ReactECharts from 'echarts-for-react'

import api from '../api'

const { Text, Paragraph } = Typography

interface StrategyOption {
  id: number
  name: string
  symbol_id: number
  timeframe: string
  stop_loss_pct?: number | null
  take_profit_pct?: number | null
  trailing_stop_pct?: number | null
}

interface KlineStats {
  symbol_id?: number
  inst_id: string
  timeframe: string
  count: number
  start_ts: string | null
  end_ts: string | null
}

interface StrategyAllocationRow {
  strategy_id: number
  weight: number
  kline_data_key?: string
}

const PortfolioPage: React.FC = () => {
  const [strategies, setStrategies] = useState<StrategyOption[]>([])
  const [klineStats, setKlineStats] = useState<KlineStats[]>([])
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)

  const [initialBalance, setInitialBalance] = useState<number>(10000)
  const [allocations, setAllocations] = useState<StrategyAllocationRow[]>([])

  // 回测结果
  const [portfolioResult, setPortfolioResult] = useState<any | null>(null)

  const loadData = () => {
    setLoading(true)
    Promise.all([
      api.get<StrategyOption[]>('/strategies/'),
      api.get<KlineStats[]>('/market/klines/stats'),
    ])
      .then(([stratRes, klineRes]) => {
        setStrategies(stratRes.data)
        setKlineStats(klineRes.data)

        // 默认挑选前 2-3 个策略作为初始组合
        if (stratRes.data.length > 0) {
          const initRows: StrategyAllocationRow[] = stratRes.data.slice(0, 3).map((s, idx, arr) => {
            const matchK = klineRes.data.find(
              k => (s.symbol_id && k.symbol_id === s.symbol_id) || k.timeframe === s.timeframe
            )
            const kKey = matchK ? `${matchK.inst_id}_${matchK.timeframe}` : undefined
            const equalWeight = Math.floor(100 / arr.length)
            return {
              strategy_id: s.id,
              weight: idx === arr.length - 1 ? 100 - equalWeight * (arr.length - 1) : equalWeight,
              kline_data_key: kKey,
            }
          })
          setAllocations(initRows)
        }
      })
      .catch(err => {
        message.error('加载数据失败: ' + (err.response?.data?.detail || err.message))
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  const getKlineKey = (stat: KlineStats) => `${stat.inst_id}_${stat.timeframe}`

  // 添加策略到投资组合
  const handleAddStrategy = (stratId: number) => {
    if (allocations.some(a => a.strategy_id === stratId)) {
      message.warning('该策略已在组合中')
      return
    }
    const strat = strategies.find(s => s.id === stratId)
    const matchK = klineStats.find(
      k => (strat?.symbol_id && k.symbol_id === strat.symbol_id) || k.timeframe === strat?.timeframe
    )
    const kKey = matchK ? getKlineKey(matchK) : undefined

    const newRows = [...allocations, { strategy_id: stratId, weight: 20, kline_data_key: kKey }]
    setAllocations(newRows)
  }

  // 移除策略
  const handleRemoveStrategy = (stratId: number) => {
    setAllocations(allocations.filter(a => a.strategy_id !== stratId))
  }

  // 更新权重
  const handleWeightChange = (stratId: number, weight: number) => {
    setAllocations(allocations.map(a => (a.strategy_id === stratId ? { ...a, weight } : a)))
  }

  // 更新数据集
  const handleKlineChange = (stratId: number, kline_data_key: string) => {
    setAllocations(allocations.map(a => (a.strategy_id === stratId ? { ...a, kline_data_key } : a)))
  }

  // 均分权重
  const handleEqualWeights = () => {
    if (allocations.length === 0) return
    const equalW = Math.floor(100 / allocations.length)
    const newRows = allocations.map((a, idx) => ({
      ...a,
      weight: idx === allocations.length - 1 ? 100 - equalW * (allocations.length - 1) : equalW,
    }))
    setAllocations(newRows)
  }

  const totalWeight = allocations.reduce((sum, a) => sum + (a.weight || 0), 0)

  // 运行组合回测
  const handleRunPortfolio = () => {
    if (allocations.length === 0) {
      message.warning('请至少添加一个策略')
      return
    }

    const payloadAllocations = []
    for (const item of allocations) {
      const kline = klineStats.find(k => getKlineKey(k) === item.kline_data_key)
      if (!kline || !kline.start_ts || !kline.end_ts) {
        message.error(`策略 #${item.strategy_id} 未选定有效的已下载K线数据`)
        return
      }
      payloadAllocations.push({
        strategy_id: item.strategy_id,
        weight: item.weight,
        start_ts: kline.start_ts,
        end_ts: kline.end_ts,
      })
    }

    setRunning(true)
    api
      .post('/portfolio/backtest', {
        allocations: payloadAllocations,
        initial_balance: initialBalance,
      })
      .then(res => {
        setPortfolioResult(res.data)
        message.success('多策略投资组合回测完成！')
      })
      .catch(err => {
        message.error('组合回测失败: ' + (err.response?.data?.detail || err.message))
      })
      .finally(() => setRunning(false))
  }

  const getPortfolioChartOption = (curve: Array<{ ts: string; equity: number }>) => {
    return {
      title: { text: '投资组合总资产净值走势曲线', left: 'center' },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any[]) => {
          const point = params[0]
          return `${dayjs(point.name).format('YYYY-MM-DD HH:mm')}<br/>组合净值: <b>${Number(
            point.value
          ).toFixed(2)} USDT</b>`
        },
      },
      grid: { left: '4%', right: '4%', bottom: '8%', top: '16%', containLabel: true },
      xAxis: {
        type: 'category',
        data: curve.map(p => p.ts),
        axisLabel: {
          formatter: (value: string) => dayjs(value).format('MM-DD HH:mm'),
        },
      },
      yAxis: {
        type: 'value',
        name: 'USDT',
        scale: true,
      },
      series: [
        {
          name: '组合净值',
          type: 'line',
          data: curve.map(p => p.equity),
          smooth: true,
          showSymbol: false,
          areaStyle: {
            color: 'rgba(114, 46, 209, 0.15)',
          },
          lineStyle: { width: 2.5, color: '#722ed1' },
        },
      ],
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <PieChartOutlined style={{ color: '#722ed1', fontSize: 20 }} />
            <span>多策略投资组合与资产配置 (Portfolio Backtest)</span>
            <Tag color="purple">风险分散</Tag>
            <Tag color="cyan">收益相关性分析</Tag>
          </Space>
        }
      >
        <Paragraph type="secondary">
          将多个不同交易标的（BTC/ETH/SOL）、不同周期（趋势/震荡/波段）的策略打包成一个量化投资组合，自定义资金分配权重，检验分散投资降低回撤与提升组合夏普比率的效果。
        </Paragraph>

        {/* 组合配置卡片 */}
        <Card
          type="inner"
          title="1. 投资组合策略选择与资金权重分配"
          style={{ marginBottom: 20 }}
          extra={
            <Space>
              <Button size="small" onClick={handleEqualWeights}>
                一键均分权重 (100%)
              </Button>
              <Select
                placeholder="+ 添加策略至组合"
                style={{ width: 220 }}
                onChange={handleAddStrategy}
                value={undefined}
                options={strategies
                  .filter(s => !allocations.some(a => a.strategy_id === s.id))
                  .map(s => ({
                    label: `${s.name} (${s.timeframe})`,
                    value: s.id,
                  }))}
              />
            </Space>
          }
        >
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Text strong>初始总投资本金 (USDT):</Text>
              <InputNumber
                min={100}
                style={{ width: '100%', marginTop: 6 }}
                value={initialBalance}
                onChange={v => setInitialBalance(v || 10000)}
              />
            </Col>
            <Col span={16}>
              <Text strong>
                当前分配总权重:{' '}
                <b style={{ color: totalWeight === 100 ? '#52c41a' : '#fa8c16' }}>{totalWeight}%</b>
                {totalWeight !== 100 && ' (建议调整为 100%)'}
              </Text>
            </Col>
          </Row>

          <Table
            rowKey="strategy_id"
            dataSource={allocations}
            pagination={false}
            columns={[
              {
                title: '策略名称',
                dataIndex: 'strategy_id',
                width: 220,
                render: (id: number) => {
                  const s = strategies.find(item => item.id === id)
                  return (
                    <span>
                      <b>{s?.name || `策略 #${id}`}</b> <Tag color="blue">{s?.timeframe}</Tag>
                    </span>
                  )
                },
              },
              {
                title: '使用数据集',
                width: 280,
                render: (_, record: StrategyAllocationRow) => (
                  <Select
                    placeholder="选择已下载行情数据"
                    style={{ width: '100%' }}
                    value={record.kline_data_key}
                    onChange={val => handleKlineChange(record.strategy_id, val)}
                    options={klineStats.map(stat => ({
                      label: `${stat.inst_id} [${stat.timeframe}] · ${stat.count}条`,
                      value: getKlineKey(stat),
                    }))}
                  />
                ),
              },
              {
                title: '资金权重配比 (%)',
                width: 260,
                render: (_, record: StrategyAllocationRow) => (
                  <Row gutter={12} align="middle">
                    <Col span={16}>
                      <Slider
                        min={1}
                        max={100}
                        value={record.weight}
                        onChange={val => handleWeightChange(record.strategy_id, val)}
                      />
                    </Col>
                    <Col span={8}>
                      <InputNumber
                        min={1}
                        max={100}
                        value={record.weight}
                        onChange={val => handleWeightChange(record.strategy_id, val || 0)}
                        addonAfter="%"
                        style={{ width: '100%' }}
                      />
                    </Col>
                  </Row>
                ),
              },
              {
                title: '操作',
                width: 80,
                render: (_, record: StrategyAllocationRow) => (
                  <Button
                    type="link"
                    danger
                    size="small"
                    onClick={() => handleRemoveStrategy(record.strategy_id)}
                  >
                    移除
                  </Button>
                ),
              },
            ]}
          />

          <div style={{ marginTop: 20 }}>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              size="large"
              onClick={handleRunPortfolio}
              loading={running}
              disabled={allocations.length === 0}
            >
              运行投资组合混合回测
            </Button>
          </div>
        </Card>

        {/* 组合回测结果看板 */}
        {portfolioResult && portfolioResult.portfolio_summary && (
          <div>
            <Divider orientation="left">投资组合综合表现概览</Divider>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="组合总本金"
                    value={portfolioResult.portfolio_summary.initial_balance}
                    precision={2}
                    suffix="USDT"
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="组合最终权益"
                    value={portfolioResult.portfolio_summary.final_equity}
                    precision={2}
                    suffix="USDT"
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="组合净盈亏"
                    value={portfolioResult.portfolio_summary.net_profit}
                    precision={2}
                    suffix="USDT"
                    valueStyle={{
                      color:
                        portfolioResult.portfolio_summary.net_profit >= 0 ? '#3f8600' : '#cf1322',
                    }}
                    prefix={portfolioResult.portfolio_summary.net_profit >= 0 ? '+' : ''}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="组合总收益率"
                    value={portfolioResult.portfolio_summary.total_return}
                    precision={2}
                    suffix="%"
                    valueStyle={{
                      color:
                        portfolioResult.portfolio_summary.total_return >= 0 ? '#3f8600' : '#cf1322',
                    }}
                    prefix={portfolioResult.portfolio_summary.total_return >= 0 ? '+' : ''}
                  />
                </Card>
              </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 20 }}>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="组合夏普比率"
                    value={portfolioResult.portfolio_summary.sharpe_ratio}
                    precision={3}
                    valueStyle={{ color: '#722ed1' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="组合最大回撤"
                    value={portfolioResult.portfolio_summary.max_drawdown}
                    precision={2}
                    suffix="%"
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="组合策略数量"
                    value={portfolioResult.portfolio_summary.total_strategies}
                    suffix="个策略"
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="组合总交易笔数"
                    value={portfolioResult.portfolio_summary.total_trades}
                    suffix="笔"
                  />
                </Card>
              </Col>
            </Row>

            {/* 组合净值走势图 */}
            {portfolioResult.portfolio_curve && portfolioResult.portfolio_curve.length > 0 && (
              <Card size="small" style={{ marginBottom: 20 }}>
                <ReactECharts
                  option={getPortfolioChartOption(portfolioResult.portfolio_curve)}
                  style={{ height: 380 }}
                  notMerge
                  lazyUpdate
                />
              </Card>
            )}

            {/* 各策略贡献明细 */}
            <Card
              size="small"
              title="各策略收益贡献与风险明细"
              style={{ marginBottom: 20 }}
            >
              <Table
                rowKey="strategy_id"
                dataSource={portfolioResult.individual_summaries || []}
                pagination={false}
                columns={[
                  { title: '策略名称', dataIndex: 'strategy_name', width: 220 },
                  {
                    title: '分配权重',
                    dataIndex: 'weight_pct',
                    width: 100,
                    render: w => `${w}%`,
                  },
                  {
                    title: '分配资金',
                    dataIndex: 'allocated_capital',
                    width: 130,
                    render: c => `${c.toFixed(2)} USDT`,
                  },
                  {
                    title: '最终权益',
                    dataIndex: 'final_equity',
                    width: 130,
                    render: e => `${e.toFixed(2)} USDT`,
                  },
                  {
                    title: '独立收益率',
                    dataIndex: 'total_return',
                    width: 120,
                    render: r => (
                      <Tag color={r >= 0 ? 'green' : 'red'}>
                        {r >= 0 ? `+${r.toFixed(2)}%` : `${r.toFixed(2)}%`}
                      </Tag>
                    ),
                  },
                  {
                    title: '胜率',
                    dataIndex: 'win_rate',
                    width: 100,
                    render: w => `${w.toFixed(1)}%`,
                  },
                  {
                    title: '夏普比率',
                    dataIndex: 'sharpe_ratio',
                    width: 100,
                  },
                  {
                    title: '独立最大回撤',
                    dataIndex: 'max_drawdown',
                    width: 120,
                    render: dd => <span style={{ color: '#cf1322' }}>{dd.toFixed(2)}%</span>,
                  },
                  {
                    title: '交易次数',
                    dataIndex: 'trade_count',
                    width: 90,
                  },
                ]}
              />
            </Card>

            {/* 策略相关性矩阵 */}
            {portfolioResult.correlation_matrix && portfolioResult.correlation_matrix.length > 0 && (
              <Card size="small" title="📊 策略收益相关性矩阵 (Correlation Matrix)">
                <Paragraph type="secondary" style={{ fontSize: 13 }}>
                  相关系数介于 -1.0 到 +1.0 之间。相关性越低（或为负相关），说明两策略在不同行情环境下互补性越强，组合分散风险效果越优。
                </Paragraph>
                <Table
                  rowKey={r => `${r.source}_${r.target}`}
                  dataSource={portfolioResult.correlation_matrix}
                  size="small"
                  pagination={{ pageSize: 9 }}
                  columns={[
                    { title: '策略 1 (Source)', dataIndex: 'source', width: 220 },
                    { title: '策略 2 (Target)', dataIndex: 'target', width: 220 },
                    {
                      title: '皮尔逊相关系数 (Correlation)',
                      dataIndex: 'correlation',
                      width: 160,
                      render: (corr: number) => {
                        let color = 'default'
                        if (corr >= 0.7) color = 'red'
                        else if (corr >= 0.3) color = 'orange'
                        else if (corr > -0.3) color = 'green'
                        else color = 'purple'
                        return <Tag color={color}>{corr.toFixed(3)}</Tag>
                      },
                    },
                  ]}
                />
              </Card>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}

export default PortfolioPage
