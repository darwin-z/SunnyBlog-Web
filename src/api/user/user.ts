import request from '@/utils/request'
import { User, ForgetPassword } from '@/interface/user/user'
import { SearchCondidtion } from '@/interface/common/search-condition'

export function listUser(pageIndex?: number | 1, pageSize?: number | 10, condition?: Array<SearchCondidtion>) {
    return request({
        url: "/user-service/user/list",
        method: "get",
        params: {
            pageIndex: pageIndex,
            pageSize: pageSize,
            condition: JSON.stringify(condition)
        }
    })
}

//根据Id获取用户
export function getUser(uid: number) {
    return request({
        url: '/user-service/user/getuser',
        method: 'get',
        params: {
            uid: uid
        }
    })
}

//获取当前登录者的详细信息
export function getLoginInfo() {
    return request({
        url: '/user-service/user/logininfo',
        method: 'get'
    })
}

//更新用户的信息
export function updateUserInfo(user: User) {
    return request({
        url: '/user-service/user/updateInfo',
        method: 'put',
        data: user
    })
}

//修改密码
export function forgetPassword(forget: ForgetPassword) {
    return request({
        url: '/user-service/user/forgetPassword',
        method: 'post',
        data: forget
    })
}

//重置用户封面
export function resetCover() {
    return request({
        url: "/user-service/user/resetCover",
        method: 'put'
    })
}