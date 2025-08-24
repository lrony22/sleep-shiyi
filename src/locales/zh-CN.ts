// 中文语言包（配合 @koishijs/plugin-i18n 使用）
export default {
  sleep: {
    help: `
📋 睡眠记录插件使用指南
1. 记录入睡：发送「晚安」「睡觉」「睡了」「休息」「我要睡了」
2. 记录起床：发送「早安」「早上好」「早」「我醒了」「起床了」
3. 查看排行：发送「睡眠排行榜」「作息排行榜」「谁最能睡」（支持日/周/月）
4. 我的记录：发送「我的睡眠」「睡眠记录」「我睡了多久」
5. 帮助指令：发送「sleep.help」打开本指南
    `.trim(),

    evening: {
      success: '🌙 晚安！已记录你的入睡时间为 {time}。祝你好梦～',
      repeat: '⚠️  你今天已经记录过入睡时间啦～上次记录：{time}',
      manyRepeat: '😱 你今天已经说了 {count} 次晚安啦！快睡觉吧～'
    },

    morning: {
      success: '☀️ 早上好！本次睡眠时长：{duration}，入睡：{sleepTime} → 起床：{wakeTime}',
      noSleepRecord: '❌ 未找到你的入睡记录～睡前记得说「晚安」哦',
      firstMorning: '☀️ 早安！这是你第一次记录起床时间，继续保持呀～'
    },

    rank: {
      daily: '🏆 {date} 睡眠时长排行榜（TOP10）：',
      weekly: '🏆 本周睡眠时长排行榜（TOP10）：',
      monthly: '🏆 本月睡眠时长排行榜（TOP10）：',
      empty: '⚠️  暂无足够睡眠数据生成排行榜～',
      item: '{rank}. {name} - {totalDuration}（平均：{avgDuration}）'
    },

    personal: {
      title: '📊 你的近 {days} 天睡眠记录：',
      item: '{date}：入睡{sleepTime} → 起床{wakeTime}，时长{duration}',
      empty: '❌ 你还没有任何睡眠记录～开始记录吧！',
      stats: '\n📈 统计：平均睡眠时长 {avgDuration}，共 {count} 次记录',
      regular: '✅ 你的作息很规律，继续保持！',
      lateSleep: '⚠️  你经常晚睡哦，注意早点休息～',
      stayUp: '❌ 你最近熬夜较多，要注意身体健康！'
    }
  }
}