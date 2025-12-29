import React, { useEffect, useState } from 'react'
import { Button, Card, Form, InputNumber, Select, Space, Table, Tag, message, Row, Col, Popconfirm, Modal, Descriptions, Statistic } from 'antd'
import { DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

import api from '../api'

interface Symbol {
  id: number
  inst_id: string
  display_name: string
}

interface StrategyRow {
  id: number
  name: string
  monitor_interval_sec: number
}

interface InstanceRow {
  id: number
  strategy_id: number
  symbol_id: number
  timeframe: string
  leverage: number
  status: string
}

const LiveTradingPage: React.FC = () => {
  const [strategies, setStrategies] = useState<StrategyRow[]>([])
  const [symbols, setSymbols] = useState<Symbol[]>([])
  const [instances, setInstances] = useState<InstanceRow[]>([])
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedInstance, setSelectedInstance] = useState<any>(null)
  const [tradeSummary, setTradeSummary] = useState<any>(null)

  const fetchAll = () => {
    setLoading(true)
    Promise.all([
      api.get<StrategyRow[]>('/strategies/'),
      api.get<Symbol[]>('/strategies/symbols/list'),
      api.get<InstanceRow[]>('/instances/'),
    ])
      .then(([s, sym, i]) => {
        console.log('策略列表:', s.data)
        console.log('交易对列表:', sym.data)
        console.log('实例列表:', i.data)
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

  const handleCreateInstance = () => {
    form
      .validateFields()
      .then(values => {
        // 需要strategy_id, symbol_id, timeframe, leverage
        return api.post('/instances/', null, { params: values })
      })
      .then(() => {
        message.success('实例已创建（使用.env中OKX配置）')
        form.resetFields()
        fetchAll()
      })
      .catch(err => {
        message.error('创建失败: ' + (err.response?.data?.detail || err.message))
      })
  }

  const handleStart = (id: number) => {
    api.post(`/instances/${id}/start`).then(() => {
      message.success('已启动')
      fetchAll()
    })
  }

  const handleStop = (id: number) => {
    api.post(`/instances/${id}/stop`).then(() => {
      message.success('已停止')
      fetchAll()
    })
  }

  const handleDelete = (id: number) => {
    api.delete(`/instances/${id}`)
      .then(() => {
        message.success('已删除')
        fetchAll()
      })
      .catch(err => {
        message.error('删除失败: ' + (err.response?.data?.detail || err.message))
      })
  }

  const handleViewTrades = (instance: InstanceRow) => {
    setSelectedInstance(instance)
    setModalVisible(true)
    
    // 获取交易摘要
    api.get(`/instances/${instance.id}/summary`)
      .then(res => {
        setTradeSummary(res.data)
      })
      .catch(err => {
        message.error('加载交易数据失败: ' + (err.response?.data?.detail || err.message))
      })
  }

  return (
    <Card title="实盘执行" loading={loading}>
      <Card type="inner" title="创建实盘实例" style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="strategy_id" label="策略" rules={[{ required: true, message: '请选择策略' }]}>
                <Select
                  placeholder="选择策略"
                  options={strategies.map(s => ({ label: s.name, value: s.id }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="symbol_id" label="交易品种" rules={[{ required: true, message: '请选择交易品种' }]}>
                <Select
                  showSearch
                  placeholder="选择交易品种"
                  optionFilterProp="children"
                  options={symbols.map(s => ({
                    value: s.id,
                    label: `${s.inst_id}`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="timeframe" label="K线周期" rules={[{ required: true, message: '请选择周期' }]}>
                <Select placeholder="选择周期">
                  <Select.Option value="1m">1分钟</Select.Option>
                  <Select.Option value="5m">5分钟</Select.Option>
                  <Select.Option value="15m">15分钟</Select.Option>
                  <Select.Option value="30m">30分钟</Select.Option>
                  <Select.Option value="1H">1小时</Select.Option>
                  <Select.Option value="4H">4小时</Select.Option>
                  <Select.Option value="1D">1天</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="leverage" label="杠杆倍数" initialValue={1} rules={[{ required: true }]}>
                <InputNumber min={1} max={125} placeholder="1" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item label=" ">
                <Button type="primary" onClick={handleCreateInstance} block>
                  创建实盘实例
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <div style={{ marginBottom: 12, padding: 12, background: '#e6f7ff', borderRadius: 4, color: '#1890ff' }}>
        🔑 实盘交易将使用项目根目录 <code>.env</code> 文件中配置的 OKX API 密钥
      </div>

      <Table
        rowKey="id"
        dataSource={instances}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 60 },
          { title: '策略ID', dataIndex: 'strategy_id', width: 100 },
          { title: '品种ID', dataIndex: 'symbol_id', width: 100 },
          { title: '周期', dataIndex: 'timeframe', width: 80 },
          { 
            title: '杠杆', 
            dataIndex: 'leverage', 
            width: 80,
            render: (v) => `${v}x`
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 100,
            render: v => <Tag color={v === 'RUNNING' ? 'green' : 'default'}>{v}</Tag>,
          },
          {
            title: '操作',
            width: 250,
            render: (_, row: InstanceRow) => (
              <Space>
                <Button size="small" type="primary" onClick={() => handleStart(row.id)} disabled={row.status === 'RUNNING'}>
                  启动
                </Button>
                <Button size="small" danger onClick={() => handleStop(row.id)} disabled={row.status === 'STOPPED'}>
                  停止
                </Button>
                <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewTrades(row)}>
                  交易
                </Button>
                <Popconfirm
                  title="确认删除"
                  description="确定要删除这个实例吗？如果正在运行将先停止。"
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
  )
}

export default LiveTradingPage
