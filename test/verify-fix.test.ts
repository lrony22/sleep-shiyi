// 验证修复的TypeScript错误
import { Context } from 'koishi'
import { describe, before, after, it, expect } from '@jest/globals'
import { apply as sleepPlugin } from '../src/index'

describe('修复验证', () => {
  let ctx: Context;

  before(async () => {
    ctx = new Context()
    ctx.plugin(sleepPlugin)
    await ctx.start()
  })

  after(async () => {
    await ctx.stop()
  })

  it('应该能够加载插件而不报错', () => {
    // 简单测试插件是否能正常加载
    expect(ctx).toBeDefined()
  })
})