<template>
  <div class="user" @click="onClick" :class="{ selected: selected }">
    <div class="description">
      <div class="name">
        {{ user.username }} {{ user.self ? " (yourself)" : "" }}
      </div>
      <div class="status">
        <status-icon :connected="user.connected" />{{ status }}
      </div>
    </div>
    <div v-if="user.unreadCount" class="new-messages">{{ user.unreadCount }}</div>
  </div>
</template>

<script>
import StatusIcon from "./StatusIcon";
export default {
  name: "User",
  components: { StatusIcon },
  props: {
    user: Object,
    selected: Boolean,
  },
  methods: {
    onClick() {
      this.$emit("select");
    },
  },
  computed: {
    status() {
      return this.user.connected ? "online" : "offline";
    },
  },
};
</script>

<style scoped>
.selected {
  background-color: #1164a3;
}

.user {
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.description {
  display: inline-block;
  min-width: 0;
}

.status {
  color: #92959e;
}

.new-messages {
  color: white;
  background-color: red;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  text-align: center;
  line-height: 20px;
  margin-left: 12px;
  font-size: 12px;
  font-weight: bold;
}
</style>
