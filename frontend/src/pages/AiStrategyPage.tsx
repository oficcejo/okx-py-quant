import React, { useState } from 'react'
import { Button, Card, Form, Input, InputNumber, Space, message } from 'antd'

import api from '../api'

const AiStrategyPage: React.FC = () => {
  const [prompt, setPrompt] = useState('')
  const [config, setConfig] = useState('')
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()

  const handleGenerate = () => {
    if (!prompt) {
      message.warning('请先输入策略需求描述')
      return
    }
    setLoading(true)
    api
      .post('/ai/generate-strategy', null, { params: { prompt } })
      .then(res => {
        const cfg = (res.data as any).strategy_config || ''
        setConfig(cfg)
        form.setFieldsValue({ config_json: cfg })
      })
      .finally(() => setLoading(false))
  }

  const handleCreateStrategy = () => {
    form
      .validateFields()
      .then(values => {
        return api.post('/strategies/', {
          name: values.name,
          description: values.description,
          symbol_id: values.symbol_id,
          timeframe: values.timeframe,
          leverage: values.leverage,
          monitor_interval_sec: values.monitor_interval_sec,
          config_json: values.config_json,
        })
      })
      .then(() => {
        message.success('策略已创建')
      })
  }

  return (
    <Card title="AI 策略生成">
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Form layout="vertical">
          <Form.Item label="策略需求描述">
            <Input.TextArea
              rows={4}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="例如：做 BTC 4H 趋势策略，MACD 金叉买入，RSI 超买卖出..."
            />
          </Form.Item>
          <Button type="primary" onClick={handleGenerate} loading={loading}>
            生成策略配置 JSON
          </Button>
        </Form>

        <Form form={form} layout="vertical">
          <Form.Item name="name" label="策略名称" rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Space style={{ display: 'flex' }}>
            <Form.Item name="symbol_id" label="Symbol ID" rules={[{ required: true }]}
            >
              <InputNumber min={1} style={{ width: 200 }} />
            </Form.Item>
            <Form.Item name="timeframe" label="周期" rules={[{ required: true }]}
            >
              <Input placeholder="例如 1m / 1H / 4H" style={{ width: 200 }} />
            </Form.Item>
            <Form.Item name="leverage" label="杠杆">
              <InputNumber min={1} max={100} style={{ width: 120 }} />
            </Form.Item>
          </Space>
          <Form.Item name="monitor_interval_sec" label="监控周期(秒)" initialValue={20}
          >
            <InputNumber min={1} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item
            name="config_json"
            label="策略配置 JSON"
            rules={[{ required: true, message: '请确认策略配置 JSON' }]}
          >
            <Input.TextArea rows={10} value={config} onChange={e => setConfig(e.target.value)} />
          </Form.Item>
          <Button type="primary" onClick={handleCreateStrategy}>
            保存为策略
          </Button>
        </Form>
      </Space>
    </Card>
  )
}

export default AiStrategyPage
