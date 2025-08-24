import { Context, Schema, Session, Tables, $ } from 'koishi'
import dayjs from 'dayjs'
import zhCN from './locales/zh-CN'

// -------------------------- 1. 类型定义 --------------------------
export interface SleepRecord {
  id: number          // 自增主键
  uid: number         // 关联用户ID
  sleepTime: string   // 入睡时间（ISO字符串）
  wakeTime?: string   // 起床时间（ISO字符串）
  duration?: number   // 睡眠时长（分钟）
  date: string        // 记录日期（YYYY-MM-DD）
}

// 扩展 Koishi 内置类型
declare module 'koishi' {
  interface User {
    sleepTotal: number          // 累计睡眠时长
    sleepCount: number          // 记录总次数
    eveningCount: number        // 当日晚安次数
    lastSleepId?: number        // 最后记录ID
  }

  interface Tables {
    sleep_record: SleepRecord   // 关联表
  }
}

// -------------------------- 2. 插件配置 --------------------------
export interface SleepRecordConfig {
  tablePrefix: string          // 表前缀
  morningSpan: [number, number]// 早安时段
  eveningSpan: [number, number]// 晚安时段
  manyEveningThreshold: number // 重复提示阈值
}

export const name = 'sleep-record'
export const inject = {
  required: ['database'],
  optional: ['i18n']
}

export const Config = Schema.object({
  tablePrefix: Schema.string().default('sleep_').description('表前缀'),
  morningSpan: Schema.tuple([
    Schema.number().min(0).max(23).default(6),
    Schema.number().min(0).max(23).default(12)
  ]).description('早安时段'),
  eveningSpan: Schema.tuple([
    Schema.number().min(0).max(23).default(21),
    Schema.number().min(0).max(23).default(3)
  ]).description('晚安时段'),
  manyEveningThreshold: Schema.number().min(2).max(10).default(3).description('重复阈值')
})

// -------------------------- 3. 工具函数 --------------------------
const sleepRecordTableName = 'sleep_record'

/** 检查时段 */
function isInSpan(hour: number, span: [number, number]): boolean {
  const [start, end] = span
  return start <= end ? (hour >= start && hour <= end) : (hour >= start || hour <= end)
}

/** 计算睡眠时长 */
function calcSleepDuration(sleepTime: string, wakeTime: Date): number {
  const sleepMs = new Date(sleepTime).getTime()
  const wakeMs = wakeTime.getTime()
  const durationMs = wakeMs >= sleepMs ? wakeMs - sleepMs : wakeMs + 24 * 60 * 60 * 1000 - sleepMs
  return Math.round(durationMs / 60000)
}

// -------------------------- 4. 数据库模型定义（最终运行时兼容版） --------------------------
function initModels(ctx: Context, config: SleepRecordConfig) {
  // 扩展 User 表（无问题）
  ctx.model.extend('user', {
    sleepTotal: { type: 'integer', initial: 0 },
    sleepCount: { type: 'integer', initial: 0 },
    eveningCount: { type: 'integer', initial: 0 },
    lastSleepId: { type: 'unsigned', nullable: true }
  })

  // 定义睡眠记录表（关键修复：索引为纯字段名数组，无任何对象）
  ctx.model.extend(sleepRecordTableName, {
    id: { type: 'unsigned' },                          // 主键（数据库自动自增）
    uid: { type: 'unsigned', nullable: false },         // 关联用户ID（无索引配置）
    sleepTime: { type: 'string', nullable: false },     // 入睡时间：string（非datetime）
    wakeTime: { type: 'string', nullable: true },       // 起床时间：string
    duration: { type: 'integer', nullable: true },      // 时长：integer
    date: { type: 'string', nullable: false }           // 日期：string
  }, {
    primary: 'id',                                      // 声明主键（仅支持字符串，指定字段名）
    indexes: [                                          // 最终修复：索引为纯字段名数组（无对象）
      ['uid'],                                          // 单字段索引：仅字段名
      ['date'],                                          // 单字段索引
      ['uid', 'date']                                   // 联合索引：多字段名数组
    ]
  })

  ctx.logger.info(`sleep-record: 模型初始化完成（${sleepRecordTableName} 表创建）`)
}

