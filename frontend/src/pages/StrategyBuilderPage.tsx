import React, { useState, useEffect } from 'react'
import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Row,
  Select,
  Space,
  Tag,
} from 'antd'
import { PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

import api from '../api'
import { BUY_INDICATORS, SELL_INDICATORS, IndicatorConfig, IndicatorSignal } from '../config/indicators'

interface Symbol {
  id: number
  inst_id: string
  base_ccy: string
  quote_ccy: string
  inst_type: string
  display_name: string
}

interface Condition {
  side: 'BUY' | 'SELL'
  indicator_type: string
  signal_type: string
  params: Record<string, number>
}

interface ConditionGroup {
  logic: 'AND' | 'OR'
  conditions: Condition[]
}

const StrategyBuilderPage: React.FC = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [symbols, setSymbols] = useState<Symbol[]>([])
  
  const [buyGroups, setBuyGroups] = useState<ConditionGroup[]>([
    { logic: 'AND', conditions: [] },
  ])
  const [sellGroups, setSellGroups] = useState<ConditionGroup[]>([
    { logic: 'AND', conditions: [] },
  ])

  // 加载Symbol列表
  useEffect(() => {
    api.get('/strategies/symbols/list')
      .then(res => {
        setSymbols(res.data)
      })
      .catch(err => {
        console.error('加载交易对列表失败:', err)
      })
  }, [])

  // 添加买入条件
  const addBuyCondition = (groupIndex: number) => {
    const newGroups = [...buyGroups]
    newGroups[groupIndex].conditions.push({
      side: 'BUY',
      indicator_type: 'MACD',
      signal_type: 'MACD_GOLDEN_CROSS',
      params: {},
    })
    setBuyGroups(newGroups)
  }

  // 添加卖出条件
  const addSellCondition = (groupIndex: number) => {
    const newGroups = [...sellGroups]
    newGroups[groupIndex].conditions.push({
      side: 'SELL',
      indicator_type: 'MACD',
      signal_type: 'MACD_DEAD_CROSS',
      params: {},
    })
    setSellGroups(newGroups)
  }

  // 删除买入条件
  const removeBuyCondition = (groupIndex: number, condIndex: number) => {
    const newGroups = [...buyGroups]
    newGroups[groupIndex].conditions.splice(condIndex, 1)
    setBuyGroups(newGroups)
  }

  // 删除卖出条件
  const removeSellCondition = (groupIndex: number, condIndex: number) => {
    const newGroups = [...sellGroups]
    newGroups[groupIndex].conditions.splice(condIndex, 1)
    setSellGroups(newGroups)
  }

  // 更新买入条件
  const updateBuyCondition = (
    groupIndex: number,
    condIndex: number,
    field: string,
    value: any
  ) => {
    const newGroups = [...buyGroups]
    if (field === 'indicator_type') {
      // 切换指标类型时，重置信号类型
      const indicator = BUY_INDICATORS.find(ind => ind.type === value)
      newGroups[groupIndex].conditions[condIndex].indicator_type = value
      newGroups[groupIndex].conditions[condIndex].signal_type =
        indicator?.buySignals?.[0]?.value || ''
      newGroups[groupIndex].conditions[condIndex].params = {}
    } else if (field === 'signal_type') {
      newGroups[groupIndex].conditions[condIndex].signal_type = value
      newGroups[groupIndex].conditions[condIndex].params = {}
    } else {
      ;(newGroups[groupIndex].conditions[condIndex] as any)[field] = value
    }
    setBuyGroups(newGroups)
  }

  // 更新卖出条件
  const updateSellCondition = (
    groupIndex: number,
    condIndex: number,
    field: string,
    value: any
  ) => {
    const newGroups = [...sellGroups]
    if (field === 'indicator_type') {
      const indicator = SELL_INDICATORS.find(ind => ind.type === value)
      newGroups[groupIndex].conditions[condIndex].indicator_type = value
      newGroups[groupIndex].conditions[condIndex].signal_type =
        indicator?.sellSignals?.[0]?.value || ''
      newGroups[groupIndex].conditions[condIndex].params = {}
    } else if (field === 'signal_type') {
      newGroups[groupIndex].conditions[condIndex].signal_type = value
      newGroups[groupIndex].conditions[condIndex].params = {}
    } else {
      ;(newGroups[groupIndex].conditions[condIndex] as any)[field] = value
    }
    setSellGroups(newGroups)
  }

  // 更新参数
  const updateConditionParam = (
    type: 'buy' | 'sell',
    groupIndex: number,
    condIndex: number,
    paramName: string,
    value: number
  ) => {
    if (type === 'buy') {
      const newGroups = [...buyGroups]
      newGroups[groupIndex].conditions[condIndex].params[paramName] = value
      setBuyGroups(newGroups)
    } else {
      const newGroups = [...sellGroups]
      newGroups[groupIndex].conditions[condIndex].params[paramName] = value
      setSellGroups(newGroups)
    }
  }

  // 获取当前信号的参数定义
  const getSignalParams = (indicators: IndicatorConfig[], indicatorType: string, signalType: string) => {
    const indicator = indicators.find(ind => ind.type === indicatorType)
    const signals = indicator?.buySignals || indicator?.sellSignals || []
    const signal = signals.find(sig => sig.value === signalType)
    return signal?.params || []
  }

  // 生成策略配置JSON
  const generateConfig = () => {
    return {
      buy_groups: buyGroups.filter(g => g.conditions.length > 0),
      sell_groups: sellGroups.filter(g => g.conditions.length > 0),
    }
  }

  // 保存策略
  const handleSave = () => {
    form
      .validateFields()
      .then(values => {
        const config = generateConfig()
        
        if (config.buy_groups.length === 0 && config.sell_groups.length === 0) {
          message.warning('请至少添加一个买入或卖出条件')
          return
        }

        const payload = {
          name: values.name,
          description: values.description,
          symbol_id: values.symbol_id,
          timeframe: values.timeframe,
          leverage: values.leverage || 1,
          monitor_interval_sec: values.monitor_interval_sec || 60,
          config_json: JSON.stringify(config, null, 2),
        }

        return api.post('/strategies/', payload)
      })
      .then(() => {
        message.success('策略创建成功！')
        navigate('/strategies')
      })
      .catch(err => {
        if (err.response) {
          message.error('创建失败: ' + (err.response.data?.detail || err.message))
        }
      })
  }

  // 渲染条件组
  const renderConditionGroup = (
    type: 'buy' | 'sell',
    groups: ConditionGroup[],
    groupIndex: number,
    indicators: IndicatorConfig[]
  ) => {
    const group = groups[groupIndex]
    const isBuy = type === 'buy'

    return (
      <Card
        size="small"
        title={
          <Space>
            <span>{isBuy ? '买入' : '卖出'}条件组 {groupIndex + 1}</span>
            <Select
              size="small"
              value={group.logic}
              style={{ width: 100 }}
              onChange={value => {
                const newGroups = isBuy ? [...buyGroups] : [...sellGroups]
                newGroups[groupIndex].logic = value
                isBuy ? setBuyGroups(newGroups) : setSellGroups(newGroups)
              }}
              options={[
                { label: 'AND (且)', value: 'AND' },
                { label: 'OR (或)', value: 'OR' },
              ]}
            />
          </Space>
        }
        extra={
          <Button
            type="link"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => (isBuy ? addBuyCondition(groupIndex) : addSellCondition(groupIndex))}
          >
            添加条件
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        {group.conditions.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#999', padding: 20 }}>
            暂无条件，点击"添加条件"开始配置
          </div>
        ) : (
          group.conditions.map((cond, condIndex) => {
            const indicator = indicators.find(ind => ind.type === cond.indicator_type)
            const signals = isBuy ? indicator?.buySignals : indicator?.sellSignals
            const signal = signals?.find(sig => sig.value === cond.signal_type)
            const params = signal?.params || []

            return (
              <div key={condIndex} style={{ marginBottom: 12, padding: 12, background: '#fafafa', borderRadius: 4 }}>
                <Row gutter={8} align="middle">
                  <Col span={5}>
                    <Select
                      placeholder="选择指标"
                      value={cond.indicator_type}
                      onChange={value =>
                        isBuy
                          ? updateBuyCondition(groupIndex, condIndex, 'indicator_type', value)
                          : updateSellCondition(groupIndex, condIndex, 'indicator_type', value)
                      }
                      style={{ width: '100%' }}
                    >
                      {indicators.map(ind => (
                        <Select.Option key={ind.type} value={ind.type}>
                          {ind.label}
                        </Select.Option>
                      ))}
                    </Select>
                  </Col>
                  <Col span={7}>
                    <Select
                      placeholder="选择信号"
                      value={cond.signal_type}
                      onChange={value =>
                        isBuy
                          ? updateBuyCondition(groupIndex, condIndex, 'signal_type', value)
                          : updateSellCondition(groupIndex, condIndex, 'signal_type', value)
                      }
                      style={{ width: '100%' }}
                    >
                      {signals?.map(sig => (
                        <Select.Option key={sig.value} value={sig.value}>
                          {sig.label}
                        </Select.Option>
                      ))}
                    </Select>
                  </Col>
                  <Col span={10}>
                    <Space>
                      {params.map(param => (
                        <InputNumber
                          key={param.name}
                          placeholder={param.label}
                          value={cond.params[param.name] || param.default}
                          min={param.min}
                          max={param.max}
                          onChange={value =>
                            updateConditionParam(
                              type,
                              groupIndex,
                              condIndex,
                              param.name,
                              value || param.default
                            )
                          }
                          style={{ width: 100 }}
                          addonBefore={param.label}
                        />
                      ))}
                    </Space>
                  </Col>
                  <Col span={2}>
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() =>
                        isBuy
                          ? removeBuyCondition(groupIndex, condIndex)
                          : removeSellCondition(groupIndex, condIndex)
                      }
                    />
                  </Col>
                </Row>
              </div>
            )
          })
        )}
      </Card>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="策略构建器"
        extra={
          <Space>
            <Button onClick={() => navigate('/strategies')}>取消</Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
              保存策略
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="策略名称" rules={[{ required: true, message: '请输入策略名称' }]}>
                <Input placeholder="例如：MACD金叉+RSI超卖策略" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="symbol_id" label="交易品种" rules={[{ required: true, message: '请选择交易品种' }]}>
                <Select
                  showSearch
                  placeholder="选择交易品种"
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
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={6}>
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
            <Col span={6}>
              <Form.Item name="leverage" label="杠杆倍数" initialValue={1}>
                <InputNumber min={1} max={125} placeholder="1" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="monitor_interval_sec" label="监控周期(秒)" initialValue={60}>
                <InputNumber min={1} placeholder="60" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="策略描述">
            <Input.TextArea rows={2} placeholder="描述策略的逻辑和用途..." />
          </Form.Item>
        </Form>

        <Divider orientation="left">买入条件配置</Divider>
        {buyGroups.map((_, index) => renderConditionGroup('buy', buyGroups, index, BUY_INDICATORS))}

        <Divider orientation="left">卖出条件配置</Divider>
        {sellGroups.map((_, index) => renderConditionGroup('sell', sellGroups, index, SELL_INDICATORS))}

        <Divider />

        <Card title="预览策略配置JSON" size="small">
          <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, maxHeight: 400, overflow: 'auto' }}>
            {JSON.stringify(generateConfig(), null, 2)}
          </pre>
        </Card>
      </Card>
    </div>
  )
}

export default StrategyBuilderPage
