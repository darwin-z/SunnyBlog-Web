<template>
    <section class="login-form">
        <p class="switch-btn">
            <router-link to="/identity/forget" :replace="true" class="forget-btn">修改密码</router-link>
            <router-link to="/identity/register" :replace="true" class="register-btn">注册</router-link>
        </p>

        <el-form :model="loginData" :rules="rules" size="large" ref="loginForm" status-icon @keyup.enter="handleLogin(loginForm)">
            <el-form-item>
                <h3 style="width: 100%">
                    <svg-icon icon-class="sunny" />
                    SunnyBlog统一认证
                </h3>
                <el-radio-group v-model="loginData.client_id" size="small">
                    <el-radio-button label="password">密码登录</el-radio-button>
                    <el-radio-button label="vcode">验证登录</el-radio-button>
                </el-radio-group>
            </el-form-item>
            <el-form-item prop="username" required>
                <el-input class="input-box" v-model="loginData.username" :placeholder="usernamePlaceHolder" tabindex="1" min="6" max="20" autocomplete="on">
                    <template #[vSlot]>
                        <el-radio-group v-model="vcData.type" size="small" style="flex-wrap: nowrap; margin: 0px -10px 0px -10px">
                            <el-radio-button label="phone">手机号</el-radio-button>
                            <el-radio-button label="email">邮箱</el-radio-button>
                        </el-radio-group>
                    </template>
                </el-input>
            </el-form-item>
            <el-form-item prop="password" required>
                <el-input v-model="loginData.password" :placeholder="passwordPlaceHolder" tabindex="1" :type="passwordType" min="6" :max="20">
                    <template #[vSlot]>
                        <el-button @click="handleSend(loginForm)" :disabled="sendButton.IsDisable">{{ sendButton.buttonState }}</el-button>
                    </template>
                </el-input>
            </el-form-item>
            <el-button :loading="loading" type="primary" style="width: 100%; margin-bottom: 30px" @click="handleLogin(loginForm)">登录</el-button>
        </el-form>
    </section>
</template>

<script setup lang="ts">
import { useStore } from "vuex"
import { reactive, ref, watch } from "vue"
import { useRouter, useRoute } from "vue-router"
import { FormRules, FormInstance, ElMessage } from "element-plus"
//api
import { login } from "@/api/identity/login" //登录api
import { sendVerificationCode } from "@/api/identity/vcode" //验证码api
//接口
import { LoginPayload } from "@/interface/identity/login"
import { SendVCode } from "@/interface/identity/vcode"

const router = useRouter()
const route = useRoute()
const store = useStore()
//重定向路径
const redirect = ref()
//ui显示数据
const loading = ref(false)
const vSlot = ref("") // 验证登录append
const usernamePlaceHolder = ref("登录名/邮箱/手机号") //输入框用户提示
const passwordPlaceHolder = ref("密码") //输入框密码提示
const passwordType = ref("password")
//表单数据
const loginForm = ref<FormInstance>()
const loginData = reactive<LoginPayload>({
    client_id: "password",
    grant_type: "password",
    username: "",
    password: "",
})
const vcData = reactive<SendVCode>({
    type: "phone",
    receiver: "",
})
//验证码请求体
const sendButton = reactive({
    buttonState: "发送验证码",
    IsDisable: false,
    totalTime: 30,
    handle() {
        sendButton.IsDisable = true
        sendButton.buttonState = `${sendButton.totalTime}s后重新发送`
        let timer = setInterval(() => {
            sendButton.totalTime--
            sendButton.buttonState = `${sendButton.totalTime}s后重新发送`
            if (sendButton.totalTime < 0) {
                clearInterval(timer)
                sendButton.buttonState = "发送验证码"
                sendButton.totalTime = 30
                sendButton.IsDisable = false
            }
        }, 1000)
    },
})

