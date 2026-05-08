import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { AppError } from './errorHandler';

export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const extractedErrors: any[] = [];
    errors.array().forEach(err => {
      const field = (err as any).path || (err as any).param || 'unknown';
      extractedErrors.push({ [field]: err.msg });
    });

    return next(new AppError(`Error de validación: ${JSON.stringify(extractedErrors)}`, 400));
  };
};