// -------------------------- 5. 核心功能实现（确保无datetime） --------------------------
function registerFeatures(ctx: Context, config: SleepRecordConfig) {
  const { manyEveningThreshold } = config

  // 功能1：晚安记录（存储ISO字符串）
  ctx.middleware(async (session: Session, next) => {
    const content = session.content?.trim().toLowerCase()
    const now = new Date()
    const nowHour = now.getHours()
    const today = dayjs(now).format('YYYY-MM-DD')
    const eveningKeywords = ['睡觉', '晚安', '睡了', '休息', '我要睡了']

    if (!content || !eveningKeywords.some(key => content.includes(key)) || !isInSpan(nowHour, config.eveningSpan) || !session.userId) {
      return next()
    }

    const uid = Number(session.userId)
    const userList = await ctx.database.get('user', { id: uid })

    if (!userList.length) {
      await ctx.database.create('user', { id: uid, name: session.author?.nickname || `用户${uid}` })
      return `🌙 晚安！已记录入睡时间：${dayjs(now).format('HH:mm')}`
    }

    const user = userList[0]
    const newEveningCount = (user.eveningCount || 0) + 1
    const existingRecords = await ctx.database.get(sleepRecordTableName as keyof Tables, (row: SleepRecord) =>
      $.and($.eq(row.uid, uid), $.eq(row.date, today), $.eq(row.wakeTime, null))
    )

    if (existingRecords.length > 0) {
      const sleepTimeStr = dayjs((existingRecords[0] as SleepRecord).sleepTime).format('HH:mm')
      return `⚠️  你今天已记录入睡时间：${sleepTimeStr}`
    }

    // 存储ISO字符串（确保无datetime）
    const newRecord = await ctx.database.create(sleepRecordTableName as keyof Tables, {
      uid,
      sleepTime: now.toISOString(),
      date: today,
      wakeTime: null,
      duration: null
    }) as SleepRecord

    await ctx.database.set('user', { id: uid }, {
      eveningCount: newEveningCount,
      lastSleepId: newRecord.id
    })

    const timeStr = dayjs(now).format('HH:mm')
    return newEveningCount >= manyEveningThreshold 
      ? `😱 你已说${newEveningCount}次晚安！快睡觉吧～`
      : `🌙 晚安！已记录入睡时间：${timeStr}`
  })

  // 功能2：早安记录（同上）
  ctx.middleware(async (session: Session, next) => {
    const content = session.content?.trim().toLowerCase()
    const now = new Date()
    const nowHour = now.getHours()
    const morningKeywords = ['早安', '早上好', '早', '我醒了', '起床了']

    if (!content || !morningKeywords.some(key => content.includes(key)) || !isInSpan(nowHour, config.morningSpan) || !session.userId) {
      return next()
    }

    const uid = Number(session.userId)
    const userList = await ctx.database.get('user', { id: uid })

    if (!userList.length || !userList[0].lastSleepId) {
      return '❌ 未找到你的入睡记录～睡前说「晚安」吧'
    }

    const user = userList[0]
    const lastSleepId = user.lastSleepId
    const sleepRecordList = await ctx.database.get(sleepRecordTableName as keyof Tables, (row: SleepRecord) =>
      $.and($.eq(row.id, lastSleepId), $.eq(row.uid, uid), $.eq(row.wakeTime, null))
    ) as SleepRecord[]

    if (!sleepRecordList.length) {
      return '❌ 未找到你的入睡记录～'
    }

    const sleepRecord = sleepRecordList[0]
    const duration = calcSleepDuration(sleepRecord.sleepTime, now)
    await ctx.database.set(sleepRecordTableName as keyof Tables, (row: SleepRecord) =>
      $.eq(row.id, lastSleepId), {
      wakeTime: now.toISOString(),
      duration
    })

    const newSleepTotal = (user.sleepTotal || 0) + duration
    const newSleepCount = (user.sleepCount || 0) + 1
    await ctx.database.set('user', { id: uid }, {
      sleepTotal: newSleepTotal,
      sleepCount: newSleepCount,
      eveningCount: 0,
      lastSleepId: null
    })

    const sleepTimeStr = dayjs(sleepRecord.sleepTime).format('HH:mm')
    const wakeTimeStr = dayjs(now).format('HH:mm')
    const durationText = `${Math.floor(duration / 60)}小时${duration % 60}分钟`
    return `☀️  早上好！睡眠时长：${durationText}（${sleepTimeStr}→${wakeTimeStr}）`
  })

  // 功能3：睡眠排行榜
  ctx.middleware(async (session: Session, next) => {
    const content = session.content?.trim()
    if (!content || !['睡眠排行榜', '作息排行榜', '谁最能睡'].some(key => content.includes(key)) || !session.userId) {
      return next()
    }

    let [startDate, endDate, timeType] = [
      dayjs().subtract(1, 'week').format('YYYY-MM-DD'),
      dayjs().format('YYYY-MM-DD'),
      'weekly'
    ]
    if (content.includes('日') || content.includes('天')) {
      startDate = endDate
      timeType = 'daily'
    } else if (content.includes('月')) {
      startDate = dayjs().subtract(1, 'month').format('YYYY-MM-DD')
      timeType = 'monthly'
    }

    const records = await ctx.database.get(sleepRecordTableName as keyof Tables, (row: SleepRecord) =>
      $.and($.ne(row.duration, null), $.gte(row.date, startDate), $.lte(row.date, endDate))
    ) as SleepRecord[]

    if (!records.length) {
      return '⚠️  暂无足够数据生成排行榜～'
    }

    const userIds = Array.from(new Set(records.map(record => record.uid)))
    const userList = await ctx.database.get('user', { id: userIds })
    const userMap = new Map<number, string>()
    userList.forEach(user => userMap.set(user.id, user.name))

    const userStats: Record<number, { total: number; count: number; name: string }> = {}
    records.forEach(record => {
      const uid = record.uid
      const userName = userMap.get(uid) || `用户${uid.toString().slice(-4)}`
      if (!userStats[uid]) userStats[uid] = { total: 0, count: 0, name: userName }
      userStats[uid].total += record.duration!
      userStats[uid].count += 1
    })

    const sortedStats = Object.values(userStats).sort((a, b) => b.total - a.total).slice(0, 10)
    let rankText = timeType === 'daily' 
      ? `🏆 ${startDate} 睡眠时长排行榜（TOP10）：`
      : timeType === 'monthly' 
        ? '🏆 本月睡眠时长排行榜（TOP10）：'
        : '🏆 本周睡眠时长排行榜（TOP10）：'

    sortedStats.forEach((stat, index) => {
      const total = `${Math.floor(stat.total / 60)}小时${stat.total % 60}分钟`
      const avg = `${Math.floor((stat.total / stat.count) / 60)}小时${Math.floor((stat.total / stat.count) % 60)}分钟`
      rankText += `\n${index + 1}. ${stat.name} - 总时长：${total}（平均：${avg}）`
    })

    return rankText.trim()
  })

  // 功能4：个人睡眠记录查询
  ctx.middleware(async (session: Session, next) => {
    const content = session.content?.trim()
    if (!content || !['我的睡眠', '睡眠记录', '我睡了多久'].some(key => content.includes(key)) || !session.userId) {
      return next()
    }

    const uid = Number(session.userId)
    const sevenDaysAgo = dayjs().subtract(7, 'day').format('YYYY-MM-DD')
    const today = dayjs().format('YYYY-MM-DD')

    const records = await ctx.database.get(sleepRecordTableName as keyof Tables, (row: SleepRecord) =>
      $.and($.eq(row.uid, uid), $.gte(row.date, sevenDaysAgo), $.lte(row.date, today))
    , { sort: { date: 'desc' } }) as SleepRecord[]

    if (!records.length) {
      return '❌ 你还没有睡眠记录～开始记录吧！'
    }

    let recordText = `📊 你的近${records.length}天睡眠记录：`
    let totalDuration = 0
    let completedCount = 0

    records.forEach(record => {
      const dateStr = dayjs(record.date).format('MM-DD')
      const sleepTimeStr = dayjs(record.sleepTime).format('HH:mm')
      const wakeTimeStr = record.wakeTime ? dayjs(record.wakeTime).format('HH:mm') : '未记录'
      const durationText = record.duration 
        ? `${Math.floor(record.duration / 60)}小时${record.duration % 60}分钟` 
        : '未完成'

      recordText += `\n${dateStr}：入睡${sleepTimeStr} → 起床${wakeTimeStr}（时长：${durationText}）`

      if (record.duration) {
        totalDuration += record.duration
        completedCount += 1
      }
    })

    if (completedCount > 0) {
      const avg = Math.round(totalDuration / completedCount)
      const avgText = `${Math.floor(avg / 60)}小时${avg % 60}分钟`
      recordText += `\n📈 统计：平均睡眠时长 ${avgText}（共${completedCount}次记录）`

      const avgSleepHour = records
        .map(r => dayjs(r.sleepTime).hour() + dayjs(r.sleepTime).minute() / 60)
        .reduce((sum, h) => sum + h, 0) / records.length

      recordText += avgSleepHour < 22 
        ? '\n✅ 你的作息很规律，继续保持！'
        : avgSleepHour < 24 
          ? '\n⚠️  你经常晚睡，注意早点休息～'
          : '\n❌ 你最近熬夜较多，要保重身体！'
    }

    return recordText
  })

  // 功能5：帮助指令
  ctx.command('sleep.help', '查看睡眠记录插件帮助')
    .action(() => `
📋 睡眠记录插件使用指南
1. 记录入睡：发送「晚安」「睡觉」「睡了」「休息」「我要睡了」
2. 记录起床：发送「早安」「早上好」「早」「我醒了」「起床了」
3. 查看排行：发送「睡眠排行榜」（支持日/周/月，如“今日睡眠排行榜”）
4. 我的记录：发送「我的睡眠」「睡眠记录」「我睡了多久」
5. 帮助指令：发送「sleep.help」打开本指南
    `.trim())
}

// -------------------------- 6. 插件入口 --------------------------
export function apply(ctx: Context, config: SleepRecordConfig) {
  if (ctx.i18n) {
    ctx.i18n.define('zh-CN', zhCN)
    ctx.logger.info('sleep-record: 已加载中文语言包')
  }

  initModels(ctx, config)
  registerFeatures(ctx, config)
  ctx.logger.info('sleep-record: 已成功加载！支持记录睡眠作息～')
}