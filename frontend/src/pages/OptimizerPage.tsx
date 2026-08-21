import React, { useState, useEffect } from 'react'
import {
  Card,
  Row,
  Col,
  Form,
  Select,
  InputNumber,
  Button,
  Table,
  Tag,
  Space,
  Alert,
  message,
  Typography,
  Divider,
  Statistic,
  Checkbox,
} from 'antd'
import {
  ThunderboltOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  ExperimentOutlined,
  DatabaseOutlined,
} from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import dayjs from 'dayjs'

import api from '../api'

const { Text, Paragraph, Title } = Typography

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

interface OptimizerResultItem {
  rank: number
  params: Record<string, any>
  score: number
  total_return: number
  benchmark_return: number
  win_rate: number
  sharpe_ratio: number
  max_drawdown: number
  profit_factor: number
  trade_count: number
  win_count: number
  loss_count: number
  avg_trade_pnl: number
}

const OptimizerPage: React.FC = () => {
  const navigate = useNavigate()
  const [strategies, setStrategies] = useState<StrategyOption[]>([])
  const [klineStats, setKlineStats] = useState<KlineStats[]>([])
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyOption | null>(null)
  const [selectedKline, setSelectedKline] = useState<KlineStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [applying, setApplying] = useState(false)

  // 待选参数候选池
  const [stopLossList, setStopLossList] = useState<number[]>([1.0, 2.0, 3.0, 5.0])
  const [takeProfitList, setTakeProfitList] = useState<number[]>([3.0, 5.0, 8.0, 12.0])
  const [trailingStopList, setTrailingStopList] = useState<number[]>([0.0, 1.0, 2.0])

  // 寻优输出结果
  const [optimizerOutput, setOptimizerOutput] = useState<{
    total_combinations: number
    elapsed_seconds: number
    best_result: OptimizerResultItem | null
    results: OptimizerResultItem[]
  } | null>(null)

  const [form] = Form.useForm()

  const loadBaseData = () => {
    setLoading(true)
    Promise.all([
      api.get<StrategyOption[]>('/strategies/'),
      api.get<KlineStats[]>('/market/klines/stats'),
    ])
      .then(([stratRes, klineRes]) => {
        setStrategies(stratRes.data)
        setKlineStats(klineRes.data)
      })
      .catch(err => {
        message.error('加载基础数据失败: ' + (err.response?.data?.detail || err.message))
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadBaseData()
  }, [])

  const getKlineKey = (stat: KlineStats) => `${stat.inst_id}_${stat.timeframe}`

  const handleStrategyChange = (strategyId: number) => {
    const strat = strategies.find(s => s.id === strategyId) || null
    setSelectedStrategy(strat)

    if (strat) {
      const matchingData = klineStats.find(
        k =>
          (strat.symbol_id && k.symbol_id === strat.symbol_id && k.timeframe === strat.timeframe) ||
          k.timeframe === strat.timeframe
      )
      if (matchingData) {
        form.setFieldsValue({ kline_data_key: getKlineKey(matchingData) })
        setSelectedKline(matchingData)
      } else {
        form.setFieldsValue({ kline_data_key: undefined })
        setSelectedKline(null)
      }
    }
  }

  const handleKlineChange = (key: string) => {
    const data = klineStats.find(k => getKlineKey(k) === key) || null
    setSelectedKline(data)
  }

  // 快捷预设模版
  const applyPreset = (type: 'fast' | 'normal' | 'fine') => {
    if (type === 'fast') {
      setStopLossList([1.5, 3.0])
      setTakeProfitList([4.0, 8.0])
      setTrailingStopList([0.0, 1.5])
    } else if (type === 'normal') {
      setStopLossList([1.0, 2.0, 3.0, 5.0])
      setTakeProfitList([3.0, 5.0, 8.0, 12.0])
      setTrailingStopList([0.0, 1.0, 2.0])
    } else if (type === 'fine') {
      setStopLossList([1.0, 1.5, 2.0, 3.0, 4.0, 5.0])
      setTakeProfitList([2.0, 4.0, 6.0, 8.0, 10.0, 15.0])
      setTrailingStopList([0.0, 1.0, 1.5, 2.5])
    }
    message.success('已切换参数搜索空间！')
  }

  // 运行寻优
  const handleRunOptimizer = () => {
    form.validateFields().then(values => {
      if (!selectedKline || !selectedKline.start_ts || !selectedKline.end_ts) {
        message.error('请选择有效的本地K线数据')
        return
      }

      setRunning(true)
      const paramGrid = {
        stop_loss_pct: stopLossList.length > 0 ? stopLossList : [2.0],
        take_profit_pct: takeProfitList.length > 0 ? takeProfitList : [5.0],
        trailing_stop_pct: trailingStopList.length > 0 ? trailingStopList : [0.0],
      }

      api
        .post('/optimizer/run', {
          strategy_id: values.strategy_id,
          start_ts: selectedKline.start_ts,
          end_ts: selectedKline.end_ts,
          initial_balance: values.initial_balance || 10000,
          param_grid: paramGrid,
          max_combinations: 100,
        })
        .then(res => {
          setOptimizerOutput(res.data)
          message.success(
            `网格寻优完成！在 ${res.data.elapsed_seconds} 秒内完成了 ${res.data.total_combinations} 组参数回测`
          )
        })
        .catch(err => {
          message.error('寻优执行失败: ' + (err.response?.data?.detail || err.message))
        })
        .finally(() => setRunning(false))
    })
  }

  // 应用最优参数
  const handleApplyParams = (params: Record<string, any>) => {
    if (!selectedStrategy) return
    setApplying(true)
    api
      .post('/optimizer/apply-best', {
        strategy_id: selectedStrategy.id,
        params,
      })
      .then(res => {
        message.success(res.data?.message || '已成功将选定参数应用到策略！')
        loadBaseData()
      })
      .catch(err => {
        message.error('应用参数失败: ' + (err.response?.data?.detail || err.message))
      })
      .finally(() => setApplying(false))
  }

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <ThunderboltOutlined style={{ color: '#fa8c16', fontSize: 20 }} />
            <span>策略参数网格寻优引擎 (Grid Search Optimizer)</span>
            <Tag color="orange">高维空间并行回测</Tag>
          </Space>
        }
      >
        <Paragraph type="secondary">
          为策略设定多维风控与指标参数搜索空间，后端将自动进行笛卡尔积组合全量高速回测，快速锁定夏普比率最高、收益率最大、回撤最低的最优量化参数组合。
        </Paragraph>

        <Card type="inner" title="1. 配置寻优目标与参数搜索空间" style={{ marginBottom: 20 }}>
          <Form form={form} layout="vertical" initialValues={{ initial_balance: 10000 }}>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  name="strategy_id"
                  label="选择待寻优策略"
                  rules={[{ required: true, message: '请选择策略' }]}
                >
                  <Select
                    placeholder="选择要寻优的策略"
                    options={strategies.map(s => ({
                      label: `${s.name} (${s.timeframe})`,
                      value: s.id,
                    }))}
                    onChange={handleStrategyChange}
                    showSearch
                    optionFilterProp="label"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={10}>
                <Form.Item
                  name="kline_data_key"
                  label="选择历史K线数据集"
                  rules={[{ required: true, message: '请选择已下载数据集' }]}
                >
                  <Select
                    placeholder="选择用于寻优的历史K线数据"
                    onChange={handleKlineChange}
                    options={klineStats.map(stat => ({
                      label: `${stat.inst_id} [${stat.timeframe}] · ${stat.count.toLocaleString()}条 (${
                        stat.start_ts ? dayjs(stat.start_ts).format('YYYY-MM-DD') : '-'
                      } ~ ${stat.end_ts ? dayjs(stat.end_ts).format('YYYY-MM-DD') : '-'})`,
                      value: getKlineKey(stat),
                    }))}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={6}>
                <Form.Item name="initial_balance" label="初始资金 (USDT)" rules={[{ required: true }]}>
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">
              <span>参数搜索网格配置</span>
              <Space style={{ marginLeft: 16 }}>
                <Button size="small" onClick={() => applyPreset('fast')}>
                  ⚡ 快速网格 (8组)
                </Button>
                <Button size="small" type="primary" ghost onClick={() => applyPreset('normal')}>
                  🎯 标准网格 (48组)
                </Button>
                <Button size="small" onClick={() => applyPreset('fine')}>
                  🔬 精细网格 (100组)
                </Button>
              </Space>
            </Divider>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Card size="small" title="🛡️ 止损比例候选 (%)">
                  <Select
                    mode="tags"
                    style={{ width: '100%' }}
                    value={stopLossList.map(String)}
                    onChange={vals => setStopLossList(vals.map(Number).filter(n => !isNaN(n)))}
                    placeholder="输入候选百分比并回车"
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    例如: 1.0, 2.0, 3.0, 5.0
                  </Text>
                </Card>
              </Col>

              <Col xs={24} md={8}>
                <Card size="small" title="🎯 止盈比例候选 (%)">
                  <Select
                    mode="tags"
                    style={{ width: '100%' }}
                    value={takeProfitList.map(String)}
                    onChange={vals => setTakeProfitList(vals.map(Number).filter(n => !isNaN(n)))}
                    placeholder="输入候选百分比并回车"
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    例如: 3.0, 5.0, 8.0, 12.0
                  </Text>
                </Card>
              </Col>

              <Col xs={24} md={8}>
                <Card size="small" title="🔄 移动追踪止损候选 (%)">
                  <Select
                    mode="tags"
                    style={{ width: '100%' }}
                    value={trailingStopList.map(String)}
                    onChange={vals => setTrailingStopList(vals.map(Number).filter(n => !isNaN(n)))}
                    placeholder="输入候选百分比并回车 (0代表不启用)"
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    例如: 0.0, 1.0, 2.0
                  </Text>
                </Card>
              </Col>
            </Row>

            <div style={{ marginTop: 20 }}>
              <Space size="middle">
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  size="large"
                  onClick={handleRunOptimizer}
                  loading={running}
                  disabled={!selectedKline}
                >
                  启动参数网格寻优 ({stopLossList.length * takeProfitList.length * trailingStopList.length} 组组合)
                </Button>
              </Space>
            </div>
          </Form>
        </Card>

        {/* 最优参数推荐卡片 */}
        {optimizerOutput && optimizerOutput.best_result && (
          <Alert
            style={{ marginBottom: 20, padding: 16 }}
            message={
              <Space>
                <TrophyOutlined style={{ color: '#faad14', fontSize: 20 }} />
                <span style={{ fontSize: 16, fontWeight: 'bold' }}>
                  寻优完成！为您推荐综合表现最佳的参数组合（TOP 1）
                </span>
              </Space>
            }
            description={
              <div style={{ marginTop: 12 }}>
                <Row gutter={16} align="middle">
                  <Col span={18}>
                    <Space wrap size="large">
                      <span>
                        🛡️ 止损: <Tag color="red">-{optimizerOutput.best_result.params.stop_loss_pct}%</Tag>
                      </span>
                      <span>
                        🎯 止盈: <Tag color="green">+{optimizerOutput.best_result.params.take_profit_pct}%</Tag>
                      </span>
                      <span>
                        🔄 追踪: <Tag color="orange">{optimizerOutput.best_result.params.trailing_stop_pct}%</Tag>
                      </span>
                      <span>
                        📈 策略总收益:{' '}
                        <b
                          style={{
                            color: optimizerOutput.best_result.total_return >= 0 ? '#3f8600' : '#cf1322',
                          }}
                        >
                          {optimizerOutput.best_result.total_return >= 0 ? '+' : ''}
                          {optimizerOutput.best_result.total_return}%
                        </b>
                      </span>
                      <span>
                        💎 夏普比率: <b>{optimizerOutput.best_result.sharpe_ratio}</b>
                      </span>
                      <span>
                        ⚠️ 最大回撤: <b style={{ color: '#cf1322' }}>{optimizerOutput.best_result.max_drawdown}%</b>
                      </span>
                      <span>
                        🏆 胜率: <b>{optimizerOutput.best_result.win_rate}%</b>
                      </span>
                    </Space>
                  </Col>
                  <Col span={6} style={{ textAlign: 'right' }}>
                    <Button
                      type="primary"
                      icon={<CheckCircleOutlined />}
                      size="large"
                      onClick={() => handleApplyParams(optimizerOutput.best_result!.params)}
                      loading={applying}
                    >
                      一键应用此最优参数
                    </Button>
                  </Col>
                </Row>
              </div>
            }
            type="success"
            showIcon
          />
        )}

        {/* 寻优排行榜表格 */}
        {optimizerOutput && (
          <div>
            <Divider orientation="left">
              参数组合综合表现排行榜 (共 {optimizerOutput.total_combinations} 组，耗时 {optimizerOutput.elapsed_seconds} 秒)
            </Divider>
            <Table
              rowKey="rank"
              dataSource={optimizerOutput.results}
              pagination={{ pageSize: 10 }}
              columns={[
                {
                  title: '排名',
                  dataIndex: 'rank',
                  width: 70,
                  render: r =>
                    r === 1 ? (
                      <Tag color="gold">🥇 1</Tag>
                    ) : r === 2 ? (
                      <Tag color="cyan">🥈 2</Tag>
                    ) : r === 3 ? (
                      <Tag color="purple">🥉 3</Tag>
                    ) : (
                      `#${r}`
                    ),
                },
                {
                  title: '参数组合',
                  width: 220,
                  render: (_, item: OptimizerResultItem) => (
                    <Space size="small" wrap>
                      <Tag color="red">SL: {item.params.stop_loss_pct}%</Tag>
                      <Tag color="green">TP: {item.params.take_profit_pct}%</Tag>
                      <Tag color="orange">TS: {item.params.trailing_stop_pct}%</Tag>
                    </Space>
                  ),
                },
                {
                  title: '综合得分',
                  dataIndex: 'score',
                  width: 100,
                  sorter: (a, b) => a.score - b.score,
                  render: s => <b>{s}</b>,
                },
                {
                  title: '策略总收益率',
                  dataIndex: 'total_return',
                  width: 130,
                  sorter: (a, b) => a.total_return - b.total_return,
                  render: r => (
                    <Tag color={r >= 0 ? 'green' : 'red'}>
                      {r >= 0 ? `+${r.toFixed(2)}%` : `${r.toFixed(2)}%`}
                    </Tag>
                  ),
                },
                {
                  title: '夏普比率',
                  dataIndex: 'sharpe_ratio',
                  width: 100,
                  sorter: (a, b) => a.sharpe_ratio - b.sharpe_ratio,
                  render: s => (
                    <span style={{ color: s >= 1 ? '#3f8600' : s >= 0 ? '#faad14' : '#cf1322' }}>
                      {s.toFixed(3)}
                    </span>
                  ),
                },
                {
                  title: '最大回撤',
                  dataIndex: 'max_drawdown',
                  width: 110,
                  sorter: (a, b) => a.max_drawdown - b.max_drawdown,
                  render: dd => <span style={{ color: '#cf1322' }}>{dd.toFixed(2)}%</span>,
                },
                {
                  title: '胜率 (盈利/亏损)',
                  width: 140,
                  render: (_, item) => `${item.win_rate.toFixed(1)}% (${item.win_count}/${item.loss_count})`,
                },
                {
                  title: '盈亏比',
                  dataIndex: 'profit_factor',
                  width: 90,
                  render: pf => pf.toFixed(2),
                },
                {
                  title: '交易次数',
                  dataIndex: 'trade_count',
                  width: 90,
                },
                {
                  title: '操作',
                  width: 120,
                  render: (_, item: OptimizerResultItem) => (
                    <Button
                      type="link"
                      size="small"
                      onClick={() => handleApplyParams(item.params)}
                    >
                      应用此参数
                    </Button>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Card>
    </div>
  )
}

export default OptimizerPage
