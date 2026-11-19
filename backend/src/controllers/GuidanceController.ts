/**
 * 阶梯式引导提示控制器
 *
 * 处理重做页 LLM 渐进提示相关功能：
 * - 按级别获取 1/2/3 级引导提示（检索练习防剧透，均不给出最终答案）
 *
 * DC-468 P2：完整解析为兜底，前端查看完整解析后提交的重做按「未独立掌握」记录
 * （assisted 语义，见 RedoController.createRedo）。
 */

import { Request, Response, NextFunction } from 'express'
import { AppDataSource } from '../config/database'
import { Question } from '../models/Question'
import { LLMService } from '../services/LLMService'
import { GUIDANCE_LEVELS, type GuidanceLevel } from '../services/guidancePrompts'

export class GuidanceController {
  private questionRepository = AppDataSource.getRepository(Question)
  private llmService = new LLMService()

  /**
   * 获取指定级别的引导提示
   * POST /api/guidance { questionId, level }
   *
   * 错误口径（评审 S3）：参数/题目不存在等确定性错误返回 4xx；
   * 只有 LLM 生成失败才返回 502（前端据此提示重试或转完整解析兜底）；
   * 其余异常走统一错误中间件，避免把 DB 故障也包装成可重试的 502。
   */
  askGuidance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { questionId } = req.body
      const level = parseInt(req.body.level, 10) as GuidanceLevel
      const userId = (req as any).user.id

      if (!GUIDANCE_LEVELS.includes(level)) {
        return res.status(400).json({
          status: 'error',
          message: '提示级别非法（仅支持 1/2/3 级）',
        })
      }

      const question = await this.questionRepository.findOne({
        where: { id: questionId },
      })

      if (!question) {
        return res.status(404).json({
          status: 'error',
          message: 'Question not found',
        })
      }

      let hint: string
      try {
        hint = await this.llmService.generateGuidanceHint(
          {
            content: question.content,
            subject: question.subject,
            type: question.type,
            knowledgePoints: question.knowledgePoints,
          },
          level,
          userId
        )
      } catch (error) {
        // LLM 调用失败不阻断重做流程：前端引导用户重试或使用完整解析兜底
        console.error('Guidance hint failed:', error)
        return res.status(502).json({
          status: 'error',
          message: '提示生成失败，请稍后重试，或先独立思考后使用完整解析兜底',
        })
      }

      res.json({
        status: 'success',
        data: {
          level,
          hint,
          /** 前端据此解锁下一级提示；完整解析兜底按「未独立掌握」记录 */
          nextLevel: level < 3 ? level + 1 : null,
        },
      })
    } catch (error) {
      // DB 查询等非 LLM 异常走统一错误处理，不误报为可重试的 502
      next(error)
    }
  }
}
