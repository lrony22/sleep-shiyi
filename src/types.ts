import { Context } from 'koishi'

// 插件配置类型
export interface SleepRecordConfig {
  tablePrefix: string          // 数据库表前缀
  morningSpan: [number, number]// 早安识别时间范围（24小时制，如 [6, 12]）
  eveningSpan: [number, number]// 晚安识别时间范围（如 [21, 3]，支持跨天）
  manyEveningThreshold: number // 重复晚安提示阈值（如 3 次）
}

// 扩展 Koishi Context 类型（添加插件自定义方法，可选）
declare module 'koishi' {
  interface Context {
    sleepRecord: {
      /** 计算睡眠时长（分钟） */
      calcDuration(sleepTime: string, wakeTime: Date): number
      /** 检查是否在早安时段 */
      isMorningHour(hour: number): boolean
      /** 检查是否在晚安时段 */
      isEveningHour(hour: number): boolean
    }
  }
}