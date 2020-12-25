<template>
  <div
    class="ReachedEnd"
  >
    <div class="ReachedEnd-container">
      <div class="ReachedEnd-line" />
      <span class="ReachedEnd-text">{{folderName}} Folder End</span>
      <div class="ReachedEnd-line" />
    </div>
  </div>
</template>

<script>
export default {
  name: 'ReachedEnd',
  props: {
    folderName: { type: String, required: true }
  }
}
</script>

<style lang="less" scoped>
// TODO: Add themeing to the button
.ReachedEnd {
  margin-left: 30px;
  padding-top: 10px;
  padding-bottom: 10px;

  .ReachedEnd-container {
    border-radius: 3px;
    color: #78909c;
    display: flex;
    font-size: 16px;

    .ReachedEnd-text {
      margin: 0 8px;
      font-size: 14px;
    }

    .ReachedEnd-line {
      border-top: 1px dashed #78909c;
      flex-grow: 1;
      height: 1px;
      align-self: center;
    }
  }
}
</style>