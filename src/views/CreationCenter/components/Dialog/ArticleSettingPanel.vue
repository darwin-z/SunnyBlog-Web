<template>
    <el-form :rules="rules" ref="formRef" :model="article" label-width="80px">
        <el-form-item label="封面" prop="photo">
            <el-upload class="avatar-uploader" :show-file-list="false" :auto-upload="false" :on-change="previewPhoto" name="data">
                <el-image style="min-width: 200px; height: 150px; max-width: 100%; max-height: 100%; display: block" fit="scale-down" ref="photoRef" :src="article.photo">
                    <template #placeholder>
                        <el-skeleton-item variant="image" style="width: 100%; height: 100%" />
                    </template>
                    <template #error>
                        <el-skeleton-item variant="image" style="width: 100%; height: 100%" />
                    </template>
                </el-image>
            </el-upload>
        </el-form-item>
        <el-form-item label="标题" required prop="title">
            <el-input v-model="article.title" />
        </el-form-item>
        <el-form-item label="摘要" prop="summary">
            <el-input v-model="article.summary" type="textarea" />
        </el-form-item>
        <el-form-item label="标签" prop="tags" class="select">
            <el-select v-model="article.tags" multiple class="tag-select" filterable>
                <el-option v-for="tag in tags" :key="tag.id" :value="tag.id" :label="tag.name" :style="`color:${tag.color}`" />
            </el-select>
            <el-button class="add-tag-btn" @click="tagDialogVisible = true">标签管理</el-button>
        </el-form-item>
        <el-form-item label="目录" prop="categoryId">
            <el-tree-select
                v-model="article.categoryId"
                :data="categorys"
                node-key="id"
                :props="{
                    label: 'name',
                    children: 'inverseParent',
                }"
                clearable
                filterable
                check-strictly
                :render-after-expand="false"
            />
        </el-form-item>
        <el-form-item label="分区" prop="regionId">
            <el-tree-select
                v-model="article.regionId"
                :data="regions"
                node-key="id"
                :props="{
                    label: 'name',
                    children: 'inverseParent',
                }"
                clearable
                filterable
                check-strictly
                :render-after-expand="false"
            />
        </el-form-item>
        <el-form-item required label="状态" prop="status">
            <el-radio-group v-model="article.status">
                <el-radio-button :label="4">草稿</el-radio-button>
                <el-radio-button :label="1">发布</el-radio-button>
                <el-radio-button :label="2">私有</el-radio-button>
            </el-radio-group>
        </el-form-item>
        <el-form-item required label="评论策略" prop="commentStatus">
            <el-radio-group v-model="article.commentStatus">
                <el-radio-button :label="1">允许评论</el-radio-button>
                <el-radio-button :label="-1">禁止评论</el-radio-button>
                <el-radio-button :label="2">需要审核</el-radio-button>
            </el-radio-group>
        </el-form-item>
        <div class="submit">
            <el-button type="primary" :loading="loading" @click="saveArticle(formRef)">提交</el-button>
        </div>
    </el-form>
    <!-- 标签管理对话框 -->
    <el-dialog width="70%" align-center v-model="tagDialogVisible" v-if="tagDialogVisible" title="标签管理">
        <TagManager @updateTag="updateTag" />
    </el-dialog>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, reactive, ref } from "vue"
import { useRouter } from "vue-router"
import { ElMessage, UploadFile } from "element-plus"
import type { FormRules, FormInstance } from "element-plus"
import TagManager from "./TagManager.vue"
// 接口
import { Article } from "@/interface/article/article"
import { Region } from "@/interface/article/region"
import { Category } from "@/interface/article/category"
import { Tag } from "@/interface/article/tag"
import { Response, UploadResult } from "@/interface/common/response"
// api
import { updateArticle, publishArticle } from "@/api/article/article"
import { uploadPicture } from "@/api/article/drawing-bed"
import { listRegion } from "@/api/article/region"
import { listCategory } from "@/api/article/category"
import { listMyTag } from "@/api/article/tag"
import { getImgUrl } from "@/utils/converter"

const router = useRouter()
const props = defineProps<{
    article: Article
    isEdit: boolean
}>()
const emits = defineEmits<{
    (event: "closeDialog"): void
    (event: "updateState", article: Article): void
    (event: "resetState"): void
}>()

//添加标签对话框
const tagDialogVisible = ref(false)

//表单数据
const article = ref<Article>(props.article ?? {})
const categorys = ref<Array<Category>>([]) //所有目录
const regions = ref<Array<Region>>([]) //所有分区信息
const tags = ref<Array<Tag>>([]) //所有标签
const loading = ref(false)
const formRef = ref<FormInstance>()
const photoData = ref<FormData>(new FormData()) //待上传的图片数据

