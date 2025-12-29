import axios from 'axios'

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
  timeout: 120000, // 增加到120秒，用于数据下载等耗时操作
})

export default api
