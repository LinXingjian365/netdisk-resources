<template>
  <div class="container contact">
    <h1 class="section-title">联系我们</h1>

    <div class="contact__grid">
      <section class="card contact__form">
        <el-form :model="form" :rules="rules" ref="formRef" label-position="top">
          <el-form-item label="姓名" prop="name">
            <el-input v-model="form.name" placeholder="您的称呼" />
          </el-form-item>

          <el-form-item label="邮箱" prop="email">
            <el-input v-model="form.email" placeholder="方便我们回复您" />
          </el-form-item>

          <el-form-item label="反馈类型" prop="type">
            <el-select v-model="form.type" placeholder="请选择">
              <el-option label="资源失效" value="broken" />
              <el-option label="投诉举报" value="report" />
              <el-option label="功能建议" value="feature" />
              <el-option label="商务合作" value="business" />
              <el-option label="其他" value="other" />
            </el-select>
          </el-form-item>

          <el-form-item label="内容" prop="message">
            <el-input
              v-model="form.message"
              type="textarea"
              :rows="5"
              maxlength="500"
              show-word-limit
              placeholder="请描述您的反馈…"
            />
          </el-form-item>

          <el-button type="primary" :loading="sending" @click="onSubmit">提交反馈</el-button>
        </el-form>
      </section>

      <aside class="card contact__info">
        <h3>其他联系方式</h3>
        <ul>
          <li><strong>邮箱：</strong>contact@aspire-edge.studio</li>
          <li><strong>GitHub：</strong>github.com/aspire-edge</li>
          <li><strong>网站：</strong>www.aspire-edge.studio</li>
        </ul>

        <el-divider />

        <h3>常见问题</h3>
        <dl>
          <dt>链接失效怎么办？</dt>
          <dd>请通过左侧表单提交反馈，我们会尽快补充或下架。</dd>

          <dt>如何发布资源？</dt>
          <dd>登录后在「个人中心 → 发布资源」填写信息即可提交。</dd>
        </dl>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'

const formRef = ref(null)
const sending = ref(false)

const form = reactive({
  name: '',
  email: '',
  type: '',
  message: ''
})

const rules = {
  name: [{ required: true, message: '请输入您的称呼', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }
  ],
  type: [{ required: true, message: '请选择反馈类型', trigger: 'change' }],
  message: [{ required: true, message: '请输入反馈内容', trigger: 'blur' }]
}

async function onSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  sending.value = true
  // 目前为前端演示：真实接入工单系统后可替换为接口调用
  setTimeout(() => {
    sending.value = false
    ElMessage.success('感谢反馈！我们已收到您的留言。')
    Object.assign(form, { name: '', email: '', type: '', message: '' })
    formRef.value?.resetFields()
  }, 600)
}
</script>

<style scoped>
.contact__grid {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 20px;
  align-items: start;
}

.contact__form,
.contact__info {
  padding: 22px;
}

.contact__info h3 {
  margin: 0 0 12px;
  font-size: 15px;
}

.contact__info ul {
  list-style: none;
  padding: 0;
  margin: 0 0 8px;
  font-size: 14px;
  color: var(--text-2);
}

.contact__info li {
  margin-bottom: 8px;
  word-break: break-all;
}

.contact__info dt {
  font-size: 14px;
  font-weight: 600;
  margin-top: 10px;
}

.contact__info dd {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-2);
}

@media (max-width: 860px) {
  .contact__grid {
    grid-template-columns: 1fr;
  }
}
</style>
