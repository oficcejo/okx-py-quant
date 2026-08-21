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
  Tabs,
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

import api from '../api'
import { BUY_INDICATORS, SELL_INDICATORS, IndicatorConfig } from '../config/indicators'

interface Symbol {
  id: number
  inst_id: string
  base_ccy: string
  quote_ccy: string
  inst_type: string
  category?: string
  display_name: string
  is_custom?: boolean
}


interface Condition {
  side: 'BUY' | 'SELL' | 'OPEN_LONG' | 'CLOSE_LONG' | 'OPEN_SHORT' | 'CLOSE_SHORT'
  indicator_type: string
  signal_type: string
  timeframe?: string
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

  const [openLongGroups, setOpenLongGroups] = useState<ConditionGroup[]>([{ logic: 'AND', conditions: [] }])
  const [closeLongGroups, setCloseLongGroups] = useState<ConditionGroup[]>([{ logic: 'AND', conditions: [] }])
  const [openShortGroups, setOpenShortGroups] = useState<ConditionGroup[]>([{ logic: 'AND', conditions: [] }])
  const [closeShortGroups, setCloseShortGroups] = useState<ConditionGroup[]>([{ logic: 'AND', conditions: [] }])

  const [saving, setSaving] = useState(false)

  // 加载Symbol列表
  useEffect(() => {
    api
      .get('/strategies/symbols/list')
      .then(res => {
        setSymbols(res.data)
      })
      .catch(err => {
        console.error('加载交易对列表失败:', err)
      })
  }, [])

  // 通用添加条件
  const addCondition = (
    groups: ConditionGroup[],
    setGroups: React.Dispatch<React.SetStateAction<ConditionGroup[]>>,
    groupIndex: number,
    side: any,
    isBuy: boolean
  ) => {
    const newGroups = [...groups]
    newGroups[groupIndex].conditions.push({
      side,
      indicator_type: 'MACD',
      signal_type: isBuy ? 'MACD_GOLDEN_CROSS' : 'MACD_DEAD_CROSS',
      params: {},
    })
    setGroups(newGroups)
  }

  // 通用删除条件
  const removeCondition = (
    groups: ConditionGroup[],
    setGroups: React.Dispatch<React.SetStateAction<ConditionGroup[]>>,
    groupIndex: number,
    condIndex: number
  ) => {
    const newGroups = [...groups]
    newGroups[groupIndex].conditions.splice(condIndex, 1)
    setGroups(newGroups)
  }

  // 通用更新条件
  const updateCondition = (
    groups: ConditionGroup[],
    setGroups: React.Dispatch<React.SetStateAction<ConditionGroup[]>>,
    groupIndex: number,
    condIndex: number,
    field: string,
    value: any,
    indicators: IndicatorConfig[]
  ) => {
    const newGroups = [...groups]
    if (field === 'indicator_type') {
      const indicator = indicators.find(ind => ind.type === value)
      newGroups[groupIndex].conditions[condIndex].indicator_type = value
      newGroups[groupIndex].conditions[condIndex].signal_type =
        indicator?.buySignals?.[0]?.value || indicator?.sellSignals?.[0]?.value || ''
      newGroups[groupIndex].conditions[condIndex].params = {}
    } else if (field === 'signal_type') {
      newGroups[groupIndex].conditions[condIndex].signal_type = value
      newGroups[groupIndex].conditions[condIndex].params = {}
    } else {
      ;(newGroups[groupIndex].conditions[condIndex] as any)[field] = value
    }
    setGroups(newGroups)
  }

  // 更新参数
  const updateConditionParam = (
    groups: ConditionGroup[],
    setGroups: React.Dispatch<React.SetStateAction<ConditionGroup[]>>,
    groupIndex: number,
    condIndex: number,
    paramName: string,
    value: number
  ) => {
    const newGroups = [...groups]
    newGroups[groupIndex].conditions[condIndex].params[paramName] = value
    setGroups(newGroups)
  }

  const getSignalParams = (indicators: IndicatorConfig[], indicatorType: string, signalType: string) => {
    const indicator = indicators.find(ind => ind.type === indicatorType)
    const signals = indicator?.buySignals || indicator?.sellSignals || []
    const signal = signals.find(sig => sig.value === signalType)
    return signal?.params || []
  }

