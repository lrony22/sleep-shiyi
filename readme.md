# koishi-plugin-sleep-record

Koishi 睡眠记录插件，用于记录用户的睡眠情况并提供统计分析。

## 功能特点

- 自动识别"晚安"、"早安"等关键词记录睡眠和起床时间
- 计算睡眠时长并保存历史记录
- 提供个人睡眠数据查询和统计分析
- 支持日、周、月睡眠时长排行榜

## 安装方法

1. 在 Koishi 应用中安装此插件：npm install koishi-plugin-sleep-record
2. 在 Koishi 配置文件中启用插件：module.exports = {
  plugins: {
    'sleep-record': {
      // 可选配置，指定数据库文件路径
      // databasePath: 'sleep-record.db'
    }
  }
}
## 使用说明

- **记录入睡**：发送"晚安"、"睡觉"、"睡了"等关键词
- **记录起床**：发送"早安"、"早上好"、"早"等关键词
- **查看排行榜**：发送「sleep.rank  [-top 条数]」
   - 类型：day=今日，week=本周（默认），month=本月
   - 示例：sleep.rank day / sleep.rank week -top 5
- **查看个人记录**：发送"我的睡眠"、"睡眠记录"等
- **查看帮助**：发送"sleep.help"

## 许可证

MIT
    