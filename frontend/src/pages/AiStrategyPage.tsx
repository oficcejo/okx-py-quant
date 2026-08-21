import React, { useState, useEffect } from 'react'
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  message,
  Row,
  Col,
  Tag,
  Divider,
  Alert,
  Modal,
} from 'antd'
import {
  RobotOutlined,
  ThunderboltOutlined,
  SaveOutlined,
  ExperimentOutlined,
  BulbOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

import api from '../api'

interface Symbol {
  id: number
  inst_id: string
  base_ccy: string
  quote_ccy: string
  inst_type: string
  display_name: string
}

const QUICK_PROMPTS = [
  'BTC 1小时 MACD金叉买入，RSI超买（大于70）卖出',
  'ETH 5分钟 KDJ超卖（小于20）买入，KDJ超买（大于80）卖出，3倍杠杆',
  'BTC 4小时 均线多头排列（MA5>10>20）买入，跌破MA20卖出',
  'SOL 15分钟 价格站上MA5且MACD金叉买入，跌破MA10卖出',
  'ETH 1天 大阳线形态买入，大阴线或长上影线形态卖出',
]

const AiStrategyPage: React.FC = () => {
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState('')
  const [config, setConfig] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [symbols, setSymbols] = useState<Symbol[]>([])
  const [createdStrategyId, setCreatedStrategyId] = useState<number | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    api
      .get<Symbol[]>('/strategies/symbols/list')
      .then(res => setSymbols(res.data))
      .catch(err => console.error('加载交易对列表失败:', err))
  }, [])

  const handleGenerate = () => {
    if (!prompt.trim()) {
      message.warning('请先输入策略需求描述')
      return
    }
    setLoading(true)
    api
      .post('/ai/generate-strategy', null, { params: { prompt } })
      .then(res => {
        const data = res.data || {}
        const cfg = data.strategy_config || ''
        setConfig(cfg)

        // 自动回填表单
        form.setFieldsValue({
          name: data.name || 'AI 生成策略',
          description: data.description || prompt,
          symbol_id: data.symbol_id || (symbols.length > 0 ? symbols[0].id : 1),
          timeframe: data.timeframe || '1H',
          leverage: data.leverage || 1,
          monitor_interval_sec: data.monitor_interval_sec || 60,
          stop_loss_pct: data.stop_loss_pct ?? null,
          take_profit_pct: data.take_profit_pct ?? null,
          trailing_stop_pct: data.trailing_stop_pct ?? null,
          config_json: cfg,
        })
        message.success('AI 策略配置生成成功！已提取策略与风控参数')
      })
      .catch(err => {
        message.error('生成失败: ' + (err.response?.data?.detail || err.message))
      })
      .finally(() => setLoading(false))
  }

  const handleCreateStrategy = () => {
    form
      .validateFields()
      .then(values => {
        setSaving(true)
        return api.post('/strategies/', {
          name: values.name,
          description: values.description,
          symbol_id: values.symbol_id,
          timeframe: values.timeframe,
          leverage: values.leverage || 1.0,
          monitor_interval_sec: values.monitor_interval_sec || 60,
          stop_loss_pct: values.stop_loss_pct ?? null,
          take_profit_pct: values.take_profit_pct ?? null,
          trailing_stop_pct: values.trailing_stop_pct ?? null,
          config_json: values.config_json,
          created_from_ai: true,
        })
      })
      .then(res => {
        const stratId = res.data?.id
        setCreatedStrategyId(stratId)
        message.success('策略已成功创建并保存！')
        Modal.confirm({
          title: '策略已成功保存！',
          icon: <ExperimentOutlined style={{ color: '#1890ff' }} />,
          content: '是否立即前往回测页面，检验该策略的历史表现？',
          okText: '立即前往回测',
          cancelText: '留在本页',
          onOk: () => navigate('/backtests'),
        })
      })
      .catch(err => {
        message.error('创建策略失败: ' + (err.response?.data?.detail || err.message))
      })
      .finally(() => setSaving(false))
  }

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <RobotOutlined style={{ fontSize: 20, color: '#1890ff' }} />
            <span>AI 智能策略生成器</span>
            <Tag color="purple">大模型驱动</Tag>
          </Space>
        }
      >
        {/* 自然语言输入区域 */}
        <Card type="inner" title="1. 描述您的交易思路" style={{ marginBottom: 20 }}>
          <Form layout="vertical">
            <Form.Item
              label="策略需求描述（支持交易对、K线周期、多指标组合、杠杆等）"
              rules={[{ required: true }]}
            >
              <Input.TextArea
                rows={3}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="例如：BTC 1小时级别趋势策略，当 MACD 金叉且 RSI 低于 30 超卖时买入，RSI 高于 70 超买时卖出..."
              />
            </Form.Item>

            {/* 快速提示词示例 */}
            <div style={{ marginBottom: 16 }}>
              <Space wrap size={[8, 8]}>
                <span style={{ color: '#666', fontSize: 13 }}>
                  <BulbOutlined /> 快速示例：
                </span>
                {QUICK_PROMPTS.map((sample, idx) => (
                  <Tag
                    key={idx}
                    color="geekblue"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setPrompt(sample)}
                  >
                    {sample}
                  </Tag>
                ))}
              </Space>
            </div>

            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={handleGenerate}
              loading={loading}
              size="large"
            >
              生成多因子策略配置 JSON
            </Button>
          </Form>
        </Card>

        {/* 策略属性与配置预览 */}
        <Card type="inner" title="2. 检查与确认策略参数">
          <Form form={form} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="name"
                  label="策略名称"
                  rules={[{ required: true, message: '请输入策略名称' }]}
                >
                  <Input placeholder="策略名称" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="symbol_id"
                  label="交易品种"
                  rules={[{ required: true, message: '请选择交易品种' }]}
                >
                  <Select
                    showSearch
                    placeholder="选择交易品种"
                    optionFilterProp="children"
                    options={symbols.map(s => ({
                      value: s.id,
                      label: `${s.inst_id} (${s.inst_type})`,
                    }))}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="timeframe"
                  label="K线周期"
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
              </Col>
              <Col span={8}>
                <Form.Item name="leverage" label="杠杆倍数" initialValue={1}>
                  <InputNumber min={1} max={125} placeholder="1" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="monitor_interval_sec" label="监控轮询周期(秒)" initialValue={60}>
                  <InputNumber min={1} placeholder="60" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="description" label="策略描述">
              <Input.TextArea rows={2} placeholder="策略详细描述" />
            </Form.Item>

            {/* 止损止盈参数 */}
            <Card type="inner" title="🛡️ 策略风控设置 (自动由 AI 建议或手动微调)" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="stop_loss_pct" label="止损比例 (%)">
                    <InputNumber
                      min={0.1}
                      max={100}
                      step={0.5}
                      placeholder="如: 2.0 代表2%"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="take_profit_pct" label="止盈比例 (%)">
                    <InputNumber
                      min={0.1}
                      max={1000}
                      step={0.5}
                      placeholder="如: 5.0 代表5%"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="trailing_stop_pct" label="移动追踪止损 (%)">
                    <InputNumber
                      min={0.1}
                      max={100}
                      step={0.5}
                      placeholder="如: 1.5 从高点回撤1.5%"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Form.Item
              name="config_json"
              label="策略规则 JSON (严格遵守买入/卖出条件组规范)"
              rules={[{ required: true, message: '请确认策略配置 JSON' }]}
            >

              <Input.TextArea
                rows={8}
                value={config}
                onChange={e => setConfig(e.target.value)}
                style={{ fontFamily: 'monospace' }}
              />
            </Form.Item>

            <Space size="middle">
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleCreateStrategy}
                loading={saving}
                size="large"
              >
                保存为策略
              </Button>
              {createdStrategyId && (
                <Button
                  icon={<ExperimentOutlined />}
                  onClick={() => navigate('/backtests')}
                  size="large"
                >
                  前往回测
                </Button>
              )}
            </Space>
          </Form>
        </Card>
      </Card>
    </div>
  )
}

export default AiStrategyPage

