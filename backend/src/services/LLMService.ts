/**
 * LLM服务
 * 
 * 提供LLM调用封装，支持多提供商配置和降级策略
 * 
 * 功能特性：
 * - 多提供商支持（OpenAI、Anthropic等）
 * - 降级策略（主模型失败时自动切换降级模型）
 * - 用量监控（记录每次调用的详细信息）
 * - 错误处理（重试机制和超时处理）
 * 
 * @author 开发团队
 * @date 2026-07-22
 * @version 1.0.0
 */

import OpenAI from 'openai'
import { AppDataSource } from '../config/database'
import { LLMUsage, LLMScene } from '../models/LLMUsage'

/**
 * LLM配置接口
 */
interface LLMConfig {
  /** 提供商名称（如：openai、anthropic） */
  provider: string
  /** 模型名称（如：gpt-4-vision-preview） */
  model: string
  /** API密钥 */
  apiKey: string
  /** API基础URL（可选） */
  apiBase?: string
}

/**
 * 识别结果接口
 */
interface IdentificationResult {
  /** 题目标题 */
  title: string
  /** 题目内容 */
  content: string
  /** 科目（math、physics、chemistry） */
  subject: string
  /** 题目类型（choice、fill、answer） */
  type: string
  /** 难度等级（1-5） */
  difficulty: number
  /** 知识点标签 */
  knowledgePoints: string[]
  /** 参考答案（可选） */
  answer?: string
  /** 解析说明（可选） */
  explanation?: string
  /** 识别置信度（0-1） */
  confidence: number
}

/**
 * 批改结果接口
 */
interface GradingResult {
  /** 是否正确 */
  isCorrect: boolean
  /** 分数（0-100） */
  score: number
  /** 批改反馈 */
  feedback: string
  /** 批改置信度（0-1） */
  confidence: number
}

/**
 * LLM服务类
 * 
 * 提供LLM调用封装，支持多提供商配置和降级策略
 */
export class LLMService {
  private llmUsageRepository = AppDataSource.getRepository(LLMUsage)
  private primaryClient: OpenAI | null = null
  private fallbackClient: OpenAI | null = null
  private config: {
    primary: LLMConfig
    fallback?: LLMConfig
    strategy: {
      enabled: boolean
      retryCount: number
      timeoutMs: number
    }
  }

  constructor() {
    this.config = this.loadConfig()
    this.initializeClients()
  }

  /**
   * 加载LLM配置
   * 
   * @returns {Object} LLM配置对象
   */
  private loadConfig() {
    return {
      primary: {
        provider: process.env.LLM_PRIMARY_PROVIDER || 'openai',
        model: process.env.LLM_PRIMARY_MODEL || 'gpt-4-vision-preview',
        apiKey: process.env.LLM_PRIMARY_API_KEY || '',
        apiBase: process.env.LLM_PRIMARY_API_BASE,
      },
      fallback: process.env.LLM_FALLBACK_PROVIDER
        ? {
            provider: process.env.LLM_FALLBACK_PROVIDER,
            model: process.env.LLM_FALLBACK_MODEL || '',
            apiKey: process.env.LLM_FALLBACK_API_KEY || '',
            apiBase: process.env.LLM_FALLBACK_API_BASE,
          }
        : undefined,
      strategy: {
        enabled: process.env.LLM_FALLBACK_ENABLED === 'true',
        retryCount: parseInt(process.env.LLM_FALLBACK_RETRY_COUNT || '2'),
        timeoutMs: parseInt(process.env.LLM_FALLBACK_TIMEOUT_MS || '30000'),
      },
    }
  }

  private initializeClients() {
    if (this.config.primary.apiKey) {
      this.primaryClient = new OpenAI({
        apiKey: this.config.primary.apiKey,
        baseURL: this.config.primary.apiBase,
      })
    }

    if (this.config.fallback?.apiKey) {
      this.fallbackClient = new OpenAI({
        apiKey: this.config.fallback.apiKey,
        baseURL: this.config.fallback.apiBase,
      })
    }
  }

