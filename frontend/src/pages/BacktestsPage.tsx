import React, { useState } from 'react'
import { Button, Card, Form, Input, InputNumber, DatePicker, Select, Table, message, Alert, Space, Tag, Modal, Statistic, Row, Col, Popconfirm } from 'antd'
import { EyeOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import ReactECharts from 'echarts-for-react'

import api from '../api'

interface StrategyOption {
  id: number
  name: string
  symbol_id: number
  timeframe: string
}

interface KlineStats {
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
  const [strategies, setStrategies] = useState<StrategyOption[]>([])
  const [klineStats, setKlineStats] = useState<KlineStats[]>([])
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyOption | null>(null)
  const [rows, setRows] = useState<BacktestRow[]>([])
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  
  // 回测结果弹窗
  const [resultModal, setResultModal] = useState(false)
  const [currentResult, setCurrentResult] = useState<BacktestRow | null>(null)

  React.useEffect(() => {
    // 加载策略列表
    api.get<StrategyOption[]>('/strategies/').then(res => setStrategies(res.data))
    // 加载K线数据统计
    api.get<KlineStats[]>('/market/klines/stats').then(res => setKlineStats(res.data))
    // 加载回测历史
    loadBacktests()
  }, [])
  
  const loadBacktests = () => {
    api.get<BacktestRow[]>('/backtests/').then(res => setRows(res.data))
  }
  
  // 删除回测
  const handleDelete = (id: number) => {
    api.delete(`/backtests/${id}`)
      .then(() => {
        message.success('删除成功')
        loadBacktests()
      })
      .catch(err => {
        message.error('删除失败: ' + (err.response?.data?.detail || err.message))
      })
  }

  const handleRun = () => {
    form
      .validateFields()
      .then(values => {
        const payload = {
          strategy_id: values.strategy_id,
          start_ts: (values.range[0] as Dayjs).toISOString(),
          end_ts: (values.range[1] as Dayjs).toISOString(),
          initial_balance: values.initial_balance,
        }
        setLoading(true)
        return api.post<BacktestRow>('/backtests/', payload)
      })
      .then(res => {
        if (res) {
          setRows(prev => [res.data, ...prev])
          message.success('回测已完成')
        }
      })
      .catch(err => {
        message.error('回测失败: ' + (err.response?.data?.detail || err.message))
      })
      .finally(() => setLoading(false))
  }

  // 策略选择变化时，检查数据是否存在
  const handleStrategyChange = (strategyId: number) => {
    const strategy = strategies.find(s => s.id === strategyId)
    setSelectedStrategy(strategy || null)
  }

  // 获取当前策略对应的K线数据
  const getCurrentKlineStats = () => {
    if (!selectedStrategy) return null
    // 需要通过symbol_id查找inst_id，这里简化处理，假设有匹配的timeframe
    return klineStats.find(s => s.timeframe === selectedStrategy.timeframe)
  }

  const currentStats = getCurrentKlineStats()
  
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
      title: { text: '权益曲线', left: 'center' },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const point = params[0]
          return `${dayjs(point.name).format('MM-DD HH:mm')}<br/>权益: ${point.value.toFixed(2)} USDT`
        }
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: equityCurve.map(p => p.ts),
        axisLabel: {
          formatter: (value: string) => dayjs(value).format('MM-DD HH:mm')
        }
      },
      yAxis: { type: 'value', name: 'USDT' },
      series: [
        {
          name: '权益',
          type: 'line',
          data: equityCurve.map(p => p.equity),
          smooth: true,
          areaStyle: { opacity: 0.3 },
          lineStyle: { width: 2 }
        }
      ]
    }
  }

  return (
    <Card title="策略回测">
      {selectedStrategy && currentStats && (
        <Alert
          style={{ marginBottom: 16 }}
          message="本地数据可用"
          description={
            <Space direction="vertical" size="small">
              <div>
                📊 交易对: <Tag>{currentStats.inst_id}</Tag>
                周期: <Tag color="blue">{currentStats.timeframe}</Tag>
                数据条数: <Tag color="green">{currentStats.count}</Tag>
              </div>
              <div>
                📅 时间范围: {currentStats.start_ts ? dayjs(currentStats.start_ts).format('YYYY-MM-DD HH:mm') : 'N/A'} ~ 
                {currentStats.end_ts ? dayjs(currentStats.end_ts).format('YYYY-MM-DD HH:mm') : 'N/A'}
              </div>
            </Space>
          }
          type="success"
          showIcon
        />
      )}
      
      {selectedStrategy && !currentStats && (
        <Alert
          style={{ marginBottom: 16 }}
          message="未找到本地数据"
          description={
            <div>
              请先在 <a href="/data">数据管理</a> 页面下载 {selectedStrategy.timeframe} 周期的K线数据。
              否则回测将失败。
            </div>
          }
          type="warning"
          showIcon
        />
      )}

      <Form
        form={form}
        layout="inline"
        initialValues={{ initial_balance: 10000, range: [dayjs().add(-7, 'day'), dayjs()] }}
      >
        <Form.Item name="strategy_id" label="策略" rules={[{ required: true }]}
          style={{ minWidth: 260 }}
        >
          <Select
            options={strategies.map(s => ({ label: s.name, value: s.id }))}
            placeholder="选择策略"
            onChange={handleStrategyChange}
          />
        </Form.Item>
        <Form.Item name="range" label="时间区间" rules={[{ required: true }]}
          style={{ minWidth: 320 }}
        >
          <DatePicker.RangePicker showTime />
        </Form.Item>
        <Form.Item name="initial_balance" label="初始资金">
          <InputNumber min={1} style={{ width: 140 }} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" onClick={handleRun} loading={loading}>
            运行回测
          </Button>
        </Form.Item>
      </Form>

      <Table
        style={{ marginTop: 16 }}
        rowKey="id"
        dataSource={rows}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 60 },
          { title: '策略ID', dataIndex: 'strategy_id', width: 80 },
          { title: '开始时间', dataIndex: 'start_ts', width: 180,
            render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm')
          },
          { title: '结束时间', dataIndex: 'end_ts', width: 180,
            render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm')
          },
          { title: '初始资金', dataIndex: 'initial_balance', width: 120,
            render: (val: number) => `${val.toFixed(2)} USDT`
          },
          { title: '状态', dataIndex: 'status', width: 100,
            render: (status: string) => {
              const colorMap: Record<string, string> = {
                'FINISHED': 'success',
                'RUNNING': 'processing',
                'PENDING': 'default',
                'FAILED': 'error'
              }
              return <Tag color={colorMap[status] || 'default'}>{status}</Tag>
            }
          },
          { title: '操作', width: 150,
            render: (_, record: BacktestRow) => (
              <Space>
                {record.status === 'FINISHED' && record.result_json ? (
                  <Button 
                    type="link" 
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => handleViewResult(record)}
                  >
                    查看
                  </Button>
                ) : null}
                <Popconfirm
                  title="确认删除"
                  description="确定要删除这条回测记录吗？"
                  onConfirm={() => handleDelete(record.id)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button 
                    type="link" 
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                  >
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            )
          },
        ]}
      />
      
      {/* 回测结果弹窗 */}
      <Modal
        title="回测结果详情"
        open={resultModal}
        onCancel={() => setResultModal(false)}
        width={900}
        footer={[
          <Button key="close" onClick={() => setResultModal(false)}>
            关闭
          </Button>
        ]}
      >
        {currentResult && (() => {
          const result = parseResult(currentResult)
          if (!result) {
            return <Alert message="无法解析回测结果" type="error" />
          }
          
          const { profit, profitPct, finalEquity } = calculateProfit(result, currentResult.initial_balance)
          
          return (
            <div>
              {/* 统计数据 - 基础指标 */}
              <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={6}>
                  <Statistic 
                    title="初始资金" 
                    value={currentResult.initial_balance} 
                    precision={2}
                    suffix="USDT"
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="最终资金" 
                    value={finalEquity} 
                    precision={2}
                    suffix="USDT"
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="盈亏金额" 
                    value={profit} 
                    precision={2}
                    suffix="USDT"
                    valueStyle={{ color: profit >= 0 ? '#3f8600' : '#cf1322' }}
                    prefix={profit >= 0 ? '+' : ''}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="收益率" 
                    value={result.total_return ?? profitPct} 
                    precision={2}
                    suffix="%"
                    valueStyle={{ color: (result.total_return ?? profitPct) >= 0 ? '#3f8600' : '#cf1322' }}
                    prefix={(result.total_return ?? profitPct) >= 0 ? '+' : ''}
                  />
                </Col>
              </Row>
              
              {/* 统计数据 - 交易指标 */}
              <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={6}>
                  <Statistic 
                    title="交易次数" 
                    value={result.trade_count}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="胜率" 
                    value={result.win_rate ?? 0} 
                    precision={2}
                    suffix="%"
                    valueStyle={{ 
                      color: (result.win_rate ?? 0) >= 50 ? '#3f8600' : '#cf1322' 
                    }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="盈亏比" 
                    value={result.profit_factor ?? 0} 
                    precision={2}
                    valueStyle={{ 
                      color: (result.profit_factor ?? 0) >= 1 ? '#3f8600' : '#cf1322' 
                    }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="数据点数" 
                    value={result.equity_curve.length}
                  />
                </Col>
              </Row>
              
              {/* 统计数据 - 风险指标 */}
              <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={8}>
                  <Statistic 
                    title="最大回撤" 
                    value={result.max_drawdown ?? 0} 
                    precision={2}
                    suffix="%"
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic 
                    title="夏普比率" 
                    value={result.sharpe_ratio ?? 0} 
                    precision={3}
                    valueStyle={{ 
                      color: (result.sharpe_ratio ?? 0) >= 1 ? '#3f8600' : 
                             (result.sharpe_ratio ?? 0) >= 0 ? '#faad14' : '#cf1322'
                    }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic 
                    title="回测时间范围" 
                    value={`${dayjs(currentResult.start_ts).format('MM-DD')} ~ ${dayjs(currentResult.end_ts).format('MM-DD')}`}
                    valueStyle={{ fontSize: 16 }}
                  />
                </Col>
              </Row>
              
              {/* 权益曲线图表 */}
              {result.equity_curve && result.equity_curve.length > 0 && (
                <ReactECharts 
                  option={getEquityChartOption(result.equity_curve)} 
                  style={{ height: 400 }}
                  notMerge
                  lazyUpdate
                />
              )}
            </div>
          )
        })()}
      </Modal>
    </Card>
  )
}

export default BacktestsPage
