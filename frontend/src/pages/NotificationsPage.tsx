import React, { useState, useEffect } from 'react'
import {
  Card,
  Form,
  Input,
  Switch,
  Button,
  Tabs,
  Space,
  message,
  Alert,
  Tag,
  Typography,
  Divider,
} from 'antd'
import {
  BellOutlined,
  SendOutlined,
  SaveOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'

import api from '../api'

const { Text, Paragraph } = Typography

interface NotificationConfig {
  id: number
  channel: string
  config_json: string
  is_enabled: boolean
}

const NotificationsPage: React.FC = () => {
  const [configs, setConfigs] = useState<Record<string, { config: any; is_enabled: boolean }>>({
    TELEGRAM: { config: { bot_token: '', chat_id: '' }, is_enabled: false },
    FEISHU: { config: { webhook_url: '' }, is_enabled: false },
    WECHAT: { config: { webhook_url: '' }, is_enabled: false },
    DINGTALK: { config: { webhook_url: '' }, is_enabled: false },
  })

  const [saving, setSaving] = useState<string | null>(null)
  const [testing, setTesting] = useState<string | null>(null)

  const [tgForm] = Form.useForm()
  const [feishuForm] = Form.useForm()
  const [wechatForm] = Form.useForm()
  const [dingtalkForm] = Form.useForm()

  const loadConfigs = () => {
    api
      .get<NotificationConfig[]>('/notifications/configs')
      .then(res => {
        const map: Record<string, { config: any; is_enabled: boolean }> = {
          TELEGRAM: { config: { bot_token: '', chat_id: '' }, is_enabled: false },
          FEISHU: { config: { webhook_url: '' }, is_enabled: false },
          WECHAT: { config: { webhook_url: '' }, is_enabled: false },
          DINGTALK: { config: { webhook_url: '' }, is_enabled: false },
        }

        res.data.forEach(item => {
          try {
            const parsed = JSON.parse(item.config_json)
            map[item.channel] = {
              config: parsed,
              is_enabled: item.is_enabled,
            }
          } catch (e) {
            console.error('解析通知配置失败:', e)
          }
        })

        setConfigs(map)
        tgForm.setFieldsValue({ ...map.TELEGRAM.config, is_enabled: map.TELEGRAM.is_enabled })
        feishuForm.setFieldsValue({ ...map.FEISHU.config, is_enabled: map.FEISHU.is_enabled })
        wechatForm.setFieldsValue({ ...map.WECHAT.config, is_enabled: map.WECHAT.is_enabled })
        dingtalkForm.setFieldsValue({ ...map.DINGTALK.config, is_enabled: map.DINGTALK.is_enabled })
      })
      .catch(err => {
        console.error('加载通知配置失败:', err)
      })
  }

  useEffect(() => {
    loadConfigs()
  }, [])

  const handleSave = (channel: string, formInstance: any) => {
    formInstance.validateFields().then((values: any) => {
      setSaving(channel)
      const isEnabled = values.is_enabled || false
      const configData = { ...values }
      delete configData.is_enabled

      api
        .post('/notifications/configs', {
          channel,
          config: configData,
          is_enabled: isEnabled,
        })
        .then(() => {
          message.success(`${channel} 通知配置已保存！`)
          loadConfigs()
        })
        .catch(err => {
          message.error('保存失败: ' + (err.response?.data?.detail || err.message))
        })
        .finally(() => setSaving(null))
    })
  }

  const handleTest = (channel: string, formInstance: any) => {
    formInstance.validateFields().then((values: any) => {
      setTesting(channel)
      const configData = { ...values }
      delete configData.is_enabled

      api
        .post('/notifications/test', {
          channel,
          config: configData,
        })
        .then(res => {
          message.success(res.data?.message || '测试消息已成功发送！')
        })
        .catch(err => {
          message.error('发送测试消息失败: ' + (err.response?.data?.detail || err.message))
        })
        .finally(() => setTesting(null))
    })
  }

  const tabItems = [
    {
      key: 'TELEGRAM',
      label: (
        <span>
          📱 Telegram Bot {configs.TELEGRAM?.is_enabled && <Tag color="green">已启用</Tag>}
        </span>
      ),
      children: (
        <Form form={tgForm} layout="vertical" style={{ maxWidth: 650 }}>
          <Alert
            message="Telegram Bot 配置说明"
            description={
              <div>
                1. 在 Telegram 中搜索 <b>@BotFather</b> 发送 <code>/newbot</code> 获取 <b>Bot Token</b>；<br />
                2. 搜索 <b>@userinfobot</b> 发送任意消息获取您的 <b>Chat ID</b>；<br />
                3. 请先在 Telegram 中主动向您的 Bot 发送一条 <code>/start</code> 消息激活会话。
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 20 }}
          />
          <Form.Item
            name="bot_token"
            label="Bot Token"
            rules={[{ required: true, message: '请输入 Telegram Bot Token' }]}
          >
            <Input.Password placeholder="例如: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ" />
          </Form.Item>
          <Form.Item
            name="chat_id"
            label="Chat ID / 目标群组 ID"
            rules={[{ required: true, message: '请输入 Chat ID' }]}
          >
            <Input placeholder="例如: 123456789 或 -100123456789" />
          </Form.Item>
          <Form.Item name="is_enabled" label="启用 Telegram 通知" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Space size="middle">
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={() => handleSave('TELEGRAM', tgForm)}
              loading={saving === 'TELEGRAM'}
            >
              保存配置
            </Button>
            <Button
              icon={<SendOutlined />}
              onClick={() => handleTest('TELEGRAM', tgForm)}
              loading={testing === 'TELEGRAM'}
            >
              发送测试消息
            </Button>
          </Space>
        </Form>
      ),
    },
    {
      key: 'FEISHU',
      label: (
        <span>
          🐦 飞书自定义机器人 {configs.FEISHU?.is_enabled && <Tag color="green">已启用</Tag>}
        </span>
      ),
      children: (
        <Form form={feishuForm} layout="vertical" style={{ maxWidth: 650 }}>
          <Alert
            message="飞书自定义机器人配置说明"
            description={
              <div>
                1. 在飞书群聊中点击右上角 <b>设置 → 群机器人 → 添加机器人 → 自定义机器人</b>；<br />
                2. 复制生成的 <b>Webhook 地址</b> 填入下方；<br />
                3. 安全设置建议勾选“自定义关键词”并包含“交易”或“OKX”，或免鉴权。
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 20 }}
          />
          <Form.Item
            name="webhook_url"
            label="飞书 Webhook 地址"
            rules={[{ required: true, message: '请输入飞书 Webhook 地址' }]}
          >
            <Input placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
          </Form.Item>
          <Form.Item name="is_enabled" label="启用飞书通知" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Space size="middle">
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={() => handleSave('FEISHU', feishuForm)}
              loading={saving === 'FEISHU'}
            >
              保存配置
            </Button>
            <Button
              icon={<SendOutlined />}
              onClick={() => handleTest('FEISHU', feishuForm)}
              loading={testing === 'FEISHU'}
            >
              发送测试消息
            </Button>
          </Space>
        </Form>
      ),
    },
    {
      key: 'WECHAT',
      label: (
        <span>
          💬 企业微信机器人 {configs.WECHAT?.is_enabled && <Tag color="green">已启用</Tag>}
        </span>
      ),
      children: (
        <Form form={wechatForm} layout="vertical" style={{ maxWidth: 650 }}>
          <Alert
            message="企业微信群机器人配置说明"
            description={
              <div>
                1. 在企业微信群聊中点击右上角 <b>添加群机器人 → 新建机器人</b>；<br />
                2. 复制生成的 <b>Webhook 地址</b> 填入下方。
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 20 }}
          />
          <Form.Item
            name="webhook_url"
            label="企业微信 Webhook 地址"
            rules={[{ required: true, message: '请输入企业微信 Webhook 地址' }]}
          >
            <Input placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
          </Form.Item>
          <Form.Item name="is_enabled" label="启用企业微信通知" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Space size="middle">
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={() => handleSave('WECHAT', wechatForm)}
              loading={saving === 'WECHAT'}
            >
              保存配置
            </Button>
            <Button
              icon={<SendOutlined />}
              onClick={() => handleTest('WECHAT', wechatForm)}
              loading={testing === 'WECHAT'}
            >
              发送测试消息
            </Button>
          </Space>
        </Form>
      ),
    },
    {
      key: 'DINGTALK',
      label: (
        <span>
          📌 钉钉群机器人 {configs.DINGTALK?.is_enabled && <Tag color="green">已启用</Tag>}
        </span>
      ),
      children: (
        <Form form={dingtalkForm} layout="vertical" style={{ maxWidth: 650 }}>
          <Alert
            message="钉钉自定义机器人配置说明"
            description={
              <div>
                1. 在钉钉群设置中选择 <b>智能群助手 → 添加机器人 → 自定义机器人</b>；<br />
                2. 复制生成的 <b>Webhook 地址</b> 填入下方；<br />
                3. 安全设置建议勾选“自定义关键词”并添加“交易”或“OKX”。
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 20 }}
          />

          <Form.Item
            name="webhook_url"
            label="钉钉 Webhook 地址"
            rules={[{ required: true, message: '请输入钉钉 Webhook 地址' }]}
          >
            <Input placeholder="https://oapi.dingtalk.com/robot/send?access_token=xxxxxxxx" />
          </Form.Item>
          <Form.Item name="is_enabled" label="启用钉钉通知" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Space size="middle">
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={() => handleSave('DINGTALK', dingtalkForm)}
              loading={saving === 'DINGTALK'}
            >
              保存配置
            </Button>
            <Button
              icon={<SendOutlined />}
              onClick={() => handleTest('DINGTALK', dingtalkForm)}
              loading={testing === 'DINGTALK'}
            >
              发送测试消息
            </Button>
          </Space>
        </Form>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <BellOutlined style={{ color: '#1890ff', fontSize: 20 }} />
            <span>消息通知中心</span>
            <Tag color="cyan">实时推送</Tag>
          </Space>
        }
      >
        <Paragraph type="secondary">
          配置多渠道消息告警推送。在实盘策略开仓、平仓、触发止盈止损或系统发生异常时，系统将自动通过已启用的渠道即时通知到您的手机。
        </Paragraph>
        <Divider />
        <Tabs items={tabItems} />
      </Card>
    </div>
  )
}

export default NotificationsPage