//用户名自定义验证
function checkUsername(rule: unknown, value: string, callback: unknown) {
    //非空验证
    if (!value) {
        if (loginData.client_id === "password") {
            return callback(new Error("请输入登录名/邮箱/手机号"))
        } else {
            if (vcData.type === "phone") {
                return callback(new Error("请输入手机号"))
            } else {
                return callback(new Error("请输入邮箱"))
            }
        }
    } else {
        if (loginData.client_id === "password") {
            if (value.length < 5 || value.length > 20) {
                return callback(new Error("登录名长度为5~20个字符"))
            }
        } else {
            if (vcData.type === "phone" && !/^1[3|4|5|7|8|9]\d{9}$/.test(value)) {
                return callback(new Error("手机号格式错误"))
            }
            if (vcData.type === "email" && !/^\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/.test(value)) {
                return callback(new Error("邮箱格式错误"))
            }
        }
    }
    callback()
}
//密码自定义验证
function checkPassword(rule: unknown, value: string, callback: unknown) {
    if (!value) {
        if (loginData.client_id === "password") {
            return callback(new Error("请输入密码"))
        } else {
            return callback(new Error("请输入验证码"))
        }
    }
    callback()
}
//表单验证规则
const rules = reactive<FormRules>({
    username: [
        {
            validator: checkUsername,
            trigger: "blur",
        },
    ],
    password: [
        {
            validator: checkPassword,
            trigger: "blur",
        },
    ],
})

//监控路由重定向
watch(
    route,
    (routes) => {
        redirect.value = routes.query && routes.query.redirect
    },
    {
        immediate: true,
    }
)
//监视登录方式
watch(loginData, (newVal) => {
    if (newVal.client_id == "vcode") {
        vSlot.value = "append"
        usernamePlaceHolder.value = vcData.type === "phone" ? "手机号" : "邮箱"
        passwordPlaceHolder.value = "验证码"
        passwordType.value = "number"
    } else {
        vSlot.value = ""
        usernamePlaceHolder.value = "登录名/邮箱/手机号"
        passwordPlaceHolder.value = "密码"
        passwordType.value = "password"
    }
    vcData.receiver = newVal.username
})
watch(vcData, (newVal) => {
    usernamePlaceHolder.value = newVal.type === "phone" ? "手机号" : "邮箱"
})

//登录方法
async function handleLogin(form: FormInstance) {
    if (!form) return
    await form.validate((valid, fields) => {
        if (valid) {
            loading.value = true
            //调用登录api
            login(loginData)
                .then((data) => {
                    //存入token
                    store.dispatch("identity/login", data)
                    if (route.query["immediate"]) {
                        window.close()
                    } else {
                        router.push({ path: redirect.value || "/" })
                    }
                    loading.value = false
                })
                .catch((error) => {
                    ElMessage.warning(`鉴权失败`)
                    loading.value = false
                })
        } else {
            return false
        }
    })
}
//发送验证码方法
async function handleSend(form: FormInstance) {
    //发送验证码
    await form.validateField("username", (valid) => {
        if (valid) {
            sendButton.handle()
            //调用发送验证码api
            sendVerificationCode(vcData).then((data) => {
                if (data.status === 200) {
                    ElMessage.success("发送成功")
                } else {
                    ElMessage.warning(data.message)
                }
            })
        }
    })
}
</script>

<style scoped>
.login-form {
    width: 350px;
    padding: 30px 20px 10px 20px;
    border-radius: 10px;
    color: var(--el-color-white);
    background-color: var(--el-mask-color-extra-light);
    box-shadow: rgb(0 0 0 / 20%) 0 0 10px;
    -webkit-backdrop-filter: blur(10px);
    backdrop-filter: blur(10px);
    overflow: hidden;
    position: relative;
}
.switch-btn {
    position: absolute;
    top: 0;
    right: 0;
}
.forget-btn,
.register-btn {
    font-size: 0.3em;
    color: var(--el-color-white);
    background-color: var(--el-mask-color-extra-light);
    padding: 5px 15px 5px 15px;
    backdrop-filter: blur(20px);
    text-decoration: none;
}
.forget-btn {
    border-bottom-left-radius: 10px;
}
.forget-btn:hover,
.register-btn:hover {
    background-color: var(--el-mask-color);
}
</style>
