import React, { useState, useEffect } from 'react'
import {
  Button,
  Card,
  Form,
  InputNumber,
  Select,
  Table,
  message,
  Alert,
  Space,
  Tag,
  Modal,
  Statistic,
  Row,
  Col,
  Popconfirm,
  Divider,
  Typography,
} from 'antd'
import {
  EyeOutlined,
  DeleteOutlined,
  DatabaseOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import ReactECharts from 'echarts-for-react'

import api from '../api'

const { Text } = Typography

interface StrategyOption {
  id: number
  name: string
  symbol_id: number
  timeframe: string
  description?: string
}

interface KlineStats {
  symbol_id?: number
  inst_id: string
  timeframe: string
  count: number
  start_ts: string | null
  end_ts: string | null
}

interface BacktestRow {
  id: number
  strategy_id: number
  start_ts: string
  end_ts: string
  initial_balance: number
  status: string
  result_json?: string
  created_at?: string
}

interface BacktestResult {
  equity_curve: Array<{ ts: string; equity: number }>
  trade_count: number
  total_return?: number
  win_rate?: number
  sharpe_ratio?: number
  max_drawdown?: number
  profit_factor?: number
}

const BacktestsPage: React.FC = () => {
  const navigate = useNavigate()
  const [strategies, setStrategies] = useState<StrategyOption[]>([])
  const [klineStats, setKlineStats] = useState<KlineStats[]>([])
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyOption | null>(null)
  const [selectedKlineData, setSelectedKlineData] = useState<KlineStats | null>(null)
  const [rows, setRows] = useState<BacktestRow[]>([])
  const [loading, setLoading] = useState(false)
  const [runningBacktest, setRunningBacktest] = useState(false)
  const [form] = Form.useForm()

  // 回测结果弹窗
  const [resultModal, setResultModal] = useState(false)
  const [currentResult, setCurrentResult] = useState<BacktestRow | null>(null)

  const loadData = () => {
    setLoading(true)
    Promise.all([
      api.get<StrategyOption[]>('/strategies/'),
      api.get<KlineStats[]>('/market/klines/stats'),
      api.get<BacktestRow[]>('/backtests/'),
    ])
      .then(([stratRes, klineRes, btRes]) => {
        setStrategies(stratRes.data)
        setKlineStats(klineRes.data)
        setRows(btRes.data)
      })
      .catch(err => {
        message.error('加载数据失败: ' + (err.response?.data?.detail || err.message))
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  const loadBacktests = () => {
    api.get<BacktestRow[]>('/backtests/').then(res => setRows(res.data))
  }

  // 生成数据集的唯一标识 key
  const getKlineKey = (stat: KlineStats) => `${stat.inst_id}_${stat.timeframe}`

  // 策略选择变化时，自动匹配并默认选中对应的已下载数据
  const handleStrategyChange = (strategyId: number) => {
    const strategy = strategies.find(s => s.id === strategyId) || null
    setSelectedStrategy(strategy)

    if (strategy) {
      // 优先匹配当前策略的品种与周期
      const matchingData = klineStats.find(
        k =>
          (strategy.symbol_id && k.symbol_id === strategy.symbol_id && k.timeframe === strategy.timeframe) ||
          k.timeframe === strategy.timeframe
      )

      if (matchingData) {
        const key = getKlineKey(matchingData)
        form.setFieldsValue({ kline_data_key: key })
        setSelectedKlineData(matchingData)
      } else {
        form.setFieldsValue({ kline_data_key: undefined })
        setSelectedKlineData(null)
      }
    } else {
      form.setFieldsValue({ kline_data_key: undefined })
      setSelectedKlineData(null)
    }
  }

  // 数据集选择变化时
  const handleKlineDataChange = (key: string) => {
    const data = klineStats.find(k => getKlineKey(k) === key) || null
    setSelectedKlineData(data)
  }

  // 删除回测记录
  const handleDelete = (id: number) => {
    api
      .delete(`/backtests/${id}`)
      .then(() => {
        message.success('删除成功')
        loadBacktests()
      })
      .catch(err => {
        message.error('删除失败: ' + (err.response?.data?.detail || err.message))
      })
  }

  // 运行回测
  const handleRun = () => {
    form
      .validateFields()
      .then(values => {
        if (!selectedKlineData || !selectedKlineData.start_ts || !selectedKlineData.end_ts) {
          message.error('请选择有效的已下载K线数据')
          return
        }

        const payload = {
          strategy_id: values.strategy_id,
          start_ts: selectedKlineData.start_ts,
          end_ts: selectedKlineData.end_ts,
          initial_balance: values.initial_balance || 10000,
        }

        setRunningBacktest(true)
        return api.post<BacktestRow>('/backtests/', payload)
      })
      .then(res => {
        if (res) {
          setRows(prev => [res.data, ...prev])
          message.success('回测已完成！')
          // 自动弹出回测结果
          setCurrentResult(res.data)
          setResultModal(true)
        }
      })
      .catch(err => {
        message.error('回测失败: ' + (err.response?.data?.detail || err.message))
      })
      .finally(() => setRunningBacktest(false))
  }

  // 查看回测结果
  const handleViewResult = (record: BacktestRow) => {
    setCurrentResult(record)
    setResultModal(true)
  }

  // 解析回测结果
  const parseResult = (record: BacktestRow): BacktestResult | null => {
    if (!record.result_json) return null
    try {
      return JSON.parse(record.result_json)
    } catch {
      return null
    }
  }

  // 计算盈亏
  const calculateProfit = (result: BacktestResult, initialBalance: number) => {
    if (!result.equity_curve || result.equity_curve.length === 0) {
      return { profit: 0, profitPct: 0, finalEquity: initialBalance }
    }
    const finalEquity = result.equity_curve[result.equity_curve.length - 1].equity
    const profit = finalEquity - initialBalance
    const profitPct = (profit / initialBalance) * 100
    return { profit, profitPct, finalEquity }
  }

  // 权益曲线配置
  const getEquityChartOption = (equityCurve: Array<{ ts: string; equity: number }>) => {
    return {
      title: { text: '权益走势曲线', left: 'center' },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const point = params[0]
          return `${dayjs(point.name).format('YYYY-MM-DD HH:mm')}<br/>账户权益: <b>${Number(
            point.value
          ).toFixed(2)} USDT</b>`
        },
      },
      grid: { left: '4%', right: '4%', bottom: '8%', containLabel: true },
      xAxis: {
        type: 'category',
        data: equityCurve.map(p => p.ts),
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
          name: '权益',
          type: 'line',
          data: equityCurve.map(p => p.equity),
          smooth: true,
          showSymbol: false,
          areaStyle: {
            color: 'rgba(24, 144, 255, 0.2)',
          },
          lineStyle: { width: 2, color: '#1890ff' },
        },
      ],
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <span>策略回测</span>
            <Tag color="blue">本地数据驱动</Tag>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
              刷新
            </Button>
            <Button icon={<DatabaseOutlined />} onClick={() => navigate('/data')}>
              数据管理
            </Button>
          </Space>
        }
      >
        {/* 回测配置表单 */}
        <Card type="inner" title="配置回测任务" style={{ marginBottom: 20 }}>
          <Form form={form} layout="vertical" initialValues={{ initial_balance: 10000 }}>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  name="strategy_id"
                  label="1. 选择回测策略"
                  rules={[{ required: true, message: '请选择策略' }]}
                >
                  <Select
                    placeholder="选择要回测的策略"
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
                  label="2. 选择已下载的数据集（替代手动时间区间）"
                  rules={[{ required: true, message: '请选择已下载的K线数据' }]}
                >
                  <Select
                    placeholder={
                      klineStats.length === 0
                        ? '暂无已下载数据，请先前往数据管理下载'
                        : '选择用于回测的本地K线数据'
                    }
                    onChange={handleKlineDataChange}
                    notFoundContent={
                      <div style={{ padding: 12, textAlign: 'center' }}>
                        暂无已下载数据，
                        <Link to="/data">点击前往数据管理下载</Link>
                      </div>
                    }
                    options={klineStats.map(stat => ({
                      label: `${stat.inst_id} [${stat.timeframe}] · ${stat.count.toLocaleString()}条 (${
                        stat.start_ts ? dayjs(stat.start_ts).format('YYYY-MM-DD HH:mm') : '-'
                      } ~ ${
                        stat.end_ts ? dayjs(stat.end_ts).format('YYYY-MM-DD HH:mm') : '-'
                      })`,
                      value: getKlineKey(stat),
                    }))}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={6}>
                <Form.Item name="initial_balance" label="3. 初始资金 (USDT)" rules={[{ required: true }]}>
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            {/* 数据集详情提示卡片 */}
            {selectedKlineData && (
              <Alert
                style={{ marginTop: 8, marginBottom: 16 }}
                message="已选定回测数据集"
                description={
                  <Row gutter={[16, 8]} align="middle">
                    <Col span={24}>
                      <Space wrap size="middle">
                        <span>
                          📊 交易品种: <Tag color="blue">{selectedKlineData.inst_id}</Tag>
                        </span>
                        <span>
                          ⏱️ K线周期: <Tag color="cyan">{selectedKlineData.timeframe}</Tag>
                        </span>
                        <span>
                          📦 数据总量: <Tag color="green">{selectedKlineData.count.toLocaleString()} 根K线</Tag>
                        </span>
                        <span>
                          📅 时间跨度:{' '}
                          <Tag color="purple">
                            {selectedKlineData.start_ts
                              ? dayjs(selectedKlineData.start_ts).format('YYYY-MM-DD HH:mm')
                              : 'N/A'}{' '}
                            ~{' '}
                            {selectedKlineData.end_ts
                              ? dayjs(selectedKlineData.end_ts).format('YYYY-MM-DD HH:mm')
                              : 'N/A'}
                          </Tag>
                        </span>
                      </Space>
                    </Col>
                  </Row>
                }
                type="success"
                showIcon
              />
            )}

            {/* 策略无匹配数据提示 */}
            {selectedStrategy && !selectedKlineData && klineStats.length > 0 && (
              <Alert
                style={{ marginTop: 8, marginBottom: 16 }}
                message="未匹配到当前策略对应的K线数据"
                description={
                  <Space direction="vertical">
                    <span>
                      当前策略默认配置周期为 <Tag color="orange">{selectedStrategy.timeframe}</Tag>
                      ，请在上方下拉框选择可用数据集，或前往数据管理页面下载。
                    </span>
                    <Button type="primary" size="small" onClick={() => navigate('/data')}>
                      前往数据管理下载数据
                    </Button>
                  </Space>
                }
                type="warning"
                showIcon
              />
            )}

            {klineStats.length === 0 && (
              <Alert
                style={{ marginTop: 8, marginBottom: 16 }}
                message="本地数据库中尚无K线数据"
                description={
                  <Space direction="vertical">
                    <span>回测需要本地 K 线数据，请先进入数据管理页面下载历史行情。</span>
                    <Button type="primary" size="small" onClick={() => navigate('/data')}>
                      前往数据管理下载数据
                    </Button>
                  </Space>
                }
                type="info"
                showIcon
              />
            )}

            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleRun}
              loading={runningBacktest}
              disabled={!selectedKlineData || klineStats.length === 0}
              size="large"
            >
              运行回测
            </Button>
          </Form>
        </Card>

        {/* 历史回测列表 */}
        <Divider orientation="left">历史回测记录</Divider>
        <Table
          rowKey="id"
          dataSource={rows}
          loading={loading}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: 'ID', dataIndex: 'id', width: 60 },
            {
              title: '策略名称',
              dataIndex: 'strategy_id',
              width: 180,
              render: (stratId: number) => {
                const strat = strategies.find(s => s.id === stratId)
                return strat ? (
                  <span>
                    <b>{strat.name}</b> <Tag color="blue">{strat.timeframe}</Tag>
                  </span>
                ) : (
                  `策略 #${stratId}`
                )
              },
            },
            {
              title: '回测数据时间范围',
              width: 280,
              render: (_, record: BacktestRow) => (
                <Text style={{ fontSize: 13 }}>
                  {dayjs(record.start_ts).format('YYYY-MM-DD HH:mm')} ~{' '}
                  {dayjs(record.end_ts).format('YYYY-MM-DD HH:mm')}
                </Text>
              ),
            },
            {
              title: '初始资金',
              dataIndex: 'initial_balance',
              width: 120,
              render: (val: number) => `${val?.toFixed(2)} USDT`,
            },
            {
              title: '收益率概览',
              width: 130,
              render: (_, record: BacktestRow) => {
                const res = parseResult(record)
                if (!res) return '-'
                const ret = res.total_return ?? 0
                return (
                  <Tag color={ret >= 0 ? 'green' : 'red'}>
                    {ret >= 0 ? `+${ret.toFixed(2)}%` : `${ret.toFixed(2)}%`}
                  </Tag>
                )
              },
            },
            {
              title: '胜率',
              width: 100,
              render: (_, record: BacktestRow) => {
                const res = parseResult(record)
                if (!res || res.win_rate === undefined) return '-'
                return `${res.win_rate.toFixed(1)}%`
              },
            },
            {
              title: '状态',
              dataIndex: 'status',
              width: 100,
              render: (status: string) => {
                const colorMap: Record<string, string> = {
                  FINISHED: 'success',
                  RUNNING: 'processing',
                  PENDING: 'default',
                  FAILED: 'error',
                }
                return <Tag color={colorMap[status] || 'default'}>{status}</Tag>
              },
            },
            {
              title: '操作',
              width: 140,
              render: (_, record: BacktestRow) => (
                <Space>
                  {record.status === 'FINISHED' && record.result_json ? (
                    <Button
                      type="link"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => handleViewResult(record)}
                    >
                      查看报告
                    </Button>
                  ) : null}
                  <Popconfirm
                    title="确认删除"
                    description="确定要删除这条回测记录吗？"
                    onConfirm={() => handleDelete(record.id)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />

        {/* 回测结果详情弹窗 */}
        <Modal
          title="回测结果分析报告"
          open={resultModal}
          onCancel={() => setResultModal(false)}
          width={920}
          footer={[
            <Button key="close" type="primary" onClick={() => setResultModal(false)}>
              关闭
            </Button>,
          ]}
        >
          {currentResult &&
            (() => {
              const result = parseResult(currentResult)
              if (!result) {
                return <Alert message="无法解析回测结果" type="error" />
              }

              const strat = strategies.find(s => s.id === currentResult.strategy_id)
              const { profit, profitPct, finalEquity } = calculateProfit(
                result,
                currentResult.initial_balance
              )

              return (
                <div>
                  {/* 策略基本信息 */}
                  <div
                    style={{
                      marginBottom: 16,
                      padding: '10px 16px',
                      background: '#f5f7fa',
                      borderRadius: 6,
                    }}
                  >
                    <Space size="large">
                      <span>
                        🎯 策略名称: <b>{strat?.name || `策略 #${currentResult.strategy_id}`}</b>
                      </span>
                      <span>
                        📅 回测区间:{' '}
                        <b>
                          {dayjs(currentResult.start_ts).format('YYYY-MM-DD HH:mm')} ~{' '}
                          {dayjs(currentResult.end_ts).format('YYYY-MM-DD HH:mm')}
                        </b>
                      </span>
                    </Space>
                  </div>

                  {/* 核心收益指标 */}
                  <Row gutter={16} style={{ marginBottom: 20 }}>
                    <Col span={6}>
                      <Card size="small">
                        <Statistic
                          title="初始资金"
                          value={currentResult.initial_balance}
                          precision={2}
                          suffix="USDT"
                        />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small">
                        <Statistic
                          title="最终权益"
                          value={finalEquity}
                          precision={2}
                          suffix="USDT"
                        />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small">
                        <Statistic
                          title="净盈亏"
                          value={profit}
                          precision={2}
                          suffix="USDT"
                          valueStyle={{ color: profit >= 0 ? '#3f8600' : '#cf1322' }}
                          prefix={profit >= 0 ? '+' : ''}
                        />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small">
                        <Statistic
                          title="总收益率"
                          value={result.total_return ?? profitPct}
                          precision={2}
                          suffix="%"
                          valueStyle={{
                            color: (result.total_return ?? profitPct) >= 0 ? '#3f8600' : '#cf1322',
                          }}
                          prefix={(result.total_return ?? profitPct) >= 0 ? '+' : ''}
                        />
                      </Card>
                    </Col>
                  </Row>

                  {/* 交易分析指标 */}
                  <Row gutter={16} style={{ marginBottom: 20 }}>
                    <Col span={6}>
                      <Card size="small">
                        <Statistic title="总交易次数" value={result.trade_count} />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small">
                        <Statistic
                          title="胜率"
                          value={result.win_rate ?? 0}
                          precision={2}
                          suffix="%"
                          valueStyle={{
                            color: (result.win_rate ?? 0) >= 50 ? '#3f8600' : '#cf1322',
                          }}
                        />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small">
                        <Statistic
                          title="盈亏比"
                          value={result.profit_factor ?? 0}
                          precision={2}
                          valueStyle={{
                            color: (result.profit_factor ?? 0) >= 1 ? '#3f8600' : '#cf1322',
                          }}
                        />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small">
                        <Statistic
                          title="夏普比率"
                          value={result.sharpe_ratio ?? 0}
                          precision={3}
                          valueStyle={{
                            color:
                              (result.sharpe_ratio ?? 0) >= 1
                                ? '#3f8600'
                                : (result.sharpe_ratio ?? 0) >= 0
                                ? '#faad14'
                                : '#cf1322',
                          }}
                        />
                      </Card>
                    </Col>
                  </Row>

                  {/* 风险指标 */}
                  <Row gutter={16} style={{ marginBottom: 20 }}>
                    <Col span={12}>
                      <Card size="small">
                        <Statistic
                          title="最大回撤 (Max Drawdown)"
                          value={result.max_drawdown ?? 0}
                          precision={2}
                          suffix="%"
                          valueStyle={{ color: '#cf1322' }}
                        />
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card size="small">
                        <Statistic
                          title="回测 K 线数据点数"
                          value={result.equity_curve.length}
                          suffix="个周期点"
                        />
                      </Card>
                    </Col>
                  </Row>

                  {/* 权益曲线图表 */}
                  {result.equity_curve && result.equity_curve.length > 0 && (
                    <Card size="small" title="权益曲线图">
                      <ReactECharts
                        option={getEquityChartOption(result.equity_curve)}
                        style={{ height: 380 }}
                        notMerge
                        lazyUpdate
                      />
                    </Card>
                  )}
                </div>
              )
            })()}
        </Modal>
      </Card>
    </div>
  )
}

export default BacktestsPage

