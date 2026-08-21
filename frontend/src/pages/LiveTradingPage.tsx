import React, { useEffect, useState } from 'react'
import {
  Button,
  Card,
  Form,
  InputNumber,
  Select,
  Space,
  Table,
  Tag,
  message,
  Row,
  Col,
  Popconfirm,
  Modal,
  Descriptions,
  Statistic,
  Typography,
} from 'antd'
import {
  DeleteOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  PlusOutlined,
  GoldOutlined,
  StockOutlined,
  RocketOutlined,
  StarOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'

import api from '../api'

const { Title, Text } = Typography
const { Option, OptGroup } = Select

interface SymbolItem {
  id: number
  inst_id: string
  base_ccy: string
  quote_ccy: string
  inst_type: string
  category: string
  display_name: string
  is_custom: boolean
  is_active: boolean
}

interface StrategyRow {
  id: number
  name: string
  symbol_id: number
  timeframe: string
  leverage?: number
  monitor_interval_sec: number
}

interface InstanceRow {
  id: number
  strategy_id: number
  symbol_id: number
  timeframe: string
  leverage: number
  status: string
  strategy_name?: string
  symbol_inst_id?: string
  symbol_display_name?: string
  symbol_category?: string
  started_at?: string
  stopped_at?: string
}

const CATEGORY_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  COMMODITY: { label: '大宗贵金属', color: 'gold', icon: <GoldOutlined /> },
  STOCK: { label: '美股股票', color: 'blue', icon: <StockOutlined /> },
  INDEX: { label: '指数ETF', color: 'purple', icon: <StockOutlined /> },
  CRYPTO: { label: '加密货币', color: 'cyan', icon: <RocketOutlined /> },
  CUSTOM: { label: '自定义品种', color: 'magenta', icon: <StarOutlined /> },
}

