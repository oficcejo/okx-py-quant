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
  Tabs,
  Input,
  Radio,
  Switch,
  Badge,
  Tooltip,
} from 'antd'
import {
  DownloadOutlined,
  DeleteOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  GoldOutlined,
  StockOutlined,
  RocketOutlined,
  StarOutlined,
  AppstoreOutlined,
  DatabaseOutlined,
  GlobalOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../api'

const { RangePicker } = DatePicker
const { Title, Text, Paragraph } = Typography
const { Option, OptGroup } = Select

interface SymbolItem {
  id: number
  inst_id: string
  base_ccy: string
  quote_ccy: string
  inst_type: string
  category: string
  display_name: string
  description?: string
  is_custom: boolean
  is_active: boolean
}

interface KlineStats {
  inst_id: string
  timeframe: string
  count: number
  start_ts: string | null
  end_ts: string | null
}

const CATEGORY_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  COMMODITY: { label: '大宗与贵金属', color: 'gold', icon: <GoldOutlined /> },
  STOCK: { label: '美股股票', color: 'blue', icon: <StockOutlined /> },
  INDEX: { label: '指数与ETF', color: 'purple', icon: <StockOutlined /> },
  CRYPTO: { label: '加密货币', color: 'cyan', icon: <RocketOutlined /> },
  CUSTOM: { label: '自定义品种', color: 'magenta', icon: <StarOutlined /> },
}

