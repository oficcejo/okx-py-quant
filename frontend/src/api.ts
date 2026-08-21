import axios from 'axios'

// 开发环境默认连接 127.0.0.1:8000；单容器生产环境默认使用同源相对路径
const baseURL = import.meta.env.VITE_API_BASE_URL !== undefined
  ? import.meta.env.VITE_API_BASE_URL
  : (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '')

const api = axios.create({
  baseURL,
  timeout: 120000, // 120秒超时，用于数据下载等耗时操作
})

export default api

