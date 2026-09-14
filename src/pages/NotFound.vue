<template>
  <div class="nf">
    <div class="nf__inner">
      <h1 class="nf__code gradient-text">404</h1>
      <p class="nf__text">抱歉，您访问的页面不存在或已被移除。</p>

      <div class="nf__ops">
        <el-button type="primary" @click="$router.push({ name: 'home' })">
          返回首页
        </el-button>
        <el-button @click="$router.back()">返回上一页</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nf {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  padding: 40px 20px;
}

.nf__code {
  font-size: 84px;
  font-weight: 800;
  margin: 0;
  line-height: 1;
}

.nf__text {
  color: var(--text-2);
  margin: 14px 0 24px;
}

.nf__ops {
  display: flex;
  gap: 12px;
  justify-content: center;
}
</style>
