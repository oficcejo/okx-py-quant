// 指标配置定义

export interface IndicatorSignal {
  value: string
  label: string
  params?: {
    name: string
    label: string
    default: number
    min?: number
    max?: number
  }[]
}

export interface IndicatorConfig {
  type: string
  label: string
  buySignals?: IndicatorSignal[]
  sellSignals?: IndicatorSignal[]
}

// 买入指标配置
export const BUY_INDICATORS: IndicatorConfig[] = [
  {
    type: 'MACD',
    label: 'MACD',
    buySignals: [
      { value: 'MACD_GOLDEN_CROSS', label: '金叉' },
      { value: 'MACD_ABOVE_ZERO', label: '上移' },
      { value: 'MACD_BULLISH_ARRANGE', label: '多头排列' },
      { value: 'MACD_DOUBLE_GOLDEN', label: '二次金叉' },
      { value: 'MACD_LOW_GOLDEN', label: '低位金叉' },
      { value: 'MACD_BOTTOM_DIVERGENCE', label: '底背离' },
    ],
  },
  {
    type: 'KDJ',
    label: 'KDJ',
    buySignals: [
      { value: 'KDJ_GOLDEN_CROSS', label: '金叉' },
      { value: 'KDJ_OVERSOLD', label: '超卖', params: [{ name: 'threshold', label: '阈值', default: 20 }] },
      { value: 'KDJ_BOTTOM_DIVERGENCE', label: '底背离' },
      { value: 'KDJ_TURN_UP', label: '拐头向上' },
      { value: 'KDJ_BULLISH_ARRANGE', label: '多头排列' },
      { value: 'KDJ_LOW_GOLDEN', label: '低位金叉' },
    ],
  },
  {
    type: 'BOLL',
    label: '布林带',
    buySignals: [
      { value: 'BOLL_OPEN_EXPAND', label: '开口张开' },
      { value: 'BOLL_BREAK_UPPER', label: '突破上轨' },
      { value: 'BOLL_BREAK_MIDDLE', label: '突破中轨' },
      { value: 'BOLL_BREAK_LOWER', label: '突破下轨' },
    ],
  },
  {
    type: 'RSI',
    label: 'RSI',
    buySignals: [
      { value: 'RSI_GOLDEN_CROSS', label: '金叉' },
      { value: 'RSI_TURN_UP', label: '拐头向上' },
      { value: 'RSI_OVERSOLD', label: '超卖', params: [{ name: 'threshold', label: '阈值', default: 30 }] },
      { value: 'RSI_LOW_GOLDEN', label: 'RSI低位金叉' },
      { value: 'RSI_CROSS_30_UP', label: '上穿30' },
    ],
  },
  {
    type: 'BBI',
    label: 'BBI',
    buySignals: [
      { value: 'BBI_PRICE_CROSS_UP', label: '价格上穿BBI' },
    ],
  },
  {
    type: 'CCI',
    label: 'CCI',
    buySignals: [
      { value: 'CCI_BELOW_NEG100', label: '小于-100' },
    ],
  },
  {
    type: 'MA',
    label: '均线',
    buySignals: [
      { value: 'MA_PRICE_ABOVE_MA5', label: '站上MA5' },
      { value: 'MA_PRICE_ABOVE_MA10', label: '站上MA10' },
      { value: 'MA_PRICE_ABOVE_MA20', label: '站上MA20' },
      { value: 'MA_PRICE_ABOVE_MA30', label: '站上MA30' },
      { value: 'MA_PRICE_ABOVE_MA60', label: '站上MA60' },
      { value: 'MA_MA5_CROSS_MA10', label: 'MA5金叉MA10' },
      { value: 'MA_MA5_CROSS_MA20', label: 'MA5金叉MA20' },
      { value: 'MA_MA5_CROSS_MA30', label: 'MA5金叉MA30' },
      { value: 'MA_MA3_CROSS_MA15', label: 'MA3金叉MA15' },
      { value: 'MA_BULLISH_ARRANGE_5_10_20', label: '多头排列(5,10,20)' },
    ],
  },
  {
    type: 'CANDLE',
    label: 'K线形态',
    buySignals: [
      { value: 'CANDLE_DOJI', label: '十字星' },
      { value: 'CANDLE_BIG_YANG', label: '大阳线' },
      { value: 'CANDLE_MULTI_CANNON', label: '多方炮' },
      { value: 'CANDLE_TWEEZER', label: '搓操线' },
      { value: 'CANDLE_LOTUS', label: '出水芙蓉' },
      { value: 'CANDLE_BALD_BULLISH', label: '光头阳线' },
      { value: 'CANDLE_GOLDEN_NEEDLE', label: '金针探底' },
      { value: 'CANDLE_ONE_THROUGH_THREE', label: '一阳穿三线' },
      { value: 'CANDLE_THREE_RED_SOLDIERS', label: '红三兵' },
      { value: 'CANDLE_DRAGONFLY_DOJI', label: '蜻蜓点水' },
      { value: 'CANDLE_MORNING_STAR', label: '早晨之星' },
      { value: 'CANDLE_BULLISH_ENGULFING', label: '看涨吞没' },
      { value: 'CANDLE_BAREFOOT_BEARISH', label: '光脚阴线' },
    ],
  },
]