  async identifyQuestion(
    imagePath: string,
    userId: string
  ): Promise<IdentificationResult> {
    const startTime = Date.now()

    try {
      // Try primary LLM first
      const result = await this.callPrimaryLLM(imagePath)
      const latencyMs = Date.now() - startTime

      // Record usage
      await this.recordUsage({
        userId,
        scene: LLMScene.RECOGNITION,
        provider: this.config.primary.provider,
        model: this.config.primary.model,
        isFallback: false,
        tokens: result.tokens || { input: 0, output: 0, total: 0 },
        cost: 0, // Calculate based on pricing
        latencyMs,
        success: true,
      })

      return result
    } catch (primaryError) {
      console.error('Primary LLM failed:', primaryError)

      // If fallback is enabled, try fallback LLM
      if (this.config.strategy.enabled && this.fallbackClient) {
        try {
          const result = await this.callFallbackLLM(imagePath)
          const latencyMs = Date.now() - startTime

          // Record fallback usage
          await this.recordUsage({
            userId,
            scene: LLMScene.RECOGNITION,
            provider: this.config.fallback!.provider,
            model: this.config.fallback!.model,
            isFallback: true,
            tokens: result.tokens || { input: 0, output: 0, total: 0 },
            cost: 0,
            latencyMs,
            success: true,
          })

          return result
        } catch (fallbackError) {
          console.error('Fallback LLM also failed:', fallbackError)

          // Record failed usage
          await this.recordUsage({
            userId,
            scene: LLMScene.RECOGNITION,
            provider: this.config.fallback!.provider,
            model: this.config.fallback!.model,
            isFallback: true,
            tokens: { input: 0, output: 0, total: 0 },
            cost: 0,
            latencyMs: Date.now() - startTime,
            success: false,
            error: (fallbackError as Error).message,
          })

          throw new Error('All LLM providers failed')
        }
      }

      throw primaryError
    }
  }

