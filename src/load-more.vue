<template>
  <div class="LoadMore">
    <div
      class="LoadMore-text"
      @click="$emit('click')"
    >
      Show More
    </div>
  </div>
</template>

<script>
export default {
  name: 'LoadMore'
}
</script>

<style lang="less" scoped>
// TODO: Add themeing to the button
.LoadMore {
  padding-top: 30px;
  padding-bottom: 30px;
  margin-left: 30px;
  font-size: 16px;

  .LoadMore-text {
    cursor: pointer;
    text-align: center;
    border: 1px solid #2396f2;
    border-radius: 3px;
    background-color: #2396f2;
    color: #212529;

    &:hover {
      background: #43a5f4;
      color: #212529;
      border-color: #43a5f4;
    }

    transition: background-color .2s,color .2s,border-color .2s,box-shadow .2s;
  }
}
</style>