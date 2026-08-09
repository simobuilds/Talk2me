<template>
  <div class="panel">
    <div class="header">
      <status-icon :connected="user.connected" />{{ user.username }}
    </div>

    <ul ref="messageList" class="messages" @scroll="onMessagesScroll">
      <li
        v-for="(message, index) in user.messages"
        :key="index"
        class="message"
      >
        <div v-if="displaySender(message, index)" class="sender">
          {{ message.fromSelf ? ('You (' + (message.fromUsername || currentUsername) + ')') : (message.fromUsername || user.username) }}
          <span v-if="formatTimestamp(message)" class="message-time">{{ formatTimestamp(message) }}</span>
        </div>
        {{ message.content }}
      </li>
    </ul>

    <button
      v-if="showJumpToLatest"
      type="button"
      class="jump-to-latest"
      @click="jumpToLatest"
    >
      {{ pendingIncomingCount }} new {{ pendingIncomingCount === 1 ? 'message' : 'messages' }}
    </button>

    <form @submit.prevent="onSubmit" class="form">
      <div class="input-row">
        <textarea
          id="messageInput"
          ref="messageInput"
          name="message"
          v-model="input"
          placeholder="Your message..."
          class="input"
          @keydown.enter.exact.prevent="onSubmit"
          @keydown.shift.enter.exact.stop
        />
        <div class="composer-actions">
          <button type="button" class="emoji-toggle" @click="toggleEmojiPicker" aria-label="Choose emoji">😊</button>
          <button :disabled="!isValid" class="send-button">Send</button>
        </div>
      </div>
      <div v-if="showEmojiPicker" class="emoji-picker" role="dialog" aria-label="Emoji picker">
        <button
          v-for="emoji in emojiList"
          :key="emoji"
          type="button"
          class="emoji-option"
          @click="insertEmoji(emoji)"
        >
          {{ emoji }}
        </button>
      </div>
      <div v-if="user && user.self" class="self-note">You cannot message yourself from this tab.</div>
    </form>
  </div>
</template>

<script>
import StatusIcon from "./StatusIcon";
import socket from "../socket";

export default {
  name: "MessagePanel",
  components: {
    StatusIcon,
  },
  props: {
    user: Object,
  },
  data() {
    return {
      input: "",
      shouldAutoScroll: true,
      pendingIncomingCount: 0,
      showEmojiPicker: false,
      emojiList: ["😀", "😂", "😍", "😎", "🤔", "👍", "❤️", "🔥", "🎉", "🙏", "😢", "😮", "😄", "🥳"],
    };
  },
  methods: {
    onSubmit() {
      if (!this.isValid) {
        return;
      }
      this.showEmojiPicker = false;
      this.$emit("input", this.input);
      this.input = "";
    },
    toggleEmojiPicker() {
      this.showEmojiPicker = !this.showEmojiPicker;
      this.$nextTick(() => {
        if (this.$refs.messageInput) {
          this.$refs.messageInput.focus();
        }
      });
    },
    insertEmoji(emoji) {
      this.input = `${this.input || ""}${emoji}`;
      this.showEmojiPicker = false;
      this.$nextTick(() => {
        if (this.$refs.messageInput) {
          this.$refs.messageInput.focus();
        }
      });
    },
    displaySender(message, index) {
      return (
        index === 0 ||
        this.user.messages[index - 1].fromSelf !==
          this.user.messages[index].fromSelf
      );
    },
    formatTimestamp(message) {
      if (!message.createdAt) {
        return "";
      }

      const date = new Date(message.createdAt);
      if (Number.isNaN(date.getTime())) {
        return "";
      }

      return new Intl.DateTimeFormat([], {
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    },
    isNearBottom() {
      const messageList = this.$refs.messageList;
      if (!messageList) {
        return true;
      }

      const threshold = 48;
      const distanceFromBottom =
        messageList.scrollHeight -
        messageList.scrollTop -
        messageList.clientHeight;

      return distanceFromBottom <= threshold;
    },
    onMessagesScroll() {
      this.shouldAutoScroll = this.isNearBottom();
      if (this.shouldAutoScroll) {
        this.pendingIncomingCount = 0;
      }
    },
    scrollToLatest(force = false) {
      this.$nextTick(() => {
        const messageList = this.$refs.messageList;
        if (!messageList) {
          return;
        }

        if (!force && !this.shouldAutoScroll) {
          return;
        }

        messageList.scrollTop = messageList.scrollHeight;
        this.shouldAutoScroll = true;
        this.pendingIncomingCount = 0;
      });
    },
    jumpToLatest() {
      this.scrollToLatest(true);
    },
  },
  watch: {
    user() {
      this.shouldAutoScroll = true;
      this.pendingIncomingCount = 0;
      this.scrollToLatest(true);
    },
    "user.messages.length"() {
      const latestMessage = this.user.messages[this.user.messages.length - 1];

      if (!latestMessage) {
        return;
      }

      if (latestMessage.fromSelf) {
        this.scrollToLatest(true);
        return;
      }

      if (!this.shouldAutoScroll) {
        this.pendingIncomingCount += 1;
      }
      this.scrollToLatest();
    },
  },
  mounted() {
    this.scrollToLatest();
  },
  computed: {
    isValid() {
      return this.input.length > 0;
    },
    showJumpToLatest() {
      return !this.shouldAutoScroll && this.pendingIncomingCount > 0;
    },
    // current user's username for display when showing "You (username)"
    currentUsername() {
      return socket.username || sessionStorage.getItem("username") || "you";
    },
  },
};
</script>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.header {
  line-height: 40px;
  padding: 10px 20px;
  border-bottom: 1px solid #dddddd;
  flex: 0 0 auto;
}

.messages {
  margin: 0;
  padding: 20px;
  overflow-y: auto;
  flex: 1 1 auto;
}

.message {
  list-style: none;
  margin-bottom: 12px;
}

.sender {
  font-weight: bold;
  margin-top: 5px;
}

.message-time {
  color: #92959e;
  font-size: 12px;
  margin-left: 8px;
}

.form {
  padding: 10px;
  border-top: 1px solid #dddddd;
  flex: 0 0 auto;
}

.input-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.composer-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.emoji-toggle {
  border: 1px solid #d5d9e0;
  background: #f7f7fa;
  border-radius: 6px;
  padding: 8px 10px;
  cursor: pointer;
  font-size: 18px;
}

.emoji-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.emoji-option {
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 6px;
  padding: 6px 8px;
  cursor: pointer;
  font-size: 16px;
}

.jump-to-latest {
  align-self: center;
  margin-bottom: 10px;
  padding: 8px 14px;
  border: none;
  border-radius: 999px;
  background-color: #1164a3;
  color: white;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(17, 100, 163, 0.25);
}

.jump-to-latest:hover {
  background-color: #0d558a;
}

.input {
  flex: 1;
  min-height: 72px;
  resize: none;
  padding: 10px;
  line-height: 1.5;
  border-radius: 5px;
  border: 1px solid #000;
}

.send-button {
  vertical-align: top;
}
</style>