  const generateConfig = () => {
    const ol = openLongGroups.filter(g => g.conditions.length > 0)
    const cl = closeLongGroups.filter(g => g.conditions.length > 0)
    const os = openShortGroups.filter(g => g.conditions.length > 0)
    const cs = closeShortGroups.filter(g => g.conditions.length > 0)

    return {
      open_long_groups: ol,
      close_long_groups: cl,
      open_short_groups: os,
      close_short_groups: cs,
      // 兼容老版本格式
      buy_groups: ol,
      sell_groups: cl,
    }
  }

  const handleSave = () => {
    form.validateFields().then(values => {
      const config = generateConfig()
      if (
        config.open_long_groups.length === 0 &&
        config.close_long_groups.length === 0 &&
        config.open_short_groups.length === 0 &&
        config.close_short_groups.length === 0
      ) {
        message.warning('请至少添加一个开多/平多/开空/平空条件')
        return
      }

      setSaving(true)
      const payload = {
        name: values.name,
        description: values.description,
        symbol_id: values.symbol_id,
        timeframe: values.timeframe,
        leverage: values.leverage || 1.0,
        monitor_interval_sec: values.monitor_interval_sec || 60,
        stop_loss_pct: values.stop_loss_pct ?? null,
        take_profit_pct: values.take_profit_pct ?? null,
        trailing_stop_pct: values.trailing_stop_pct ?? null,
        config_json: JSON.stringify(config, null, 2),
      }

      api
        .post('/strategies/', payload)
        .then(() => {
          message.success('策略创建并保存成功！')
          navigate('/strategies')
        })
        .catch(err => {
          message.error('保存失败: ' + (err.response?.data?.detail || err.message))
        })
        .finally(() => setSaving(false))
    })
  }

