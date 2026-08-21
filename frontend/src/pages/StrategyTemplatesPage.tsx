import React, { useState, useEffect } from 'react'
import {
  Card,
  Row,
  Col,
  Tag,
  Button,
  Space,
  Typography,
  Modal,
  Form,
  Select,
  Input,
  message,
  Tabs,
  Badge,
  Divider,
} from 'antd'
import {
  RocketOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ExperimentOutlined,
  FireOutlined,
  BranchesOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

import api from '../api'

const { Title, Paragraph, Text } = Typography

interface StrategyTemplate {
  id: string
  name: string
  category: string
  tags: string[]
  description: string
  suitable_timeframes: string[]
  suggested_leverage: number
  stop_loss_pct: number
  take_profit_pct: number
  trailing_stop_pct: number
  config_json: string
}

interface SymbolOption {
  id: number
  inst_id: string
  display_name: string
}

const StrategyTemplatesPage: React.FC = () => {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<StrategyTemplate[]>([])
  const [symbols, setSymbols] = useState<SymbolOption[]>([])
  const [loading, setLoading] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('ALL')

  // 查看规则弹窗
  const [viewModal, setViewModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<StrategyTemplate | null>(null)

  // 快速应用弹窗
  const [applyModal, setApplyModal] = useState(false)
  const [applyingTemplate, setApplyingTemplate] = useState<StrategyTemplate | null>(null)
  const [applyLoading, setApplyLoading] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get<StrategyTemplate[]>('/strategies/templates'),
      api.get<SymbolOption[]>('/strategies/symbols/list'),
    ])
      .then(([tmplRes, symRes]) => {
        setTemplates(tmplRes.data)
        setSymbols(symRes.data)
      })
      .catch(err => {
        message.error('加载模版失败: ' + (err.response?.data?.detail || err.message))
      })
      .finally(() => setLoading(false))
  }, [])

  const handleOpenApply = (tmpl: StrategyTemplate) => {
    setApplyingTemplate(tmpl)
    form.setFieldsValue({
      name_override: `${tmpl.name}`,
      symbol_id: symbols.length > 0 ? symbols[0].id : 1,
      timeframe: tmpl.suitable_timeframes[0] || '1H',
    })
    setApplyModal(true)
  }

  const handleConfirmApply = () => {
    if (!applyingTemplate) return
    form.validateFields().then(values => {
      setApplyLoading(true)
      api
        .post('/strategies/templates/apply', {
          template_id: applyingTemplate.id,
          symbol_id: values.symbol_id,
          timeframe: values.timeframe,
          name_override: values.name_override,
        })
        .then(res => {
          message.success('策略已成功创建并保存！')
          setApplyModal(false)
          Modal.confirm({
            title: '策略创建成功！',
            icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
            content: '已为您根据该经典量化模版生成策略，是否立即前往回测页面验证效果？',
            okText: '立即前往回测',
            cancelText: '查看策略列表',
            onOk: () => navigate('/backtests'),
            onCancel: () => navigate('/strategies'),
          })
        })
        .catch(err => {
          message.error('应用模版失败: ' + (err.response?.data?.detail || err.message))
        })
        .finally(() => setApplyLoading(false))
    })
  }

  const filteredTemplates = templates.filter(t => {
    if (activeCategory === 'ALL') return true
    return t.category === activeCategory
  })

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'TREND':
        return 'blue'
      case 'MEAN_REVERSION':
        return 'cyan'
      case 'MOMENTUM':
        return 'purple'
      case 'PATTERN':
        return 'gold'
      case 'OSCILLATOR':
        return 'magenta'
      default:
        return 'default'
    }
  }

  const categories = [
    { key: 'ALL', label: `全部经典模版 (${templates.length})` },
    { key: 'TREND', label: '🚀 趋势跟踪' },
    { key: 'MEAN_REVERSION', label: '🌊 均值回归' },
    { key: 'MOMENTUM', label: '⚡ 动量共振' },
    { key: 'PATTERN', label: '🕯️ K线形态' },
    { key: 'OSCILLATOR', label: '🧱 摆动高频' },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <FireOutlined style={{ color: '#fa541c', fontSize: 20 }} />
            <span>经典量化策略模版库</span>
            <Tag color="orange">经过实盘与长周期回测验证</Tag>
          </Space>
        }
      >
        <Paragraph type="secondary">
          精选加密货币交易中经久不衰的经典量化交易策略体系。内置经过参数优化的默认买卖规则与风控止损止盈设置，支持一键载入并实例化回测。
        </Paragraph>

        <Tabs
          activeKey={activeCategory}
          onChange={setActiveCategory}
          items={categories.map(c => ({ key: c.key, label: c.label }))}
          style={{ marginBottom: 20 }}
        />

        <Row gutter={[20, 20]}>
          {filteredTemplates.map(tmpl => (
            <Col xs={24} sm={24} md={12} lg={8} key={tmpl.id}>
              <Card
                hoverable
                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                title={
                  <Space direction="vertical" size={2} style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong style={{ fontSize: 15 }}>
                        {tmpl.name}
                      </Text>
                    </div>
                    <Space size="small" wrap>
                      <Tag color={getCategoryColor(tmpl.category)}>{tmpl.category}</Tag>
                      {tmpl.tags.map(tag => (
                        <Tag key={tag}>{tag}</Tag>
                      ))}
                    </Space>
                  </Space>
                }
              >
                <Paragraph
                  type="secondary"
                  ellipsis={{ rows: 3, expandable: true, symbol: '展开' }}
                  style={{ flex: 1, minHeight: 66 }}
                >
                  {tmpl.description}
                </Paragraph>

                <div
                  style={{
                    background: '#f8fafc',
                    padding: '10px 12px',
                    borderRadius: 6,
                    marginBottom: 16,
                    fontSize: 13,
                  }}
                >
                  <Row gutter={[8, 8]}>
                    <Col span={12}>
                      ⏱️ 推荐周期:{' '}
                      <Space size={2}>
                        {tmpl.suitable_timeframes.map(tf => (
                          <Tag key={tf} color="blue" style={{ marginRight: 2 }}>
                            {tf}
                          </Tag>
                        ))}
                      </Space>
                    </Col>
                    <Col span={12}>
                      ⚡ 建议杠杆: <b>{tmpl.suggested_leverage}x</b>
                    </Col>
                    <Col span={12}>
                      🛡️ 预设止损: <Tag color="red">-{tmpl.stop_loss_pct}%</Tag>
                    </Col>
                    <Col span={12}>
                      🎯 预设止盈: <Tag color="green">+{tmpl.take_profit_pct}%</Tag>
                    </Col>
                    {tmpl.trailing_stop_pct && (
                      <Col span={24}>
                        🔄 移动追踪: <Tag color="orange">{tmpl.trailing_stop_pct}%</Tag>
                      </Col>
                    )}
                  </Row>
                </div>

                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Button
                    size="middle"
                    icon={<EyeOutlined />}
                    onClick={() => {
                      setSelectedTemplate(tmpl)
                      setViewModal(true)
                    }}
                  >
                    查看配置
                  </Button>
                  <Button
                    type="primary"
                    icon={<ThunderboltOutlined />}
                    onClick={() => handleOpenApply(tmpl)}
                  >
                    一键创建策略
                  </Button>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>

        {/* 查看规则详情弹窗 */}
        <Modal
          title={selectedTemplate ? `模版详情: ${selectedTemplate.name}` : '模版详情'}
          open={viewModal}
          onCancel={() => setViewModal(false)}
          width={750}
          footer={[
            <Button key="close" onClick={() => setViewModal(false)}>
              关闭
            </Button>,
            <Button
              key="apply"
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={() => {
                if (selectedTemplate) {
                  setViewModal(false)
                  handleOpenApply(selectedTemplate)
                }
              }}
            >
              使用此模版创建
            </Button>,
          ]}
        >
          {selectedTemplate && (
            <div>
              <Paragraph>{selectedTemplate.description}</Paragraph>
              <Divider orientation="left">预设风控参数</Divider>
              <Space size="large" style={{ marginBottom: 16 }}>
                <span>
                  止损率: <Tag color="red">-{selectedTemplate.stop_loss_pct}%</Tag>
                </span>
                <span>
                  止盈率: <Tag color="green">+{selectedTemplate.take_profit_pct}%</Tag>
                </span>
                <span>
                  移动追踪止损: <Tag color="orange">{selectedTemplate.trailing_stop_pct}%</Tag>
                </span>
                <span>
                  建议杠杆: <Tag color="blue">{selectedTemplate.suggested_leverage}x</Tag>
                </span>
              </Space>

              <Divider orientation="left">策略规则 JSON 结构</Divider>
              <pre
                style={{
                  background: '#f5f5f5',
                  padding: 12,
                  borderRadius: 4,
                  maxHeight: 280,
                  overflow: 'auto',
                  fontFamily: 'monospace',
                }}
              >
                {selectedTemplate.config_json}
              </pre>
            </div>
          )}
        </Modal>

        {/* 快速应用模版弹窗 */}
        <Modal
          title="使用经典模版创建策略"
          open={applyModal}
          onCancel={() => setApplyModal(false)}
          onOk={handleConfirmApply}
          confirmLoading={applyLoading}
          okText="立即创建"
          cancelText="取消"
        >
          {applyingTemplate && (
            <Form form={form} layout="vertical">
              <Form.Item
                name="name_override"
                label="策略名称"
                rules={[{ required: true, message: '请输入策略名称' }]}
              >
                <Input placeholder="输入策略名称" />
              </Form.Item>

              <Form.Item
                name="symbol_id"
                label="目标交易品种"
                rules={[{ required: true, message: '请选择交易品种' }]}
              >
                <Select
                  showSearch
                  placeholder="选择交易品种"
                  optionFilterProp="children"
                  options={symbols.map(s => ({
                    value: s.id,
                    label: `${s.inst_id} - ${s.display_name}`,
                  }))}
                />
              </Form.Item>

              <Form.Item
                name="timeframe"
                label="执行周期"
                rules={[{ required: true, message: '请选择周期' }]}
              >
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
            </Form>
          )}
        </Modal>
      </Card>
    </div>
  )
}

export default StrategyTemplatesPage
