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
  Tabs,
} from 'antd'
import {
  EyeOutlined,
  DeleteOutlined,
  DatabaseOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  RiseOutlined,
  LineChartOutlined,
  UnorderedListOutlined,
  RobotOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
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

interface TradeRecord {
  id: number
  position_side?: string
  entry_time: string
  entry_price: number
  exit_time: string
  exit_price: number
  qty: number
  pnl: number
  pnl_pct: number
  fee: number
  exit_reason: string
  holding_bars: number
}


interface BacktestResult {
  equity_curve: Array<{ ts: string; equity: number }>
  benchmark_curve?: Array<{ ts: string; equity: number }>
  trades_list?: TradeRecord[]
  trade_count: number
  win_count?: number
  loss_count?: number
  total_return?: number
  benchmark_return?: number
  win_rate?: number
  sharpe_ratio?: number
  max_drawdown?: number
  profit_factor?: number
  avg_trade_pnl?: number
  max_win?: number
  max_loss?: number
  stop_loss_pct?: number | null
  take_profit_pct?: number | null
  trailing_stop_pct?: number | null
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

  // AI 回测诊断与调优弹窗
  const [aiDiagModalOpen, setAiDiagModalOpen] = useState(false)
  const [aiDiagLoading, setAiDiagLoading] = useState(false)
  const [aiDiagResult, setAiDiagResult] = useState<any | null>(null)
  const [savingAiStrategy, setSavingAiStrategy] = useState(false)

  const handleOpenAiDiagnosis = () => {
    if (!currentResult) return
    const result = parseResult(currentResult)
    if (!result) return
    const strat = strategies.find(s => s.id === currentResult.strategy_id)
    const { profitPct } = calculateProfit(result, currentResult.initial_balance)
    const winTrades = (result.trades_list || []).filter(t => t.pnl > 0).length
    const lossTrades = (result.trades_list || []).filter(t => t.pnl < 0).length

    setAiDiagModalOpen(true)
    setAiDiagLoading(true)
    setAiDiagResult(null)

    api
      .post('/ai/diagnose-backtest', {
        strategy_id: currentResult.strategy_id,
        strategy_name: strat?.name || `策略 #${currentResult.strategy_id}`,
        timeframe: strat?.timeframe || '1H',
        config_json: strat ? strat.config_json : null,
        total_return: profitPct,
        benchmark_return: result.benchmark_return || 0.0,
        win_rate: result.win_rate || (result.trades_count > 0 ? (winTrades / result.trades_count) * 100 : 0),
        sharpe_ratio: result.sharpe_ratio || 0.0,
        max_drawdown: result.max_drawdown || 0.0,
        profit_factor: result.profit_factor || 1.0,
        trade_count: result.trades_count || (result.trades_list ? result.trades_list.length : 0),
        win_count: winTrades,
        loss_count: lossTrades,
        stop_loss_pct: result.stop_loss_pct,
        take_profit_pct: result.take_profit_pct,
        trailing_stop_pct: result.trailing_stop_pct,
      })
      .then(res => {
        setAiDiagResult(res.data)
      })
      .catch(err => {
        message.error('AI 诊断生成失败: ' + (err.response?.data?.detail || err.message))
      })
      .finally(() => setAiDiagLoading(false))
  }

  const handleSaveAiStrategy = () => {
    if (!aiDiagResult || !aiDiagResult.optimized_strategy || !currentResult) return
    const strat = strategies.find(s => s.id === currentResult.strategy_id)
    setSavingAiStrategy(true)
    const opt = aiDiagResult.optimized_strategy
    api
      .post('/strategies/', {
        name: opt.name || `${strat?.name || '策略'} (AI调优版)`,
        description: opt.description || '由AI根据回测数据调优生成',
        symbol_id: strat?.symbol_id || 1,
        timeframe: strat?.timeframe || '1H',
        leverage: 1.0,
        monitor_interval_sec: 60,
        stop_loss_pct: opt.stop_loss_pct,
        take_profit_pct: opt.take_profit_pct,
        trailing_stop_pct: opt.trailing_stop_pct,
        config_json:
          typeof opt.config_json === 'string'
            ? opt.config_json
            : JSON.stringify(opt.config_json, null, 2),
      })
      .then(() => {
        message.success('已成功将 AI 调优方案保存为全新策略！')
        setAiDiagModalOpen(false)
        loadData()
      })
      .catch(err => {
        message.error('保存新策略失败: ' + (err.response?.data?.detail || err.message))
      })
      .finally(() => setSavingAiStrategy(false))
  }


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

  // 权益曲线配置（支持策略收益 vs 买入持有基准双曲线）
  const getEquityChartOption = (
    equityCurve: Array<{ ts: string; equity: number }>,
    benchmarkCurve?: Array<{ ts: string; equity: number }>
  ) => {
    const series: any[] = [
      {
        name: '策略净值',
        type: 'line',
        data: equityCurve.map(p => p.equity),
        smooth: true,
        showSymbol: false,
        areaStyle: {
          color: 'rgba(24, 144, 255, 0.15)',
        },
        lineStyle: { width: 2.5, color: '#1890ff' },
      },
    ]

    const legendData = ['策略净值']

    if (benchmarkCurve && benchmarkCurve.length > 0) {
      legendData.push('买入持有基准 (Buy & Hold)')
      series.push({
        name: '买入持有基准 (Buy & Hold)',
        type: 'line',
        data: benchmarkCurve.map(p => p.equity),
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 1.8, color: '#fa8c16', type: 'dashed' },
      })
    }

    return {
      title: { text: '策略净值走势 vs 买入持有基准', left: 'center' },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any[]) => {
          let content = `${dayjs(params[0].name).format('YYYY-MM-DD HH:mm')}<br/>`
          params.forEach(p => {
            content += `${p.marker} ${p.seriesName}: <b>${Number(p.value).toFixed(2)} USDT</b><br/>`
          })
          return content
        },
      },
      legend: { top: 28, data: legendData },
      grid: { left: '4%', right: '4%', bottom: '8%', top: '16%', containLabel: true },
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
      series,
    }
  }

  // 平仓原因标签
  const renderExitReasonTag = (reason: string) => {
    switch (reason) {
      case 'TAKE_PROFIT':
        return <Tag color="success">🎯 止盈平仓</Tag>
      case 'STOP_LOSS':
        return <Tag color="error">⚠️ 止损平仓</Tag>
      case 'TRAILING_STOP':
        return <Tag color="warning">🛡️ 移动止盈止损</Tag>
      case 'SIGNAL_CLOSE_LONG':
      case 'SIGNAL_SELL':
        return <Tag color="blue">🔴 平多信号</Tag>
      case 'SIGNAL_CLOSE_SHORT':
        return <Tag color="purple">🟣 平空信号</Tag>
      default:
        return <Tag color="blue">{reason}</Tag>
    }
  }


  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <span>策略回测</span>
            <Tag color="blue">本地数据驱动</Tag>
            <Tag color="purple">风控模拟</Tag>
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

            {/* 数据集与风控详情提示卡片 */}
            {selectedKlineData && (
              <Alert
                style={{ marginTop: 8, marginBottom: 16 }}
                message="已选定回测数据集与风控参数"
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
                        {selectedStrategy?.stop_loss_pct && (
                          <span>
                            🛡️ 止损: <Tag color="red">-{selectedStrategy.stop_loss_pct}%</Tag>
                          </span>
                        )}
                        {selectedStrategy?.take_profit_pct && (
                          <span>
                            🎯 止盈: <Tag color="green">+{selectedStrategy.take_profit_pct}%</Tag>
                          </span>
                        )}
                        {selectedStrategy?.trailing_stop_pct && (
                          <span>
                            🔄 移动追踪: <Tag color="orange">{selectedStrategy.trailing_stop_pct}%</Tag>
                          </span>
                        )}
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
              title: '策略收益率',
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
              title: '基准收益(Buy&Hold)',
              width: 150,
              render: (_, record: BacktestRow) => {
                const res = parseResult(record)
                if (!res || res.benchmark_return === undefined) return '-'
                const ret = res.benchmark_return
                return (
                  <Tag color={ret >= 0 ? 'orange' : 'default'}>
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
              title: '总交易笔数',
              width: 110,
              render: (_, record: BacktestRow) => {
                const res = parseResult(record)
                return res?.trade_count ?? '-'
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

        {/* 回测结果详情弹窗（双Tab：收益与对比走势 / 逐笔交易明细） */}
        <Modal
          title="回测结果综合分析报告"
          open={resultModal}
          onCancel={() => setResultModal(false)}
          width={1000}
          footer={[
            <Button
              key="ai-diag"
              type="primary"
              style={{ background: '#722ed1', borderColor: '#722ed1' }}
              icon={<RobotOutlined />}
              onClick={handleOpenAiDiagnosis}
            >
              🤖 AI 深度诊断与自动调优
            </Button>,
            <Button key="close" onClick={() => setResultModal(false)}>
              关闭报告
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
                  {/* 策略基本信息与风控参数 */}
                  <div
                    style={{
                      marginBottom: 16,
                      padding: '10px 16px',
                      background: '#f5f7fa',
                      borderRadius: 6,
                    }}
                  >
                    <Row justify="space-between" align="middle">
                      <Col>
                        <Space size="middle" wrap>
                          <span>
                            🎯 策略: <b>{strat?.name || `策略 #${currentResult.strategy_id}`}</b>
                          </span>
                          <span>
                            📅 区间:{' '}
                            <b>
                              {dayjs(currentResult.start_ts).format('YYYY-MM-DD HH:mm')} ~{' '}
                              {dayjs(currentResult.end_ts).format('YYYY-MM-DD HH:mm')}
                            </b>
                          </span>
                        </Space>
                      </Col>
                      <Col>
                        <Space>
                          {result.stop_loss_pct ? (
                            <Tag color="red">止损: -{result.stop_loss_pct}%</Tag>
                          ) : null}
                          {result.take_profit_pct ? (
                            <Tag color="green">止盈: +{result.take_profit_pct}%</Tag>
                          ) : null}
                          {result.trailing_stop_pct ? (
                            <Tag color="orange">移动止损: {result.trailing_stop_pct}%</Tag>
                          ) : null}
                        </Space>
                      </Col>
                    </Row>
                  </div>

                  <Tabs
                    defaultActiveKey="overview"
                    items={[
                      {
                        key: 'overview',
                        label: (
                          <span>
                            <LineChartOutlined /> 收益指标与走势对比
                          </span>
                        ),
                        children: (
                          <div>
                            {/* 核心收益指标 */}
                            <Row gutter={16} style={{ marginBottom: 16 }}>
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
                                    title="策略总收益率"
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

                            {/* 交易分析指标与基准对比 */}
                            <Row gutter={16} style={{ marginBottom: 16 }}>
                              <Col span={6}>
                                <Card size="small">
                                  <Statistic
                                    title="买入持有基准收益"
                                    value={result.benchmark_return ?? 0}
                                    precision={2}
                                    suffix="%"
                                    valueStyle={{
                                      color: (result.benchmark_return ?? 0) >= 0 ? '#d46b08' : '#cf1322',
                                    }}
                                    prefix={(result.benchmark_return ?? 0) >= 0 ? '+' : ''}
                                  />
                                </Card>
                              </Col>
                              <Col span={6}>
                                <Card size="small">
                                  <Statistic
                                    title="胜率 (盈利/亏损)"
                                    value={result.win_rate ?? 0}
                                    precision={1}
                                    suffix={`% (${result.win_count || 0}/${result.loss_count || 0})`}
                                    valueStyle={{
                                      color: (result.win_rate ?? 0) >= 50 ? '#3f8600' : '#cf1322',
                                    }}
                                  />
                                </Card>
                              </Col>
                              <Col span={6}>
                                <Card size="small">
                                  <Statistic
                                    title="盈亏比 (Profit Factor)"
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

                            {/* 风险与单笔指标 */}
                            <Row gutter={16} style={{ marginBottom: 16 }}>
                              <Col span={6}>
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
                              <Col span={6}>
                                <Card size="small">
                                  <Statistic
                                    title="平均每笔盈亏"
                                    value={result.avg_trade_pnl ?? 0}
                                    precision={2}
                                    suffix="USDT"
                                  />
                                </Card>
                              </Col>
                              <Col span={6}>
                                <Card size="small">
                                  <Statistic
                                    title="单笔最大盈利"
                                    value={result.max_win ?? 0}
                                    precision={2}
                                    suffix="USDT"
                                    valueStyle={{ color: '#3f8600' }}
                                    prefix="+"
                                  />
                                </Card>
                              </Col>
                              <Col span={6}>
                                <Card size="small">
                                  <Statistic
                                    title="单笔最大亏损"
                                    value={result.max_loss ?? 0}
                                    precision={2}
                                    suffix="USDT"
                                    valueStyle={{ color: '#cf1322' }}
                                  />
                                </Card>
                              </Col>
                            </Row>

                            {/* 双曲线图表 */}
                            {result.equity_curve && result.equity_curve.length > 0 && (
                              <Card size="small">
                                <ReactECharts
                                  option={getEquityChartOption(
                                    result.equity_curve,
                                    result.benchmark_curve
                                  )}
                                  style={{ height: 380 }}
                                  notMerge
                                  lazyUpdate
                                />
                              </Card>
                            )}
                          </div>
                        ),
                      },
                      {
                        key: 'trades',
                        label: (
                          <span>
                            <UnorderedListOutlined /> 逐笔交易明细 ({result.trades_list?.length || 0} 笔)
                          </span>
                        ),
                        children: (
                          <Table
                            rowKey="id"
                            dataSource={result.trades_list || []}
                            size="small"
                            pagination={{ pageSize: 8 }}
                            columns={[
                              { title: '#', dataIndex: 'id', width: 50 },
                              {
                                title: '方向',
                                dataIndex: 'position_side',
                                width: 85,
                                render: (s: string) =>
                                  s === 'SHORT' ? (
                                    <Tag color="volcano">📉 做空</Tag>
                                  ) : (
                                    <Tag color="cyan">📈 做多</Tag>
                                  ),
                              },
                              {
                                title: '开仓时间',
                                dataIndex: 'entry_time',
                                width: 140,
                                render: (ts: string) => dayjs(ts).format('YYYY-MM-DD HH:mm'),
                              },

                              {
                                title: '开仓价格',
                                dataIndex: 'entry_price',
                                width: 110,
                                render: (p: number) => `${p.toFixed(2)} USDT`,
                              },
                              {
                                title: '平仓时间',
                                dataIndex: 'exit_time',
                                width: 140,
                                render: (ts: string) => dayjs(ts).format('YYYY-MM-DD HH:mm'),
                              },
                              {
                                title: '平仓价格',
                                dataIndex: 'exit_price',
                                width: 110,
                                render: (p: number) => `${p.toFixed(2)} USDT`,
                              },
                              {
                                title: '持仓周期',
                                dataIndex: 'holding_bars',
                                width: 80,
                                render: (bars: number) => `${bars} 根`,
                              },
                              {
                                title: '盈亏金额',
                                dataIndex: 'pnl',
                                width: 110,
                                render: (pnl: number) => (
                                  <Text strong style={{ color: pnl >= 0 ? '#3f8600' : '#cf1322' }}>
                                    {pnl >= 0 ? `+${pnl.toFixed(2)}` : pnl.toFixed(2)} USDT
                                  </Text>
                                ),
                              },
                              {
                                title: '收益率',
                                dataIndex: 'pnl_pct',
                                width: 100,
                                render: (pct: number) => (
                                  <Tag color={pct >= 0 ? 'green' : 'red'}>
                                    {pct >= 0 ? `+${pct.toFixed(2)}%` : `${pct.toFixed(2)}%`}
                                  </Tag>
                                ),
                              },
                              {
                                title: '手续费',
                                dataIndex: 'fee',
                                width: 90,
                                render: (fee: number) => `${fee.toFixed(2)} U`,
                              },
                              {
                                title: '平仓触发原因',
                                dataIndex: 'exit_reason',
                                width: 130,
                                render: (reason: string) => renderExitReasonTag(reason),
                              },
                            ]}
                          />
                        ),
                      },
                    ]}
                  />
                </div>
              )
            })()}
        </Modal>

        {/* 🤖 AI 深度诊断与自动调优报告弹窗 */}
        <Modal
          title={
            <Space>
              <RobotOutlined style={{ color: '#722ed1', fontSize: 20 }} />
              <span>AI 策略回测深度诊断与自动调优建议</span>
            </Space>
          }
          open={aiDiagModalOpen}
          onCancel={() => setAiDiagModalOpen(false)}
          width={880}
          footer={[
            <Button key="close" onClick={() => setAiDiagModalOpen(false)}>
              关闭
            </Button>,
            aiDiagResult && aiDiagResult.optimized_strategy && (
              <Button
                key="apply"
                type="primary"
                icon={<CheckCircleOutlined />}
                style={{ background: '#722ed1', borderColor: '#722ed1' }}
                onClick={handleSaveAiStrategy}
                loading={savingAiStrategy}
              >
                一键保存为 AI 调优新策略
              </Button>
            ),
          ]}
        >
          {aiDiagLoading && (
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              <RobotOutlined style={{ fontSize: 36, color: '#722ed1', marginBottom: 16 }} spin />
              <div style={{ fontSize: 16, fontWeight: 'bold' }}>AI 正在深度解析逐笔回测数据与市场行情...</div>
              <div style={{ color: '#8c8c8c', marginTop: 8 }}>
                正在评估盈亏比、最大回撤瓶颈、止损有效性与假突破分布
              </div>
            </div>
          )}

          {aiDiagResult && (
            <div>
              {/* 综合评级卡片 */}
              <div
                style={{
                  background: '#f9f0ff',
                  border: '1px solid #d3adf7',
                  padding: '16px 20px',
                  borderRadius: 8,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <Space size="middle" align="center">
                    <span style={{ fontSize: 15, fontWeight: 'bold', color: '#531dab' }}>
                      策略综合表现评级:
                    </span>
                    <Tag
                      color={
                        aiDiagResult.overall_rating === 'S'
                          ? 'gold'
                          : aiDiagResult.overall_rating === 'A'
                          ? 'green'
                          : aiDiagResult.overall_rating === 'B'
                          ? 'blue'
                          : aiDiagResult.overall_rating === 'C'
                          ? 'orange'
                          : 'red'
                      }
                      style={{ fontSize: 16, padding: '4px 12px', fontWeight: 'bold' }}
                    >
                      {aiDiagResult.overall_rating} 级 · {aiDiagResult.rating_label}
                    </Tag>
                  </Space>
                  <div style={{ marginTop: 8, color: '#595959', fontSize: 13 }}>
                    {aiDiagResult.summary}
                  </div>
                </div>
              </div>

              {/* 亮点与瓶颈 */}
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={12}>
                  <Card size="small" title="✅ 策略优势亮点" style={{ height: '100%' }}>
                    <ul style={{ paddingLeft: 20, margin: 0 }}>
                      {aiDiagResult.strengths?.map((s: string, idx: number) => (
                        <li key={idx} style={{ marginBottom: 6, color: '#3f8600' }}>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small" title="⚠️ 核心痛点与风险剖析" style={{ height: '100%' }}>
                    <ul style={{ paddingLeft: 20, margin: 0 }}>
                      {aiDiagResult.bottlenecks?.map((b: string, idx: number) => (
                        <li key={idx} style={{ marginBottom: 6, color: '#cf1322' }}>
                          {b}
                        </li>
                      ))}
                    </ul>
                  </Card>
                </Col>
              </Row>

              {/* 调优建议 */}
              <Card size="small" title="💡 AI 专家调优与改进建议" style={{ marginBottom: 16 }}>
                <ol style={{ paddingLeft: 20, margin: 0 }}>
                  {aiDiagResult.suggestions?.map((sug: string, idx: number) => (
                    <li key={idx} style={{ marginBottom: 6, fontWeight: 500 }}>
                      {sug}
                    </li>
                  ))}
                </ol>
              </Card>

              {/* 推荐优化后方案 */}
              {aiDiagResult.optimized_strategy && (
                <Card
                  size="small"
                  title="🎯 AI 推荐调优方案"
                  style={{ background: '#f6ffed', border: '1px solid #b7eb8f' }}
                >
                  <Row gutter={16} style={{ marginBottom: 8 }}>
                    <Col span={8}>
                      🛡️ 推荐止损: <b>-{aiDiagResult.optimized_strategy.stop_loss_pct}%</b>
                    </Col>
                    <Col span={8}>
                      🎯 推荐止盈: <b>+{aiDiagResult.optimized_strategy.take_profit_pct}%</b>
                    </Col>
                    <Col span={8}>
                      🔄 移动追踪: <b>{aiDiagResult.optimized_strategy.trailing_stop_pct}%</b>
                    </Col>
                  </Row>
                  <div style={{ fontSize: 12, color: '#52c41a' }}>
                    * 点击下方「一键保存为 AI 调优新策略」即可自动生成并将其存入策略库供独立回测与实盘。
                  </div>
                </Card>
              )}
            </div>
          )}
        </Modal>
      </Card>
    </div>
  )
}

export default BacktestsPage