// 卖出指标配置
export const SELL_INDICATORS: IndicatorConfig[] = [
  {
    type: 'MACD',
    label: 'MACD',
    sellSignals: [
      { value: 'MACD_DEAD_CROSS', label: '死叉' },
      { value: 'MACD_BELOW_ZERO', label: '下移' },
      { value: 'MACD_TOP_DIVERGENCE', label: '顶背离' },
      { value: 'MACD_BEARISH_ARRANGE', label: '空头排列' },
    ],
  },
  {
    type: 'KDJ',
    label: 'KDJ',
    sellSignals: [
      { value: 'KDJ_DEAD_CROSS', label: '死叉' },
      { value: 'KDJ_OVERBOUGHT', label: '超买', params: [{ name: 'threshold', label: '阈值', default: 80 }] },
      { value: 'KDJ_TOP_DIVERGENCE', label: '顶背离' },
      { value: 'KDJ_TURN_DOWN', label: '拐头向下' },
      { value: 'KDJ_BEARISH_ARRANGE', label: '空头排列' },
    ],
  },
  {
    type: 'BOLL',
    label: '布林带',
    sellSignals: [
      { value: 'BOLL_OPEN_SHRINK', label: '开口缩小' },
      { value: 'BOLL_BREAK_UPPER_DOWN', label: '跌破上轨' },
      { value: 'BOLL_BREAK_MIDDLE_DOWN', label: '跌破中轨' },
      { value: 'BOLL_BREAK_LOWER_DOWN', label: '跌破下轨' },
    ],
  },
  {
    type: 'RSI',
    label: 'RSI',
    sellSignals: [
      { value: 'RSI_DEAD_CROSS', label: '死叉' },
      { value: 'RSI_OVERBOUGHT', label: '超买', params: [{ name: 'threshold', label: '阈值', default: 70 }] },
      { value: 'RSI_CROSS_70_DOWN', label: '下破70' },
      { value: 'RSI_TURN_DOWN', label: '拐头向下' },
    ],
  },
  {
    type: 'BBI',
    label: 'BBI',
    sellSignals: [
      { value: 'BBI_PRICE_CROSS_DOWN', label: '价格下穿BBI' },
    ],
  },
  {
    type: 'CCI',
    label: 'CCI',
    sellSignals: [
      { value: 'CCI_ABOVE_100', label: '大于100' },
    ],
  },
  {
    type: 'MA',
    label: '均线',
    sellSignals: [
      { value: 'MA_PRICE_BELOW_MA5', label: '跌破MA5' },
      { value: 'MA_PRICE_BELOW_MA10', label: '跌破MA10' },
      { value: 'MA_PRICE_BELOW_MA20', label: '跌破MA20' },
      { value: 'MA_PRICE_BELOW_MA30', label: '跌破MA30' },
      { value: 'MA_PRICE_BELOW_MA60', label: '跌破MA60' },
      { value: 'MA_MA5_DEAD_CROSS_MA10', label: 'MA5死叉MA10' },
      { value: 'MA_MA5_DEAD_CROSS_MA20', label: 'MA5死叉MA20' },
      { value: 'MA_MA5_DEAD_CROSS_MA30', label: 'MA5死叉MA30' },
      { value: 'MA_MA3_DEAD_CROSS_MA15', label: 'MA3死叉MA15' },
      { value: 'MA_BEARISH_ARRANGE_5_10_20', label: '空头排列(5,10,20)' },
    ],
  },
  {
    type: 'CANDLE',
    label: 'K线形态',
    sellSignals: [
      { value: 'CANDLE_BIG_YIN', label: '大阴线' },
      { value: 'CANDLE_LONG_UPPER_SHADOW', label: '长上影线' },
      { value: 'CANDLE_SHOOTING_STAR', label: '射击之星' },
      { value: 'CANDLE_BEARISH_ENGULFING', label: '看跌吞没' },
      { value: 'CANDLE_EVENING_STAR', label: '黄昏之星' },
      { value: 'CANDLE_FOUR_CROWS', label: '四乌鸦' },
      { value: 'CANDLE_BAREFOOT_BEARISH', label: '光脚阴线' },
    ],
  },
]
