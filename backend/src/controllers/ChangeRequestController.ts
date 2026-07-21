import { Request, Response, NextFunction } from 'express'
import { AppDataSource } from '../config/database'
import {
  ChangeRequest,
  ChangeRequestStatus,
  ChangeRequestType,
  ChangeRequestPriority,
} from '../models/ChangeRequest'

export class ChangeRequestController {
  private changeRequestRepository = AppDataSource.getRepository(ChangeRequest)

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, type } = req.query

      const where: any = {}
      if (status) where.status = status
      if (type) where.type = type

      const changeRequests = await this.changeRequestRepository.find({
        where,
        relations: ['creator'],
        order: { createdAt: 'DESC' },
      })

      res.json({
        status: 'success',
        data: changeRequests,
      })
    } catch (error) {
      next(error)
    }
  }

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params

      const changeRequest = await this.changeRequestRepository.findOne({
        where: { id },
        relations: ['creator'],
      })

      if (!changeRequest) {
        return res.status(404).json({
          status: 'error',
          message: 'Change request not found',
        })
      }

      res.json({
        status: 'success',
        data: changeRequest,
      })
    } catch (error) {
      next(error)
    }
  }

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, description, type, priority } = req.body
      const userId = (req as any).user.id

      const changeRequest = this.changeRequestRepository.create({
        title,
        description,
        type: type || ChangeRequestType.LOW,
        priority: priority || ChangeRequestPriority.MEDIUM,
        status: ChangeRequestStatus.PENDING,
        creatorId: userId,
      })

      await this.changeRequestRepository.save(changeRequest)

      res.status(201).json({
        status: 'success',
        data: changeRequest,
      })
    } catch (error) {
      next(error)
    }
  }

  approve = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params
      const { approvalNote } = req.body
      const userId = (req as any).user.id

      const changeRequest = await this.changeRequestRepository.findOne({
        where: { id },
      })

      if (!changeRequest) {
        return res.status(404).json({
          status: 'error',
          message: 'Change request not found',
        })
      }

      changeRequest.status = ChangeRequestStatus.APPROVED
      changeRequest.approvalNote = approvalNote
      changeRequest.approvedBy = userId
      changeRequest.approvedAt = new Date()

      await this.changeRequestRepository.save(changeRequest)

      res.json({
        status: 'success',
        data: changeRequest,
      })
    } catch (error) {
      next(error)
    }
  }

  reject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params
      const { approvalNote } = req.body
      const userId = (req as any).user.id

      const changeRequest = await this.changeRequestRepository.findOne({
        where: { id },
      })

      if (!changeRequest) {
        return res.status(404).json({
          status: 'error',
          message: 'Change request not found',
        })
      }

      changeRequest.status = ChangeRequestStatus.REJECTED
      changeRequest.approvalNote = approvalNote
      changeRequest.approvedBy = userId
      changeRequest.approvedAt = new Date()

      await this.changeRequestRepository.save(changeRequest)

      res.json({
        status: 'success',
        data: changeRequest,
      })
    } catch (error) {
      next(error)
    }
  }

  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params
      const { status, gitCommitHash, deploymentId, deploymentUrl } = req.body

      const changeRequest = await this.changeRequestRepository.findOne({
        where: { id },
      })

      if (!changeRequest) {
        return res.status(404).json({
          status: 'error',
          message: 'Change request not found',
        })
      }

      changeRequest.status = status
      if (gitCommitHash) changeRequest.gitCommitHash = gitCommitHash
      if (deploymentId) changeRequest.deploymentId = deploymentId
      if (deploymentUrl) changeRequest.deploymentUrl = deploymentUrl

      await this.changeRequestRepository.save(changeRequest)

      res.json({
        status: 'success',
        data: changeRequest,
      })
    } catch (error) {
      next(error)
    }
  }

  getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const total = await this.changeRequestRepository.count()

      const byStatus = await this.changeRequestRepository
        .createQueryBuilder('cr')
        .select('cr.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('cr.status')
        .getRawMany()

      const byType = await this.changeRequestRepository
        .createQueryBuilder('cr')
        .select('cr.type', 'type')
        .addSelect('COUNT(*)', 'count')
        .groupBy('cr.type')
        .getRawMany()

      res.json({
        status: 'success',
        data: {
          total,
          byStatus,
          byType,
        },
      })
    } catch (error) {
      next(error)
    }
  }
}