  private async callPrimaryLLM(imagePath: string): Promise<any> {
    if (!this.primaryClient) {
      throw new Error('Primary LLM client not configured')
    }

    // Implement retry logic
    for (let i = 0; i <= this.config.strategy.retryCount; i++) {
      try {
        const response = await this.primaryClient.chat.completions.create({
          model: this.config.primary.model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analyze this math/physics/chemistry question image. You MUST return ONLY a valid JSON object with these exact fields (no markdown, no explanation, just the JSON):

{
  "title": "question title",
  "content": "full question text with formulas",
  "subject": "math" or "physics" or "chemistry",
  "type": "choice" or "fill" or "answer",
  "difficulty": 1-5,
  "knowledgePoints": ["tag1", "tag2"],
  "answer": "correct answer if visible",
  "explanation": "solution explanation if visible",
  "confidence": 0.0-1.0
}

IMPORTANT: Return ONLY the JSON object, nothing else. No markdown code blocks, no text before or after.`,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${await this.imageToBase64(imagePath)}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 1000,
        })

        const content = response.choices[0]?.message?.content
        if (content) {
          try {
            const parsed = JSON.parse(content)
            return {
              ...parsed,
              tokens: {
                input: response.usage?.prompt_tokens || 0,
                output: response.usage?.completion_tokens || 0,
                total: response.usage?.total_tokens || 0,
              },
            }
          } catch (parseError) {
            // Try to extract JSON from markdown code blocks or extra text
            let jsonStr = content
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
            if (jsonMatch) {
              jsonStr = jsonMatch[1].trim()
            } else {
              // Try to find a JSON object in the text
              const objMatch = content.match(/\{[\s\S]*\}/)
              if (objMatch) {
                jsonStr = objMatch[0]
              }
            }
            
            try {
              const parsed = JSON.parse(jsonStr)
              return {
                ...parsed,
                tokens: {
                  input: response.usage?.prompt_tokens || 0,
                  output: response.usage?.completion_tokens || 0,
                  total: response.usage?.total_tokens || 0,
                },
              }
            } catch {
              // Last resort: return raw content with fields extracted by best effort
              return {
                title: '识别的题目',
                content: content,
                subject: 'math',
                type: 'answer',
                difficulty: 1,
                knowledgePoints: [],
                confidence: 0.3,
                tokens: {
                  input: response.usage?.prompt_tokens || 0,
                  output: response.usage?.completion_tokens || 0,
                  total: response.usage?.total_tokens || 0,
                },
              }
            }
          }
        }
      } catch (error) {
        if (i === this.config.strategy.retryCount) {
          throw error
        }
        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)))
      }
    }
  }

  private async callFallbackLLM(imagePath: string): Promise<any> {
    if (!this.fallbackClient) {
      throw new Error('Fallback LLM client not configured')
    }

    // Similar implementation as primary LLM
    const response = await this.fallbackClient.chat.completions.create({
      model: this.config.fallback!.model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Please analyze this math/physics/chemistry question image and extract:
1. Title (if visible)
2. Full question content (including formulas, conditions, etc.)
3. Subject (math, physics, or chemistry)
4. Question type (choice, fill, or answer)
5. Difficulty level (1-5)
6. Knowledge points/tags
7. Answer (if visible)
8. Explanation (if visible)
Confidence score (0-1) for the identification.

Return the result in JSON format.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${await this.imageToBase64(imagePath)}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    })

    const content = response.choices[0]?.message?.content
    if (content) {
      try {
        const parsed = JSON.parse(content)
        return {
          ...parsed,
          tokens: {
            input: response.usage?.prompt_tokens || 0,
            output: response.usage?.completion_tokens || 0,
            total: response.usage?.total_tokens || 0,
          },
        }
      } catch (parseError) {
        return {
          content,
          confidence: 0.5,
          tokens: {
            input: response.usage?.prompt_tokens || 0,
            output: response.usage?.completion_tokens || 0,
            total: response.usage?.total_tokens || 0,
          },
        }
      }
    }
  }

  private async imageToBase64(imagePath: string): Promise<string> {
    const fs = await import('fs')
    const imageBuffer = fs.readFileSync(imagePath)
    return imageBuffer.toString('base64')
  }

  private async recordUsage(usageData: {
    userId: string
    scene: LLMScene
    provider: string
    model: string
    isFallback: boolean
    tokens: { input: number; output: number; total: number }
    cost: number
    latencyMs: number
    success: boolean
    error?: string
    businessId?: string
  }) {
    try {
      const usage = this.llmUsageRepository.create({
        ...usageData,
        tokensInput: usageData.tokens.input,
        tokensOutput: usageData.tokens.output,
        tokensTotal: usageData.tokens.total,
      })

      await this.llmUsageRepository.save(usage)
    } catch (error) {
      console.error('Failed to record LLM usage:', error)
    }
  }

  async generateSimilarQuestion(
    questionContent: string,
    knowledgePoints: string[],
    userId: string
  ): Promise<string> {
    const startTime = Date.now()

    const result = await this.callPrimaryLLMForSimilar(
      questionContent,
      knowledgePoints
    )
    const latencyMs = Date.now() - startTime

    // Record usage
    await this.recordUsage({
      userId,
      scene: LLMScene.SIMILAR,
      provider: this.config.primary.provider,
      model: this.config.primary.model,
      isFallback: false,
      tokens: result.tokens || { input: 0, output: 0, total: 0 },
      cost: 0,
      latencyMs,
      success: true,
    })

    return result.content
  }

  private async callPrimaryLLMForSimilar(
    questionContent: string,
    knowledgePoints: string[]
  ): Promise<any> {
    if (!this.primaryClient) {
      throw new Error('Primary LLM client not configured')
    }

    const response = await this.primaryClient.chat.completions.create({
      model: this.config.primary.model,
      messages: [
        {
          role: 'user',
          content: `Generate a similar math/physics/chemistry question based on:
Original question: ${questionContent}
Knowledge points: ${knowledgePoints.join(', ')}

Requirements:
1. Similar difficulty level
2. Tests the same knowledge points
3. Different numbers/values
4. Clear and well-formatted

Return only the question content.`,
        },
      ],
      max_tokens: 500,
    })

    const content = response.choices[0]?.message?.content
    return {
      content,
      tokens: {
        input: response.usage?.prompt_tokens || 0,
        output: response.usage?.completion_tokens || 0,
        total: response.usage?.total_tokens || 0,
      },
    }
  }

  async gradeHandwriting(
    questionContent: string,
    handwritingImagePath: string,
    expectedAnswer: string,
    userId: string
  ): Promise<GradingResult> {
    const startTime = Date.now()

    try {
      const result = await this.callPrimaryLLMForGrading(
        questionContent,
        handwritingImagePath,
        expectedAnswer
      )
      const latencyMs = Date.now() - startTime

      // Record usage
      await this.recordUsage({
        userId,
        scene: LLMScene.GRADING,
        provider: this.config.primary.provider,
        model: this.config.primary.model,
        isFallback: false,
        tokens: result.tokens || { input: 0, output: 0, total: 0 },
        cost: 0,
        latencyMs,
        success: true,
      })

      return result
    } catch (primaryError) {
      console.error('Primary LLM failed for grading:', primaryError)

      // If fallback is enabled, try fallback LLM
      if (this.config.strategy.enabled && this.fallbackClient) {
        try {
          const result = await this.callFallbackLLMForGrading(
            questionContent,
            handwritingImagePath,
            expectedAnswer
          )
          const latencyMs = Date.now() - startTime

          // Record fallback usage
          await this.recordUsage({
            userId,
            scene: LLMScene.GRADING,
            provider: this.config.fallback!.provider,
            model: this.config.fallback!.model,
            isFallback: true,
            tokens: result.tokens || { input: 0, output: 0, total: 0 },
            cost: 0,
            latencyMs,
            success: true,
          })

          return result
        } catch (fallbackError) {
          console.error('Fallback LLM also failed for grading:', fallbackError)

          // Record failed usage
          await this.recordUsage({
            userId,
            scene: LLMScene.GRADING,
            provider: this.config.fallback!.provider,
            model: this.config.fallback!.model,
            isFallback: true,
            tokens: { input: 0, output: 0, total: 0 },
            cost: 0,
            latencyMs: Date.now() - startTime,
            success: false,
            error: (fallbackError as Error).message,
          })

          throw new Error('All LLM providers failed for grading')
        }
      }

      throw primaryError
    }
  }

  private async callPrimaryLLMForGrading(
    questionContent: string,
    handwritingImagePath: string,
    expectedAnswer: string
  ): Promise<any> {
    if (!this.primaryClient) {
      throw new Error('Primary LLM client not configured')
    }

    const response = await this.primaryClient.chat.completions.create({
      model: this.config.primary.model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Please grade this handwritten answer for a math/physics/chemistry question.

Question: ${questionContent}
Expected Answer: ${expectedAnswer}

Analyze the handwriting image and determine:
1. Is the answer correct? (true/false)
2. Score (0-100)
3. Detailed feedback on the answer
4. Confidence in grading (0-1)

Return the result in JSON format.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${await this.imageToBase64(handwritingImagePath)}`,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    })

    const content = response.choices[0]?.message?.content
    if (content) {
      try {
        const parsed = JSON.parse(content)
        return {
          ...parsed,
          tokens: {
            input: response.usage?.prompt_tokens || 0,
            output: response.usage?.completion_tokens || 0,
            total: response.usage?.total_tokens || 0,
          },
        }
      } catch (parseError) {
        return {
          isCorrect: false,
          score: 0,
          feedback: content,
          confidence: 0.5,
          tokens: {
            input: response.usage?.prompt_tokens || 0,
            output: response.usage?.completion_tokens || 0,
            total: response.usage?.total_tokens || 0,
          },
        }
      }
    }
  }

  private async callFallbackLLMForGrading(
    questionContent: string,
    handwritingImagePath: string,
    expectedAnswer: string
  ): Promise<any> {
    if (!this.fallbackClient) {
      throw new Error('Fallback LLM client not configured')
    }

    const response = await this.fallbackClient.chat.completions.create({
      model: this.config.fallback!.model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Please grade this handwritten answer for a math/physics/chemistry question.

Question: ${questionContent}
Expected Answer: ${expectedAnswer}

Analyze the handwriting image and determine:
1. Is the answer correct? (true/false)
2. Score (0-100)
3. Detailed feedback on the answer
4. Confidence in grading (0-1)

Return the result in JSON format.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${await this.imageToBase64(handwritingImagePath)}`,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    })

    const content = response.choices[0]?.message?.content
    if (content) {
      try {
        const parsed = JSON.parse(content)
        return {
          ...parsed,
          tokens: {
            input: response.usage?.prompt_tokens || 0,
            output: response.usage?.completion_tokens || 0,
            total: response.usage?.total_tokens || 0,
          },
        }
      } catch (parseError) {
        return {
          isCorrect: false,
          score: 0,
          feedback: content,
          confidence: 0.5,
          tokens: {
            input: response.usage?.prompt_tokens || 0,
            output: response.usage?.completion_tokens || 0,
            total: response.usage?.total_tokens || 0,
          },
        }
      }
    }
  }
}