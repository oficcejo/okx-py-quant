import React, { useState, useEffect } from 'react'
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  message,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import { DownloadOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import api from '../api'

const { RangePicker } = DatePicker
const { Title, Text } = Typography

interface Symbol {
  id: number
  inst_id: string
  base_ccy: string
  quote_ccy: string
  inst_type: string
  display_name: string
}

interface KlineStats {
  inst_id: string
  timeframe: string
  count: number
  start_ts: string | null
  end_ts: string | null
}

const DataManagementPage: React.FC = () => {
  const [form] = Form.useForm()
  const [symbols, setSymbols] = useState<Symbol[]>([])
  const [stats, setStats] = useState<KlineStats[]>([])
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // 加载交易对列表
  const loadSymbols = () => {
    api.get('/strategies/symbols/list')
      .then(res => {
        setSymbols(res.data)
      })
      .catch(err => {
        message.error('加载交易对列表失败')
      })
  }

  // 加载K线数据统计
  const loadStats = () => {
    setLoading(true)
    api.get('/market/klines/stats')
      .then(res => {
        setStats(res.data)
      })
      .catch(err => {
        message.error('加载数据统计失败')
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    loadSymbols()
    loadStats()
  }, [])

  // 下载K线数据
  const handleDownload = () => {
    form.validateFields().then(values => {
      setDownloading(true)
      message.loading('正在下载数据，请耐心等待...', 0) // 持续显示

      const payload = {
        inst_id: values.inst_id,
        timeframe: values.timeframe,
        start_ts: values.dateRange ? values.dateRange[0].toISOString() : undefined,
        end_ts: values.dateRange ? values.dateRange[1].toISOString() : undefined,
        limit_per_call: 300,
      }

      api.post('/market/klines/sync', payload)
        .then(res => {
          message.destroy() // 清除loading提示
          message.success(`成功下载 ${res.data.inserted} 条K线数据`)
          loadStats() // 刷新统计
          form.resetFields()
        })
        .catch(err => {
          message.destroy() // 清除loading提示
          message.error('下载失败: ' + (err.response?.data?.detail || err.message))
        })
        .finally(() => {
          setDownloading(false)
        })
    })
  }

  // 删除K线数据
  const handleDelete = (inst_id?: string, timeframe?: string) => {
    const params: any = {}
    if (inst_id) params.inst_id = inst_id
    if (timeframe) params.timeframe = timeframe

    api.delete('/market/klines/clean', { params })
      .then(res => {
        message.success(`已删除 ${res.data.deleted} 条数据`)
        loadStats()
      })
      .catch(err => {
        message.error('删除失败')
      })
  }

  const columns = [
    {
      title: '交易对',
      dataIndex: 'inst_id',
      key: 'inst_id',
      width: 200,
    },
    {
      title: 'K线周期',
      dataIndex: 'timeframe',
      key: 'timeframe',
      width: 100,
      render: (val: string) => <Tag color="blue">{val}</Tag>,
    },
    {
      title: '数据条数',
      dataIndex: 'count',
      key: 'count',
      width: 100,
      render: (val: number) => val.toLocaleString(),
    },
    {
      title: '开始时间',
      dataIndex: 'start_ts',
      key: 'start_ts',
      width: 180,
      render: (val: string | null) => val ? dayjs(val).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '结束时间',
      dataIndex: 'end_ts',
      key: 'end_ts',
      width: 180,
      render: (val: string | null) => val ? dayjs(val).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: KlineStats) => (
        <Popconfirm
          title="确认删除"
          description={`删除 ${record.inst_id} ${record.timeframe} 的所有数据？`}
          onConfirm={() => handleDelete(record.inst_id, record.timeframe)}
          okText="删除"
          cancelText="取消"
        >
          <Button type="link" danger size="small" icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={<Title level={4}>K线数据管理</Title>}
        extra={
          <Button icon={<ReloadOutlined />} onClick={loadStats}>
            刷新
          </Button>
        }
      >
        <Card type="inner" title="下载K线数据" style={{ marginBottom: 24 }}>
          <Form form={form} layout="vertical">
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item name="inst_id" label="交易对" rules={[{ required: true }]}>
                  <Select
                    showSearch
                    placeholder="选择交易对"
                    optionFilterProp="children"
                    options={symbols.map(s => ({
                      value: s.inst_id,
                      label: `${s.inst_id} (${s.base_ccy})`,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item name="timeframe" label="K线周期" rules={[{ required: true }]}>
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
              <Col span={10}>
                <Form.Item
                  name="dateRange"
                  label="时间范围"
                  initialValue={[dayjs().subtract(7, 'day'), dayjs()]}
                >
                  <RangePicker
                    showTime
                    format="YYYY-MM-DD HH:mm"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item label=" ">
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    onClick={handleDownload}
                    loading={downloading}
                    block
                  >
                    下载数据
                  </Button>
                </Form.Item>
              </Col>
            </Row>
          </Form>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Text type="secondary">
              💡 提示：下载后的数据会保存到数据库，回测时将自动使用本地数据，避免频繁调用API
            </Text>
            <Text type="warning">
              ⏱️ 注意：下载大量历史数据可能需要30-120秒，请耐心等待。如果超时，请缩短时间范围后重试。
            </Text>
            <Text type="secondary">
              📊 已启用 history-candles 接口，支持下载更长时间范围的历史数据（建议不超过3个月）
            </Text>
          </Space>
        </Card>

        <Card type="inner" title="已下载的数据">
          <Table
            columns={columns}
            dataSource={stats}
            loading={loading}
            rowKey={record => `${record.inst_id}-${record.timeframe}`}
            pagination={{ pageSize: 20 }}
            size="small"
          />

          <div style={{ marginTop: 16 }}>
            <Popconfirm
              title="危险操作"
              description="确认清空所有K线数据？此操作不可恢复！"
              onConfirm={() => handleDelete()}
              okText="确认清空"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<DeleteOutlined />}>
                清空所有数据
              </Button>
            </Popconfirm>
          </div>
        </Card>
      </Card>
    </div>
  )
}

export default DataManagementPage