  // 渲染单组条件
  const renderConditionGroup = (
    title: string,
    groups: ConditionGroup[],
    setGroups: React.Dispatch<React.SetStateAction<ConditionGroup[]>>,
    groupIndex: number,
    indicators: IndicatorConfig[],
    side: any,
    isBuy: boolean
  ) => {
    const group = groups[groupIndex]
    return (
      <Card
        key={groupIndex}
        size="small"
        style={{ marginBottom: 16, background: '#fafafa' }}
        title={
          <Space>
            <span>{title} 条件组 #{groupIndex + 1}</span>
            <Select
              size="small"
              value={group.logic}
              onChange={val => {
                const newGroups = [...groups]
                newGroups[groupIndex].logic = val
                setGroups(newGroups)
              }}
              options={[
                { label: 'AND (全部满足)', value: 'AND' },
                { label: 'OR (任一满足)', value: 'OR' },
              ]}
              style={{ width: 150 }}
            />
          </Space>
        }
        extra={
          <Space>
            <Button
              type="dashed"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => addCondition(groups, setGroups, groupIndex, side, isBuy)}
            >
              添加条件
            </Button>
          </Space>
        }
      >
        {group.conditions.length === 0 ? (
          <div style={{ padding: 12, textAlign: 'center', color: '#999' }}>
            暂无条件，点击右上角「添加条件」
          </div>
        ) : (
          group.conditions.map((cond, condIndex) => {
            const indicator = indicators.find(ind => ind.type === cond.indicator_type)
            const signals = isBuy ? indicator?.buySignals || [] : indicator?.sellSignals || []
            const paramDefs = getSignalParams(indicators, cond.indicator_type, cond.signal_type)

            return (
              <div
                key={condIndex}
                style={{
                  padding: '10px 12px',
                  background: '#fff',
                  border: '1px solid #f0f0f0',
                  borderRadius: 6,
                  marginBottom: 10,
                }}
              >
                <Row gutter={12} align="middle">
                  <Col span={6}>
                    <Select
                      style={{ width: '100%' }}
                      value={cond.indicator_type}
                      onChange={val =>
                        updateCondition(groups, setGroups, groupIndex, condIndex, 'indicator_type', val, indicators)
                      }
                      options={indicators.map(ind => ({
                        label: `${ind.name} (${ind.type})`,
                        value: ind.type,
                      }))}
                    />
                  </Col>

                  <Col span={7}>
                    <Select
                      style={{ width: '100%' }}
                      value={cond.signal_type}
                      onChange={val =>
                        updateCondition(groups, setGroups, groupIndex, condIndex, 'signal_type', val, indicators)
                      }
                      options={signals.map(sig => ({
                        label: sig.label,
                        value: sig.value,
                      }))}
                    />
                  </Col>

                  <Col span={5}>
                    <Select
                      style={{ width: '100%' }}
                      placeholder="周期: 默认主周期"
                      allowClear
                      value={cond.timeframe}
                      onChange={val =>
                        updateCondition(groups, setGroups, groupIndex, condIndex, 'timeframe', val, indicators)
                      }
                      options={[
                        { label: '当前主周期', value: undefined },
                        { label: '跨周期: 15分钟', value: '15m' },
                        { label: '跨周期: 1小时', value: '1H' },
                        { label: '跨周期: 4小时', value: '4H' },
                        { label: '跨周期: 1天', value: '1D' },
                      ]}
                    />
                  </Col>

                  <Col span={4}>
                    {paramDefs.map(pDef => (
                      <InputNumber
                        key={pDef.name}
                        size="small"
                        placeholder={pDef.label}
                        value={cond.params[pDef.name] ?? pDef.defaultValue}
                        onChange={v =>
                          updateConditionParam(groups, setGroups, groupIndex, condIndex, pDef.name, v || 0)
                        }
                        style={{ width: '100%' }}
                      />
                    ))}
                  </Col>

                  <Col span={2}>
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => removeCondition(groups, setGroups, groupIndex, condIndex)}
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
        title={
          <Space>
            <span>可视化量化策略构建器</span>
            <Tag color="green">多空双向支持</Tag>
            <Tag color="purple">跨周期共振</Tag>
          </Space>
        }
        extra={
          <Space>
            <Button onClick={() => navigate('/strategies')}>取消</Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
              保存策略
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="策略名称" rules={[{ required: true, message: '请输入策略名称' }]}>
                <Input placeholder="例如：BTC 15m MACD金叉 + 4H趋势共振策略" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="symbol_id"
                label="交易品种 (支持 TradFi 大宗 / 美股 / 加密货币 / 自定义)"
                rules={[{ required: true, message: '请选择交易品种' }]}
              >
                <Select
                  showSearch
                  placeholder="选择交易标的，如 XAU, NVDA, BTC"
                  optionFilterProp="children"
                >
                  {symbols.filter(s => s.category === 'COMMODITY').length > 0 && (
                    <Select.OptGroup label="🪙 贵金属与大宗商品 (Commodities)">
                      {symbols
                        .filter(s => s.category === 'COMMODITY')
                        .map(s => (
                          <Select.Option key={s.id} value={s.id}>
                            {s.display_name || s.inst_id} ({s.inst_id})
                          </Select.Option>
                        ))}
                    </Select.OptGroup>
                  )}

                  {symbols.filter(s => s.category === 'STOCK').length > 0 && (
                    <Select.OptGroup label="📈 美股热门股票 (US Stocks)">
                      {symbols
                        .filter(s => s.category === 'STOCK')
                        .map(s => (
                          <Select.Option key={s.id} value={s.id}>
                            {s.display_name || s.inst_id} ({s.inst_id})
                          </Select.Option>
                        ))}
                    </Select.OptGroup>
                  )}

                  {symbols.filter(s => s.category === 'INDEX').length > 0 && (
                    <Select.OptGroup label="📊 指数与 ETF (Indices)">
                      {symbols
                        .filter(s => s.category === 'INDEX')
                        .map(s => (
                          <Select.Option key={s.id} value={s.id}>
                            {s.display_name || s.inst_id} ({s.inst_id})
                          </Select.Option>
                        ))}
                    </Select.OptGroup>
                  )}

                  {symbols.filter(s => s.category === 'CRYPTO' || !s.category).length > 0 && (
                    <Select.OptGroup label="🚀 主流加密货币 (Crypto)">
                      {symbols
                        .filter(s => s.category === 'CRYPTO' || !s.category)
                        .map(s => (
                          <Select.Option key={s.id} value={s.id}>
                            {s.display_name || s.inst_id} ({s.inst_id})
                          </Select.Option>
                        ))}
                    </Select.OptGroup>
                  )}

                  {symbols.filter(s => s.is_custom).length > 0 && (
                    <Select.OptGroup label="⭐ 自定义品种 (Custom)">
                      {symbols
                        .filter(s => s.is_custom)
                        .map(s => (
                          <Select.Option key={s.id} value={s.id}>
                            {s.display_name || s.inst_id} ({s.inst_id})
                          </Select.Option>
                        ))}
                    </Select.OptGroup>
                  )}
                </Select>
              </Form.Item>

            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="timeframe" label="K线主周期" rules={[{ required: true, message: '请选择周期' }]}>
                <Select placeholder="选择主周期">
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
              <Form.Item name="monitor_interval_sec" label="监控轮询周期(秒)" initialValue={60}>
                <InputNumber min={1} placeholder="60" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          {/* 策略风控参数 */}
          <Card type="inner" title="🛡️ 策略风控参数 (可选)" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="stop_loss_pct" label="止损比例 (%)">
                  <InputNumber min={0.1} max={100} step={0.5} placeholder="如: 2.0 代表2%止损" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="take_profit_pct" label="止盈比例 (%)">
                  <InputNumber min={0.1} max={1000} step={0.5} placeholder="如: 5.0 代表5%止盈" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="trailing_stop_pct" label="移动追踪止损 (%)">
                  <InputNumber min={0.1} max={100} step={0.5} placeholder="如: 1.5 从极值回撤1.5%" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Form.Item name="description" label="策略描述">
            <Input.TextArea rows={2} placeholder="描述策略的逻辑、多空方向和适用场景..." />
          </Form.Item>
        </Form>

        <Divider orientation="left">四向交易规则配置 (开多 / 平多 / 开空 / 平空)</Divider>
        <Tabs
          items={[
            {
              key: 'open_long',
              label: (
                <span>
                  🟢 开多买入规则 ({openLongGroups.reduce((acc, g) => acc + g.conditions.length, 0)} 条件)
                </span>
              ),
              children: (
                <div>
                  {openLongGroups.map((_, index) =>
                    renderConditionGroup('开多', openLongGroups, setOpenLongGroups, index, BUY_INDICATORS, 'OPEN_LONG', true)
                  )}
                </div>
              ),
            },
            {
              key: 'close_long',
              label: (
                <span>
                  🔴 平多卖出规则 ({closeLongGroups.reduce((acc, g) => acc + g.conditions.length, 0)} 条件)
                </span>
              ),
              children: (
                <div>
                  {closeLongGroups.map((_, index) =>
                    renderConditionGroup('平多', closeLongGroups, setCloseLongGroups, index, SELL_INDICATORS, 'CLOSE_LONG', false)
                  )}
                </div>
              ),
            },
            {
              key: 'open_short',
              label: (
                <span>
                  📉 开空卖出规则 ({openShortGroups.reduce((acc, g) => acc + g.conditions.length, 0)} 条件)
                </span>
              ),
              children: (
                <div>
                  {openShortGroups.map((_, index) =>
                    renderConditionGroup('开空', openShortGroups, setOpenShortGroups, index, SELL_INDICATORS, 'OPEN_SHORT', false)
                  )}
                </div>
              ),
            },
            {
              key: 'close_short',
              label: (
                <span>
                  📈 平空买入规则 ({closeShortGroups.reduce((acc, g) => acc + g.conditions.length, 0)} 条件)
                </span>
              ),
              children: (
                <div>
                  {closeShortGroups.map((_, index) =>
                    renderConditionGroup('平空', closeShortGroups, setCloseShortGroups, index, BUY_INDICATORS, 'CLOSE_SHORT', true)
                  )}
                </div>
              ),
            },
          ]}
        />

        <Divider />
        <Card title="预览策略配置 JSON" size="small">
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
            {JSON.stringify(generateConfig(), null, 2)}
          </pre>
        </Card>
      </Card>
    </div>
  )
}

export default StrategyBuilderPage