const DataManagementPage: React.FC = () => {
  const [downloadForm] = Form.useForm()
  const [symbolModalForm] = Form.useForm()

  const [activeMainTab, setActiveMainTab] = useState('klines')
  const [symbols, setSymbols] = useState<SymbolItem[]>([])
  const [stats, setStats] = useState<KlineStats[]>([])
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [loadingStats, setLoadingStats] = useState(false)
  const [loadingSymbols, setLoadingSymbols] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // 模态框状态
  const [symbolModalVisible, setSymbolModalVisible] = useState(false)
  const [editingSymbol, setEditingSymbol] = useState<SymbolItem | null>(null)
  const [submittingSymbol, setSubmittingSymbol] = useState(false)

  // 加载全量品种列表
  const loadSymbols = () => {
    setLoadingSymbols(true)
    api
      .get<SymbolItem[]>('/symbols/')
      .then(res => {
        setSymbols(res.data)
      })
      .catch(() => {
        message.error('加载交易品种列表失败')
      })
      .finally(() => {
        setLoadingSymbols(false)
      })
  }

  // 加载K线数据统计
  const loadStats = () => {
    setLoadingStats(true)
    api
      .get<KlineStats[]>('/market/klines/stats')
      .then(res => {
        setStats(res.data)
      })
      .catch(() => {
        message.error('加载数据统计失败')
      })
      .finally(() => {
        setLoadingStats(false)
      })
  }

  useEffect(() => {
    loadSymbols()
    loadStats()
  }, [])

  // 下载K线数据
  const handleDownload = () => {
    downloadForm.validateFields().then(values => {
      setDownloading(true)
      message.loading('正在下载数据，请耐心等待...', 0)

      const payload = {
        inst_id: values.inst_id,
        timeframe: values.timeframe,
        start_ts: values.dateRange ? values.dateRange[0].toISOString() : undefined,
        end_ts: values.dateRange ? values.dateRange[1].toISOString() : undefined,
        limit_per_call: 300,
      }

      api
        .post('/market/klines/sync', payload)
        .then(res => {
          message.destroy()
          message.success(`成功下载 ${res.data.inserted} 条K线数据`)
          loadStats()
          downloadForm.resetFields()
        })
        .catch(err => {
          message.destroy()
          message.error('下载失败: ' + (err.response?.data?.detail || err.message))
        })
        .finally(() => {
          setDownloading(false)
        })
    })
  }

  // 删除K线数据
  const handleDeleteKline = (inst_id?: string, timeframe?: string) => {
    const params: any = {}
    if (inst_id) params.inst_id = inst_id
    if (timeframe) params.timeframe = timeframe

    api
      .delete('/market/klines/clean', { params })
      .then(res => {
        message.success(`已删除 ${res.data.deleted} 条数据`)
        loadStats()
      })
      .catch(() => {
        message.error('删除失败')
      })
  }

  // 启停交易品种
  const handleToggleSymbolActive = (symbol: SymbolItem, checked: boolean) => {
    api
      .put(`/symbols/${symbol.id}`, { is_active: checked })
      .then(() => {
        message.success(`${symbol.inst_id} 已${checked ? '启用' : '停用'}`)
        loadSymbols()
      })
      .catch(() => {
        message.error('修改状态失败')
      })
  }

  // 打开新增/编辑自定义品种弹窗
  const handleOpenSymbolModal = (symbol?: SymbolItem) => {
    if (symbol) {
      setEditingSymbol(symbol)
      symbolModalForm.setFieldsValue({
        inst_id: symbol.inst_id,
        display_name: symbol.display_name,
        category: symbol.category || 'COMMODITY',
        inst_type: symbol.inst_type || 'SWAP',
        base_ccy: symbol.base_ccy,
        quote_ccy: symbol.quote_ccy || 'USDT',
        description: symbol.description,
        is_active: symbol.is_active,
      })
    } else {
      setEditingSymbol(null)
      symbolModalForm.resetFields()
      symbolModalForm.setFieldsValue({
        category: 'COMMODITY',
        inst_type: 'SWAP',
        quote_ccy: 'USDT',
        is_active: true,
      })
    }
    setSymbolModalVisible(true)
  }

  // 提交自定义品种
  const handleSaveSymbol = () => {
    symbolModalForm.validateFields().then(values => {
      setSubmittingSymbol(true)
      if (editingSymbol) {
        // 编辑
        api
          .put(`/symbols/${editingSymbol.id}`, values)
          .then(() => {
            message.success('品种信息更新成功')
            setSymbolModalVisible(false)
            loadSymbols()
          })
          .catch(err => {
            message.error('更新失败: ' + (err.response?.data?.detail || err.message))
          })
          .finally(() => {
            setSubmittingSymbol(false)
          })
      } else {
        // 新增
        api
          .post('/symbols/', values)
          .then(() => {
            message.success('自定义交易品种创建成功！')
            setSymbolModalVisible(false)
            loadSymbols()
          })
          .catch(err => {
            message.error('创建失败: ' + (err.response?.data?.detail || err.message))
          })
          .finally(() => {
            setSubmittingSymbol(false)
          })
      }
    })
  }

  // 删除自定义品种
  const handleDeleteSymbol = (id: number) => {
    api
      .delete(`/symbols/${id}`)
      .then(res => {
        message.success(res.data.message)
        loadSymbols()
      })
      .catch(err => {
        message.error('删除失败: ' + (err.response?.data?.detail || err.message))
      })
  }

  // 过滤后的品种
  const filteredSymbols = symbols.filter(s => {
    const matchCat =
      categoryFilter === 'ALL'
        ? true
        : categoryFilter === 'CUSTOM'
        ? s.is_custom
        : (s.category || 'CRYPTO').toUpperCase() === categoryFilter
    const matchSearch =
      !searchKeyword ||
      s.inst_id.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      (s.display_name && s.display_name.toLowerCase().includes(searchKeyword.toLowerCase())) ||
      (s.base_ccy && s.base_ccy.toLowerCase().includes(searchKeyword.toLowerCase()))
    return matchCat && matchSearch
  })

  // 按分类分组的品种字典（用于下拉选择框）
  const groupedSymbols: Record<string, SymbolItem[]> = {
    COMMODITY: symbols.filter(s => s.category === 'COMMODITY' && s.is_active),
    STOCK: symbols.filter(s => s.category === 'STOCK' && s.is_active),
    INDEX: symbols.filter(s => s.category === 'INDEX' && s.is_active),
    CRYPTO: symbols.filter(s => (s.category === 'CRYPTO' || !s.category) && s.is_active),
    CUSTOM: symbols.filter(s => s.is_custom && s.is_active),
  }

  // K线表格列
  const klineColumns = [
    {
      title: '交易标的',
      dataIndex: 'inst_id',
      key: 'inst_id',
      width: 220,
      render: (inst_id: string) => {
        const sym = symbols.find(s => s.inst_id === inst_id)
        const cat = sym?.category || 'CRYPTO'
        const catInfo = CATEGORY_MAP[cat] || CATEGORY_MAP.CRYPTO
        return (
          <Space direction="vertical" size={0}>
            <Space>
              <Text strong>{inst_id}</Text>
              <Tag color={catInfo.color} style={{ fontSize: 11 }}>
                {catInfo.label}
              </Tag>
            </Space>
            {sym?.display_name && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {sym.display_name}
              </Text>
            )}
          </Space>
        )
      },
    },
    {
      title: 'K线周期',
      dataIndex: 'timeframe',
      key: 'timeframe',
      width: 90,
      render: (val: string) => <Tag color="blue">{val}</Tag>,
    },
    {
      title: '数据条数',
      dataIndex: 'count',
      key: 'count',
      width: 110,
      render: (val: number) => <b>{val.toLocaleString()}</b>,
    },
    {
      title: '开始时间',
      dataIndex: 'start_ts',
      key: 'start_ts',
      width: 170,
      render: (val: string | null) => (val ? dayjs(val).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '结束时间',
      dataIndex: 'end_ts',
      key: 'end_ts',
      width: 170,
      render: (val: string | null) => (val ? dayjs(val).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: KlineStats) => (
        <Popconfirm
          title="确认删除"
          description={`删除 ${record.inst_id} ${record.timeframe} 的本地K线？`}
          onConfirm={() => handleDeleteKline(record.inst_id, record.timeframe)}
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

  // 品种表格列
  const symbolColumns = [
    {
      title: '代码 (instId)',
      dataIndex: 'inst_id',
      key: 'inst_id',
      width: 180,
      render: (text: string, record: SymbolItem) => (
        <Space>
          <Text strong copyable>
            {text}
          </Text>
          {record.is_custom && <Tag color="magenta">自定义</Tag>}
        </Space>
      ),
    },
    {
      title: '名称 / 中文描述',
      dataIndex: 'display_name',
      key: 'display_name',
      width: 240,
      render: (val: string, record: SymbolItem) => (
        <div>
          <div style={{ fontWeight: 500 }}>{val || record.inst_id}</div>
          {record.description && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.description}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: '资产类别',
      dataIndex: 'category',
      key: 'category',
      width: 140,
      render: (cat: string) => {
        const info = CATEGORY_MAP[cat?.toUpperCase()] || CATEGORY_MAP.CRYPTO
        return (
          <Tag color={info.color} icon={info.icon}>
            {info.label}
          </Tag>
        )
      },
    },
    {
      title: '标的类型',
      dataIndex: 'inst_type',
      key: 'inst_type',
      width: 100,
      render: (val: string) => <Tag color="geekblue">{val || 'SWAP'}</Tag>,
    },
    {
      title: '启用状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (active: boolean, record: SymbolItem) => (
        <Switch
          checked={active}
          size="small"
          checkedChildren="启用"
          unCheckedChildren="停用"
          onChange={checked => handleToggleSymbolActive(record, checked)}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 130,
      render: (_: any, record: SymbolItem) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenSymbolModal(record)}
          >
            编辑
          </Button>
          {record.is_custom && (
            <Popconfirm
              title="确认删除"
              description="确认删除该自定义品种？"
              onConfirm={() => handleDeleteSymbol(record.id)}
            >
              <Button type="link" danger size="small" icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space align="center">
            <GlobalOutlined style={{ color: '#1677ff', fontSize: 20 }} />
            <Title level={4} style={{ margin: 0 }}>
              行情数据与交易品种管理
            </Title>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                loadSymbols()
                loadStats()
              }}
            >
              刷新
            </Button>
          </Space>
        }
      >
        <Tabs
          activeKey={activeMainTab}
          onChange={setActiveMainTab}
          items={[
            {
              key: 'klines',
              label: (
                <span>
                  <DatabaseOutlined /> K线数据下载与本地库 ({stats.length} 组)
                </span>
              ),
              children: (
                <div>
                  {/* 下载表单 */}
                  <Card type="inner" title="📥 下载 OKX 历史 K 线数据" style={{ marginBottom: 20 }}>
                    <Form form={downloadForm} layout="vertical">
                      <Row gutter={16}>
                        <Col xs={24} sm={12} md={8}>
                          <Form.Item
                            name="inst_id"
                            label="选择交易标的 (支持 TradFi 大宗 / 美股 / 加密货币)"
                            rules={[{ required: true, message: '请选择交易标的' }]}
                          >
                            <Select
                              showSearch
                              placeholder="搜索代码或名称，如 XAU, NVDA, BTC"
                              optionFilterProp="children"
                            >
                              {groupedSymbols.COMMODITY?.length > 0 && (
                                <OptGroup label="🪙 贵金属与大宗商品 (Commodities)">
                                  {groupedSymbols.COMMODITY.map(s => (
                                    <Option key={s.inst_id} value={s.inst_id}>
                                      {s.display_name || s.inst_id} ({s.inst_id})
                                    </Option>
                                  ))}
                                </OptGroup>
                              )}

                              {groupedSymbols.STOCK?.length > 0 && (
                                <OptGroup label="📈 美股热门股票 (US Stocks)">
                                  {groupedSymbols.STOCK.map(s => (
                                    <Option key={s.inst_id} value={s.inst_id}>
                                      {s.display_name || s.inst_id} ({s.inst_id})
                                    </Option>
                                  ))}
                                </OptGroup>
                              )}

                              {groupedSymbols.INDEX?.length > 0 && (
                                <OptGroup label="📊 指数与 ETF (Indices)">
                                  {groupedSymbols.INDEX.map(s => (
                                    <Option key={s.inst_id} value={s.inst_id}>
                                      {s.display_name || s.inst_id} ({s.inst_id})
                                    </Option>
                                  ))}
                                </OptGroup>
                              )}

                              {groupedSymbols.CRYPTO?.length > 0 && (
                                <OptGroup label="🚀 主流加密货币 (Crypto)">
                                  {groupedSymbols.CRYPTO.map(s => (
                                    <Option key={s.inst_id} value={s.inst_id}>
                                      {s.display_name || s.inst_id} ({s.inst_id})
                                    </Option>
                                  ))}
                                </OptGroup>
                              )}

                              {groupedSymbols.CUSTOM?.length > 0 && (
                                <OptGroup label="⭐ 自定义品种 (Custom)">
                                  {groupedSymbols.CUSTOM.map(s => (
                                    <Option key={s.inst_id} value={s.inst_id}>
                                      {s.display_name || s.inst_id} ({s.inst_id})
                                    </Option>
                                  ))}
                                </OptGroup>
                              )}
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={4}>
                          <Form.Item
                            name="timeframe"
                            label="K线周期"
                            rules={[{ required: true, message: '请选择周期' }]}
                            initialValue="1H"
                          >
                            <Select placeholder="选择周期">
                              <Option value="1m">1分钟 (1m)</Option>
                              <Option value="5m">5分钟 (5m)</Option>
                              <Option value="15m">15分钟 (15m)</Option>
                              <Option value="30m">30分钟 (30m)</Option>
                              <Option value="1H">1小时 (1H)</Option>
                              <Option value="4H">4小时 (4H)</Option>
                              <Option value="1D">日线 (1D)</Option>
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={16} md={8}>
                          <Form.Item
                            name="dateRange"
                            label="时间范围 (UTC 时间)"
                            initialValue={[dayjs().subtract(14, 'day'), dayjs()]}
                          >
                            <RangePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={8} md={4}>
                          <Form.Item label=" ">
                            <Button
                              type="primary"
                              icon={<DownloadOutlined />}
                              onClick={handleDownload}
                              loading={downloading}
                              block
                            >
                              开始下载
                            </Button>
                          </Form.Item>
                        </Col>
                      </Row>
                    </Form>
                    <Space direction="vertical" size={2} style={{ width: '100%', fontSize: 13 }}>
                      <Text type="secondary">
                        💡 提示：支持下载黄金、白银、原油、英伟达、特斯拉及主流币多周期 K 线并存入本地库，回测将极速执行零延迟。
                      </Text>
                    </Space>
                  </Card>

                  {/* 已下载数据集表格 */}
                  <Card
                    type="inner"
                    title={
                      <span>
                        📊 本地已缓存的 K 线数据集 (共 <b>{stats.length}</b> 组)
                      </span>
                    }
                  >
                    <Table
                      columns={klineColumns}
                      dataSource={stats}
                      loading={loadingStats}
                      rowKey={record => `${record.inst_id}-${record.timeframe}`}
                      pagination={{ pageSize: 15 }}
                      size="small"
                    />

                    <div style={{ marginTop: 16 }}>
                      <Popconfirm
                        title="危险操作"
                        description="确认清空所有已下载的K线数据？此操作不可恢复！"
                        onConfirm={() => handleDeleteKline()}
                        okText="确认清空"
                        cancelText="取消"
                        okButtonProps={{ danger: true }}
                      >
                        <Button danger icon={<DeleteOutlined />}>
                          清空全部 K 线库
                        </Button>
                      </Popconfirm>
                    </div>
                  </Card>
                </div>
              ),
            },
            {
              key: 'symbols',
              label: (
                <span>
                  <AppstoreOutlined /> 交易品种与标的管理 ({symbols.length} 个)
                </span>
              ),
              children: (
                <div>
                  {/* 分类筛选与新增按钮 */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 12,
                      marginBottom: 16,
                    }}
                  >
                    <Space wrap>
                      <Radio.Group
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value)}
                        buttonStyle="solid"
                      >
                        <Radio.Button value="ALL">全部 ({symbols.length})</Radio.Button>
                        <Radio.Button value="COMMODITY">
                          🪙 贵金属与大宗 ({symbols.filter(s => s.category === 'COMMODITY').length})
                        </Radio.Button>
                        <Radio.Button value="STOCK">
                          📈 美股股票 ({symbols.filter(s => s.category === 'STOCK').length})
                        </Radio.Button>
                        <Radio.Button value="INDEX">
                          📊 指数 ETF ({symbols.filter(s => s.category === 'INDEX').length})
                        </Radio.Button>
                        <Radio.Button value="CRYPTO">
                          🚀 加密货币 ({symbols.filter(s => s.category === 'CRYPTO' || !s.category).length})
                        </Radio.Button>
                        <Radio.Button value="CUSTOM">
                          ⭐ 自定义品种 ({symbols.filter(s => s.is_custom).length})
                        </Radio.Button>
                      </Radio.Group>
                      <Input.Search
                        placeholder="搜索代码 / 名称"
                        allowClear
                        value={searchKeyword}
                        onChange={e => setSearchKeyword(e.target.value)}
                        style={{ width: 180 }}
                      />
                    </Space>

                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => handleOpenSymbolModal()}
                    >
                      添加自定义交易品种
                    </Button>
                  </div>

                  {/* 品种列表表格 */}
                  <Table
                    columns={symbolColumns}
                    dataSource={filteredSymbols}
                    loading={loadingSymbols}
                    rowKey="id"
                    pagination={{ pageSize: 12 }}
                    size="small"
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* 🪙 新增/编辑交易品种模态框 */}
      <Modal
        title={
          <Space>
            <StarOutlined style={{ color: '#eb2f96' }} />
            <span>{editingSymbol ? '编辑交易品种' : '新增自定义交易品种'}</span>
          </Space>
        }
        open={symbolModalVisible}
        onCancel={() => setSymbolModalVisible(false)}
        onOk={handleSaveSymbol}
        confirmLoading={submittingSymbol}
        destroyOnClose
        width={560}
      >
        <Form form={symbolModalForm} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item
                name="inst_id"
                label="交易对代码 (instId)"
                rules={[
                  { required: true, message: '请输入代码' },
                  { pattern: /^[A-Za-z0-9_-]+$/, message: '仅支持字母、数字、下划线与中划线' },
                ]}
                extra="如: XAU-USDT-SWAP, BABA-USDT, TSLA-USD"
              >
                <Input placeholder="例如: GOLD-USDT-SWAP" disabled={!!editingSymbol} />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item
                name="category"
                label="资产类别"
                rules={[{ required: true, message: '请选择资产类别' }]}
              >
                <Select>
                  <Option value="COMMODITY">🪙 大宗与贵金属</Option>
                  <Option value="STOCK">📈 美股股票</Option>
                  <Option value="INDEX">📊 股票指数/ETF</Option>
                  <Option value="CRYPTO">🚀 加密数字资产</Option>
                  <Option value="CUSTOM">⭐ 其他自定义资产</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="display_name"
                label="显示名称"
                rules={[{ required: true, message: '请输入展示名称' }]}
              >
                <Input placeholder="例如: 黄金/USDT 永续合约 (Gold)" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="inst_type" label="标的类型">
                <Select>
                  <Option value="SWAP">永续合约 (SWAP)</Option>
                  <Option value="SPOT">现货 (SPOT)</Option>
                  <Option value="FUTURES">交割合约 (FUTURES)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="base_ccy" label="基础货币 (Base Currency)">
                <Input placeholder="例如: XAU, NVDA, BTC" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="quote_ccy" label="计价货币 (Quote Currency)" initialValue="USDT">
                <Input placeholder="例如: USDT, USD" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="品种背景 / 描述说明">
            <Input.TextArea
              rows={2}
              placeholder="例如: 纽约商品交易所黄金衍生品标的，用于宏观抗通胀趋势策略"
            />
          </Form.Item>

          <Form.Item name="is_active" label="默认启用状态" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="已启用" unCheckedChildren="已停用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default DataManagementPage

