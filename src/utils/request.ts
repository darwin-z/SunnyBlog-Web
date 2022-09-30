import axios from 'axios'
import store from '@/store/index'
import { start, close } from '@/utils/progress'
import { ElMessage } from 'element-plus'

//创建axios实例
const service = axios.create({
    baseURL: process.env.VUE_APP_BASE_API, //api网关
    timeout: 100000 //请求超时时间10s
})

//request拦截器
service.interceptors.request.use(config => {
    start()
    //让每一个请求都带上jwt
    if (store.getters['identity/token']) {
        if (config && config.headers) {
            config.headers['Authorization'] = `Bearer ${store.getters['identity/token']}`
        }
    }

    return config
}, error => {
    console.log(error)
    Promise.reject(error)
})

//response拦截器
service.interceptors.response.use(
    response => {
        const res = response.data
        if (response.status !== 200) {
            ElMessage({
                message: res.message,
                type: 'error'
            })
            return Promise.reject('error')
        }
        close()
        return response.data
    },
    error => {
        if (error.message == "Request failed with status code 401") {
            ElMessage.warning({
                dangerouslyUseHTMLString: true,
                message: `登录信息已过期 请重新<a style="color: skyblue" href="/identity/login?immediate=true" target="_blank">登录</a>`,
            })
        }
        else if (error.message == "Request failed with status code 403") {
            ElMessage({
                message: '您没有权限',
                type: 'warning',
            })
        }
        else if (error.message != "Request failed with status code 400") {
            ElMessage({
                message: '系统异常，请稍候再试。异常详情：' + error.message,
                type: 'error',
            })
        }
        close()
        return Promise.reject(error)
    }
)

export default service