//表单验证规则
const rules = reactive<FormRules>({
    title: [
        {
            required: true,
            trigger: "blur",
            message: "文章标题不能为空",
        },
    ],
})
const instance = getCurrentInstance()

//上传预览图片
function previewPhoto(file: UploadFile) {
    if (["image/jpeg", "image/png", "image/gif", "image/bmp", "image/ico"].indexOf(file.raw?.type) === -1) {
        ElMessage.warning("图片格式错误：只能为：png、jpeg、gif、bmp、ico")
        return false
    }
    photoData.value = new FormData()
    photoData.value.append("data", file.raw)
    article.value.photo = URL.createObjectURL(file.raw)
}
//提交用户信息
function saveArticle(form: FormInstance) {
    loading.value = true
    //如果上传了封面,先调用上传封面接口上传封面
    if (photoData.value.get("data")) {
        if (props.isEdit) {
            uploadPicture(photoData.value, article.value.id, article.value.userId)
                .then((data: Response<UploadResult>) => {
                    if (data.status !== 200) {
                        ElMessage.warning("图片上传失败")
                        return false
                    }
                    article.value.photo = getImgUrl("article-service", data.result.path)
                })
                .then(() => {
                    save(form)
                })
        } else {
            //添加模式匿名上传封面
            uploadPicture(photoData.value)
                .then((data: Response<UploadResult>) => {
                    if (data.status !== 200) {
                        ElMessage.warning("图片上传失败")
                        return false
                    }
                    article.value.photo = getImgUrl("article-service", data.result.path)
                })
                .then(() => {
                    save(form)
                })
        }
    } else {
        save(form)
    }
}
//保存文章信息
async function save(form: FormInstance) {
    if (!form) return
    await form.validate((valid, fields) => {
        if (valid) {
            if (props.isEdit) {
                //编辑模式更新文章
                updateArticle(article.value).then((data: Response<string>) => {
                    if (data.status !== 200) {
                        ElMessage.warning(data.message)
                    } else {
                        ElMessage.success("操作成功")
                        //更新目录节点
                        instance?.proxy?.$bus.emit("updateArticleNode", article.value)
                        emits("resetState")
                        setTimeout(() => {
                            emits("closeDialog")
                            emits("updateState")
                        }, 1000)
                    }
                    loading.value = false
                })
            } else {
                //添加模式发布文章
                publishArticle(article.value).then((data: Response<string>) => {
                    if (data.status === 200) {
                        ElMessage.success("发布成功")
                        article.value.id = data.result //获取返回的id
                        //更新目录节点
                        instance?.proxy?.$bus.emit("newArticle", { article: article.value })
                        //编辑文章已保存
                        router.replace({
                            query: {
                                articleId: data.result,
                                isEdit: 1,
                            },
                        })
                        emits("resetState")
                        emits("closeDialog")
                    } else {
                        ElMessage.warning(data.message)
                    }
                    loading.value = false
                })
            }
        } else {
            loading.value = false
            return false
        }
    })
}

//获取所有目录
function getCategory() {
    listCategory().then((data: Response<Array<Region>>) => {
        if (data.status === 200) {
            categorys.value = data.result
        } else {
            ElMessage.warning("信息获取失败")
        }
    })
}
//获取所有分区
function getRegions() {
    listRegion().then((data: Response<Array<Region>>) => {
        if (data.status === 200) {
            regions.value = data.result
        } else {
            ElMessage.warning("信息获取失败")
        }
    })
}
//获取所有公共标签
function getTag() {
    listMyTag().then((data: Response<Array<Tag>>) => {
        if (data.status === 200) {
            data.result.forEach((item) => {
                if (tags.value.findIndex((i) => i.id == item.id) == -1) {
                    tags.value.unshift(item)
                }
            })
        }
    })
}
//更新标签数据
function updateTag(ts: Array<Tag>) {
    tags.value = ts
}

getCategory()
getRegions()
getTag()
if (props.isEdit) {
    article.value.categoryId = article.value.categoryId === 0 ? null : article.value.categoryId
    article.value.regionId = article.value.regionId === 0 ? null : article.value.regionId
} else {
    article.value.status = 4
    article.value.commentStatus = 1
    article.value.isLock = 1
}
</script>

<style scoped>
.submit {
    display: flex;
    justify-content: flex-end;
}
.select {
    display: flex;
    flex-direction: row;
}
.tag-select {
    width: 100%;
}
.select >>> .el-form-item__content {
    flex-wrap: nowrap;
}
.add-tag-btn {
    margin: 5px;
}
</style>
