import { Context } from 'koishi'
import dayjs from 'dayjs'
import { apply, Config } from '../src/index'

// 测试配置
const testConfig: Config = {
  time: {
    morningStart: 6,
    morningEnd: 12,
    eveningStart: 21,
    eveningEnd: 3
  },
  tips: {
    manyEveningThreshold: 3,
    emptyRecord: '无记录',
    successEvening: '晚安成功',
    repeatEvening: '重复晚安',
    manyEvening: '多次晚安',
    dbError: '数据库错误',
    noUnfinished: '无未完成记录'
  },
  rank: {
    defaultTop: 10,
    showAverage: true
  }
}

// 模拟会话
class MockSession {
  content: string
  uid: number
  platform: string
  author: { nickname: string }
  event: any
  user: any
  userId: string

  constructor(content: string, uid: number = 1) {
    this.content = content
    this.uid = uid
    this.platform = 'test'
    this.author = { nickname: '测试用户' }
    this.event = { user_id: uid }
    this.user = { id: uid }
    this.userId = uid.toString()
  }

  async reply(message: string) {
    console.log('Reply:', message)
    return message
  }
}

// 运行测试
async function runTests() {
  console.log('开始测试睡眠记录插件...')

  // 创建模拟上下文
  const ctx = new Context()
  // 初始化内存数据库
  await ctx.database.init()
  // 应用插件
  apply(ctx, testConfig)

  // 测试1: 晚安功能
  console.log('\n测试1: 晚安功能')
  const eveningSession = new MockSession('晚安')
  const eveningResult = await ctx.middleware(eveningSession, () => 'next')
  console.log('晚安结果:', eveningResult)

  // 测试2: 重复晚安
  console.log('\n测试2: 重复晚安')
  const repeatEveningSession = new MockSession('晚安')
  const repeatEveningResult = await ctx.middleware(repeatEveningSession, () => 'next')
  console.log('重复晚安结果:', repeatEveningResult)

  // 等待一段时间，模拟睡眠时间
  await new Promise(resolve => setTimeout(resolve, 1000))

  // 测试3: 早安功能
  console.log('\n测试3: 早安功能')
  const morningSession = new MockSession('早安')
  const morningResult = await ctx.middleware(morningSession, () => 'next')
  console.log('早安结果:', morningResult)

  // 测试4: 无记录早安
  console.log('\n测试4: 无记录早安')
  const noRecordMorningSession = new MockSession('早安', 2)
  const noRecordMorningResult = await ctx.middleware(noRecordMorningSession, () => 'next')
  console.log('无记录早安结果:', noRecordMorningResult)

  console.log('\n测试完成!')
}

// 运行测试
runTests().catch(console.error)