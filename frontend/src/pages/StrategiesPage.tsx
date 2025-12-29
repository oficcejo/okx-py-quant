import React, { useEffect, useState } from 'react'
import { Button, Card, Form, Input, InputNumber, Modal, Space, Table, Tag, message, Popconfirm, Select } from 'antd'
import { EditOutlined, DeleteOutlined, EyeOutlined, BuildOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

import api from '../api'

interface Symbol {
  id: number
  inst_id: string
  display_name: string
}

interface StrategyRow {
  id: number
  name: string
  description?: string
  symbol_id: number
  timeframe: string
  leverage?: number
  monitor_interval_sec: number
  config_json: string
  status: string
  created_from_ai: boolean
  created_at: string
}

const StrategiesPage: React.FC = () => {
  const navigate = useNavigate()
  const [items, setItems] = useState<StrategyRow[]>([])
  const [symbols, setSymbols] = useState<Symbol[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewingStrategy, setViewingStrategy] = useState<StrategyRow | null>(null)
  const [form] = Form.useForm()

  const fetchData = () => {
    setLoading(true)
    api
      .get<StrategyRow[]>('/strategies/')
      .then(res => setItems(res.data))
      .finally(() => setLoading(false))
  }

  const loadSymbols = () => {
    api.get('/strategies/symbols/list')
      .then(res => setSymbols(res.data))
      .catch(err => console.error('加载Symbol列表失败', err))
  }

  useEffect(() => {
    fetchData()
    loadSymbols()
  }, [])

  const handleSave = () => {
    form
      .validateFields()
      .then(values => {
        const payload = {
          name: values.name,
          description: values.description,
          symbol_id: values.symbol_id,
          timeframe: values.timeframe,
          leverage: values.leverage,
          monitor_interval_sec: values.monitor_interval_sec,
          config_json: values.config_json,
        }
        
        if (editingId) {
          return api.put(`/strategies/${editingId}`, payload)
        } else {
          return api.post('/strategies/', payload)
        }
      })
      .then(() => {
        message.success(editingId ? '策略更新成功' : '策略创建成功')
        setModalOpen(false)
        setEditingId(null)
        form.resetFields()
        fetchData()
      })
      .catch(err => {
        message.error('操作失败: ' + (err.response?.data?.detail || err.message))
      })
  }

  const handleEdit = (record: StrategyRow) => {
    setEditingId(record.id)
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      symbol_id: record.symbol_id,
      timeframe: record.timeframe,
      leverage: record.leverage,
      monitor_interval_sec: record.monitor_interval_sec,
      config_json: record.config_json,
    })
    setModalOpen(true)
  }

  const handleDelete = (id: number) => {
    api
      .delete(`/strategies/${id}`)
      .then(() => {
        message.success('策略删除成功')
        fetchData()
      })
      .catch(err => {
        message.error('删除失败: ' + (err.response?.data?.detail || err.message))
      })
  }

  const handleView = (record: StrategyRow) => {
    setViewingStrategy(record)
    setViewModalOpen(true)
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setEditingId(null)
    form.resetFields()
  }

  return (
    <Card
      title="策略管理"
      extra={(
        <Space>
          <Button
            type="default"
            icon={<BuildOutlined />}
            onClick={() => navigate('/strategies/builder')}
          >
            可视化构建器
          </Button>
          <Button type="primary" onClick={() => setModalOpen(true)}>
            手动新建
          </Button>
        </Space>
      )}
    >
      <Table
        loading={loading}
        rowKey="id"
        dataSource={items}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 60 },
          { title: '名称', dataIndex: 'name', width: 160 },
          { title: '周期', dataIndex: 'timeframe', width: 80 },
          {
            title: '状态',
            dataIndex: 'status',
            width: 80,
            render: v => <Tag color={v === 'ACTIVE' ? 'green' : 'default'}>{v}</Tag>,
          },
          {
            title: '来源',
            dataIndex: 'created_from_ai',
            width: 80,
            render: v => (v ? <Tag color="blue">AI</Tag> : <Tag>手动</Tag>),
          },
          { title: '创建时间', dataIndex: 'created_at', width: 180 },
          {
            title: '操作',
            width: 180,
            render: (_, record) => (
              <Space>
                <Button
                  type="link"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => handleView(record)}
                >
                  查看
                </Button>
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(record)}
                >
                  编辑
                </Button>
                <Popconfirm
                  title="确定删除此策略？"
                  description="删除后将无法恢复"
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
            ),
          },
        ]}
      />

      <Modal
        title={editingId ? '编辑策略' : '新建策略'}
        open={modalOpen}
        onCancel={handleModalClose}
        onOk={handleSave}
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="策略名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Space style={{ display: 'flex' }}>
            <Form.Item
              name="symbol_id"
              label="交易品种"
              rules={[{ required: true, message: '请选择交易品种' }]}
            >
              <Select
                showSearch
                placeholder="选择交易品种"
                style={{ width: 280 }}
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={symbols.map(s => ({
                  value: s.id,
                  label: `${s.inst_id} - ${s.display_name}`,
                }))}
              />
            </Form.Item>
            <Form.Item name="timeframe" label="K线周期" rules={[{ required: true }]}>
              <Select placeholder="选择周期" style={{ width: 120 }}>
                <Select.Option value="1m">1分钟</Select.Option>
                <Select.Option value="5m">5分钟</Select.Option>
                <Select.Option value="15m">15分钟</Select.Option>
                <Select.Option value="30m">30分钟</Select.Option>
                <Select.Option value="1H">1小时</Select.Option>
                <Select.Option value="4H">4小时</Select.Option>
                <Select.Option value="1D">1天</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="leverage" label="杠杆倍数">
              <InputNumber min={1} max={125} placeholder="1" style={{ width: 120 }} />
            </Form.Item>
          </Space>
          <Form.Item name="monitor_interval_sec" label="监控周期(秒)" initialValue={20}>
            <InputNumber min={1} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item
            name="config_json"
            label="策略配置 JSON"
            rules={[{ required: true, message: '请粘贴策略配置 JSON' }]}
          >
            <Input.TextArea rows={10} placeholder="由 AI 或手动生成的策略配置 JSON" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="查看策略详情"
        open={viewModalOpen}
        onCancel={() => setViewModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalOpen(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        {viewingStrategy && (
          <div>
            <p><strong>ID:</strong> {viewingStrategy.id}</p>
            <p><strong>名称:</strong> {viewingStrategy.name}</p>
            <p><strong>描述:</strong> {viewingStrategy.description || '无'}</p>
            <p><strong>Symbol ID:</strong> {viewingStrategy.symbol_id}</p>
            <p><strong>周期:</strong> {viewingStrategy.timeframe}</p>
            <p><strong>杠杆:</strong> {viewingStrategy.leverage || 1}</p>
            <p><strong>监控周期(秒):</strong> {viewingStrategy.monitor_interval_sec}</p>
            <p><strong>状态:</strong> {viewingStrategy.status}</p>
            <p><strong>来源:</strong> {viewingStrategy.created_from_ai ? 'AI生成' : '手动创建'}</p>
            <p><strong>创建时间:</strong> {viewingStrategy.created_at}</p>
            <div style={{ marginTop: 16 }}>
              <strong>策略配置 JSON:</strong>
              <pre style={{ 
                background: '#f5f5f5', 
                padding: 12, 
                borderRadius: 4,
                maxHeight: 300,
                overflow: 'auto'
              }}>
                {JSON.stringify(JSON.parse(viewingStrategy.config_json), null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  )
}

export default StrategiesPage
