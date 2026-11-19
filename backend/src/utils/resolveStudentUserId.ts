import { AppDataSource } from '../config/database'
import { Student } from '../models/Student'

/**
 * studentId 口径统一工具（评审 C1）。
 *
 * 背景：数据行（questions / mastery / redo_records.studentId）写入的是登录用户 id
 * （users.id，录入时取 req.user.id），而 users.studentId 字段与家长绑定关系暴露的
 * 是学生档案 id（students.id）。前端统一以 `user?.studentId || user?.id` 取值：
 * 登录后刷新（fetchUser 返回 students.id）或家长视角（绑定学生的 students.id）时，
 * 直查会导致恒为空。
 *
 * 归一策略：入参若命中 students.id 则解析为其登录用户 id（users.id）；否则视为
 * 已是 users.id 原样返回。两种口径从此等价，调用方无需区分。
 */
export async function resolveStudentUserId(rawId: string | undefined | null): Promise<string> {
  if (!rawId) return rawId as string

  const student = await AppDataSource.getRepository(Student).findOne({
    where: { id: rawId },
    relations: ['user'],
  })
  return student?.user?.id || rawId
}
