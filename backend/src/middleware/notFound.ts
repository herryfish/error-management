import { Request, Response } from 'express'

export const notFound = (req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    statusCode: 404,
    message: `Route ${req.originalUrl} not found`,
  })
}