const LiveTradingPage: React.FC = () => {
  const [strategies, setStrategies] = useState<StrategyRow[]>([])
  const [symbols, setSymbols] = useState<SymbolItem[]>([])
  const [instances, setInstances] = useState<InstanceRow[]>([])
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const [modalVisible, setModalVisible] = useState(false)
  const [tradeSummary, setTradeSummary] = useState<any>(null)

  const fetchAll = () => {
    setLoading(true)
    Promise.all([
      api.get<StrategyRow[]>('/strategies/'),
      api.get<SymbolItem[]>('/strategies/symbols/list'),
      api.get<InstanceRow[]>('/instances/'),
    ])
      .then(([s, sym, i]) => {
        setStrategies(s.data)
        setSymbols(sym.data)
        setInstances(i.data)
      })
      .catch(err => {
        console.error('加载失败:', err)
        message.error('加载数据失败: ' + (err.response?.data?.detail || err.message))
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const handleStrategyChange = (stratId: number) => {
    const strat = strategies.find(s => s.id === stratId)
    if (strat) {
      form.setFieldsValue({
        symbol_id: strat.symbol_id,
        timeframe: strat.timeframe,
        leverage: strat.leverage || 1,
      })
    }
  }

  const handleCreateInstance = () => {
    form
      .validateFields()
      .then(values => {
        return api.post('/instances/', null, { params: values })
      })
      .then(() => {
        message.success('实盘交易实例创建成功！')
        form.resetFields()
        fetchAll()
      })
      .catch(err => {
        message.error('创建失败: ' + (err.response?.data?.detail || err.message))
      })
  }

  const handleStart = (id: number) => {
    api.post(`/instances/${id}/start`).then(() => {
      message.success('实例已成功启动运行')
      fetchAll()
    })
  }

  const handleStop = (id: number) => {
    api.post(`/instances/${id}/stop`).then(() => {
      message.success('实例已停止')
      fetchAll()
    })
  }

  const handleDelete = (id: number) => {
    api.delete(`/instances/${id}`).then(() => {
      message.success('实例已删除')
      fetchAll()
    })
  }

  const handleViewTrades = (row: InstanceRow) => {
    api.get(`/instances/${row.id}/trades-summary`).then(res => {
      setTradeSummary(res.data)
      setModalVisible(true)
    })
  }

  const groupedSymbols = {
    COMMODITY: symbols.filter(s => s.category === 'COMMODITY' && s.is_active),
    STOCK: symbols.filter(s => s.category === 'STOCK' && s.is_active),
    INDEX: symbols.filter(s => s.category === 'INDEX' && s.is_active),
    CRYPTO: symbols.filter(s => (s.category === 'CRYPTO' || !s.category) && s.is_active),
    CUSTOM: symbols.filter(s => s.is_custom && s.is_active),
  }

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <ThunderboltOutlined style={{ color: '#faad14', fontSize: 20 }} />
            <Title level={4} style={{ margin: 0 }}>
              实盘交易与策略执行引擎
            </Title>
          </Space>
        }
        loading={loading}
      >
        <Card type="inner" title="🚀 部署新建实盘交易实例" style={{ marginBottom: 20 }}>
          <Form form={form} layout="vertical">
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item name="strategy_id" label="选择运行策略" rules={[{ required: true, message: '请选择策略' }]}>
                  <Select
                    placeholder="选择已保存的量化策略"
                    onChange={handleStrategyChange}
                    options={strategies.map(s => ({
                      label: `#${s.id} - ${s.name} (${s.timeframe})`,
                      value: s.id,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  name="symbol_id"
                  label="交易品种 (与策略构建器/TradFi库一致)"
                  rules={[{ required: true, message: '请选择交易品种' }]}
                >
                  <Select
                    showSearch
                    placeholder="选择大宗商品 / 美股 / 加密货币"
                    optionFilterProp="children"
                  >
                    {groupedSymbols.COMMODITY?.length > 0 && (
                      <OptGroup label="🪙 贵金属与大宗商品 (Commodities)">
                        {groupedSymbols.COMMODITY.map(s => (
                          <Option key={s.id} value={s.id}>
                            {s.display_name || s.inst_id} ({s.inst_id})
                          </Option>
                        ))}
                      </OptGroup>
                    )}

                    {groupedSymbols.STOCK?.length > 0 && (
                      <OptGroup label="📈 美股热门股票 (US Stocks)">
                        {groupedSymbols.STOCK.map(s => (
                          <Option key={s.id} value={s.id}>
                            {s.display_name || s.inst_id} ({s.inst_id})
                          </Option>
                        ))}
                      </OptGroup>
                    )}

                    {groupedSymbols.INDEX?.length > 0 && (
                      <OptGroup label="📊 指数与 ETF (Indices)">
                        {groupedSymbols.INDEX.map(s => (
                          <Option key={s.id} value={s.id}>
                            {s.display_name || s.inst_id} ({s.inst_id})
                          </Option>
                        ))}
                      </OptGroup>
                    )}

                    {groupedSymbols.CRYPTO?.length > 0 && (
                      <OptGroup label="🚀 主流加密货币 (Crypto)">
                        {groupedSymbols.CRYPTO.map(s => (
                          <Option key={s.id} value={s.id}>
                            {s.display_name || s.inst_id} ({s.inst_id})
                          </Option>
                        ))}
                      </OptGroup>
                    )}

                    {groupedSymbols.CUSTOM?.length > 0 && (
                      <OptGroup label="⭐ 自定义品种 (Custom)">
                        {groupedSymbols.CUSTOM.map(s => (
                          <Option key={s.id} value={s.id}>
                            {s.display_name || s.inst_id} ({s.inst_id})
                          </Option>
                        ))}
                      </OptGroup>
                    )}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={4}>
                <Form.Item name="timeframe" label="K线主周期" rules={[{ required: true, message: '请选择周期' }]}>
                  <Select placeholder="选择周期">
                    <Select.Option value="1m">1分钟 (1m)</Select.Option>
                    <Select.Option value="5m">5分钟 (5m)</Select.Option>
                    <Select.Option value="15m">15分钟 (15m)</Select.Option>
                    <Select.Option value="30m">30分钟 (30m)</Select.Option>
                    <Select.Option value="1H">1小时 (1H)</Select.Option>
                    <Select.Option value="4H">4小时 (4H)</Select.Option>
                    <Select.Option value="1D">1天 (1D)</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={4}>
                <Form.Item name="leverage" label="杠杆倍数" initialValue={1} rules={[{ required: true }]}>
                  <InputNumber min={1} max={125} placeholder="1" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Row>
              <Col span={24}>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateInstance}>
                  创建并部署实盘实例
                </Button>
              </Col>
            </Row>
          </Form>
        </Card>

        <div
          style={{
            marginBottom: 16,
            padding: '10px 14px',
            background: '#e6f7ff',
            border: '1px solid #91caff',
            borderRadius: 6,
            color: '#0958d9',
            fontSize: 13,
          }}
        >
          🔑 <b>实盘执行安全提示</b>：实盘交易将严格依据 <code>.env</code> 中配置的 OKX API 密钥执行自动化盯盘与信号撮合。
        </div>

        <Table
          rowKey="id"
          dataSource={instances}
          columns={[
            { title: 'ID', dataIndex: 'id', width: 60 },
            {
              title: '策略名称',
              dataIndex: 'strategy_name',
              width: 200,
              render: (name: string, row: InstanceRow) => (
                <Text strong>{name || `策略 #${row.strategy_id}`}</Text>
              ),
            },
            {
              title: '交易品种',
              dataIndex: 'symbol_inst_id',
              width: 240,
              render: (_: any, row: InstanceRow) => {
                const sym = symbols.find(s => s.id === row.symbol_id)
                const instId = row.symbol_inst_id || sym?.inst_id || `品种 #${row.symbol_id}`
                const dispName = row.symbol_display_name || sym?.display_name
                const cat = row.symbol_category || sym?.category || 'CRYPTO'
                const catInfo = CATEGORY_MAP[cat] || CATEGORY_MAP.CRYPTO
                return (
                  <Space direction="vertical" size={0}>
                    <Space>
                      <Text strong>{instId}</Text>
                      <Tag color={catInfo.color} icon={catInfo.icon} style={{ fontSize: 11 }}>
                        {catInfo.label}
                      </Tag>
                    </Space>
                    {dispName && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {dispName}
                      </Text>
                    )}
                  </Space>
                )
              },
            },
            {
              title: '周期',
              dataIndex: 'timeframe',
              width: 85,
              render: (tf: string) => <Tag color="blue">{tf}</Tag>,
            },
            {
              title: '杠杆',
              dataIndex: 'leverage',
              width: 80,
              render: (v: number) => <Tag color="geekblue">{v}x</Tag>,
            },
            {
              title: '运行状态',
              dataIndex: 'status',
              width: 110,
              render: (v: string) => (
                <Tag color={v === 'RUNNING' ? 'green' : 'default'} style={{ fontWeight: 500 }}>
                  {v === 'RUNNING' ? '🟢 运行中' : '⚪ 已停止'}
                </Tag>
              ),
            },
            {
              title: '操作',
              width: 240,
              render: (_, row: InstanceRow) => (
                <Space>
                  {row.status === 'RUNNING' ? (
                    <Button
                      size="small"
                      danger
                      icon={<PauseCircleOutlined />}
                      onClick={() => handleStop(row.id)}
                    >
                      停止
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      onClick={() => handleStart(row.id)}
                    >
                      启动
                    </Button>
                  )}
                  <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewTrades(row)}>
                    交易
                  </Button>
                  <Popconfirm
                    title="确认删除"
                    description="确定要删除这个实例吗？若运行中将自动停止。"
                    onConfirm={() => handleDelete(row.id)}
                    okText="删除"
                    cancelText="取消"
                    okButtonProps={{ danger: true }}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />}>
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />


      {/* 交易记录弹窗 */}
      <Modal
        title="交易记录详情"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setTradeSummary(null)
        }}
        footer={null}
        width={800}
      >
        {tradeSummary && (
          <>
            <Card type="inner" title="实例信息" style={{ marginBottom: 16 }}>
              <Descriptions column={2}>
                <Descriptions.Item label="实例ID">{tradeSummary.instance_id}</Descriptions.Item>
                <Descriptions.Item label="策略">{tradeSummary.strategy_name}</Descriptions.Item>
                <Descriptions.Item label="交易对">{tradeSummary.symbol}</Descriptions.Item>
                <Descriptions.Item label="周期">{tradeSummary.timeframe}</Descriptions.Item>
                <Descriptions.Item label="杠杆">{tradeSummary.leverage}x</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={tradeSummary.status === 'RUNNING' ? 'green' : 'default'}>
                    {tradeSummary.status}
                  </Tag>
                </Descriptions.Item>
                {tradeSummary.started_at && (
                  <Descriptions.Item label="启动时间">
                    {dayjs(tradeSummary.started_at).format('YYYY-MM-DD HH:mm:ss')}
                  </Descriptions.Item>
                )}
                {tradeSummary.stopped_at && (
                  <Descriptions.Item label="停止时间">
                    {dayjs(tradeSummary.stopped_at).format('YYYY-MM-DD HH:mm:ss')}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            <Card type="inner" title="交易统计" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic title="总交易次数" value={tradeSummary.total_trades} />
                </Col>
                <Col span={6}>
                  <Statistic title="买入次数" value={tradeSummary.buy_count} valueStyle={{ color: '#3f8600' }} />
                </Col>
                <Col span={6}>
                  <Statistic title="卖出次数" value={tradeSummary.sell_count} valueStyle={{ color: '#cf1322' }} />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="当前持仓" 
                    value={tradeSummary.current_position} 
                    precision={4}
                    valueStyle={{ color: tradeSummary.current_position > 0 ? '#3f8600' : '#000' }}
                  />
                </Col>
              </Row>
            </Card>

            <Card type="inner" title="最近10条交易">
              <Table
                size="small"
                dataSource={tradeSummary.recent_trades}
                rowKey="id"
                pagination={false}
                columns={[
                  { 
                    title: 'ID', 
                    dataIndex: 'id', 
                    width: 60 
                  },
                  { 
                    title: '时间', 
                    dataIndex: 'ts',
                    width: 160,
                    render: (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm:ss')
                  },
                  { 
                    title: '方向', 
                    dataIndex: 'side',
                    width: 80,
                    render: (val: string) => (
                      <Tag color={val === 'BUY' ? 'green' : 'red'}>{val}</Tag>
                    )
                  },
                  { 
                    title: '价格', 
                    dataIndex: 'price',
                    width: 100,
                    render: (val: number) => val.toFixed(2)
                  },
                  { 
                    title: '数量', 
                    dataIndex: 'qty',
                    width: 80,
                    render: (val: number) => val.toFixed(4)
                  },
                  { 
                    title: '状态', 
                    dataIndex: 'status',
                    width: 80
                  },
                ]}
              />
            </Card>
          </>
        )}
      </Modal>
      </Card>
    </div>
  )
}

export default LiveTradingPage


