<script setup lang="ts">
const handleConfirm = () => {
  console.log("数据库文件下载");
  // 这里可以添加表单验证和提交逻辑
};
</script>

<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>数据设置</span>
      </div>
    </template>
    <el-button type="primary" @click="handleConfirm">数据库文件下载</el-button>
  </el-card>
</template>

<style scoped lang="scss"></style>
