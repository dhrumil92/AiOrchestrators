import type { ErrorRequestHandler, RequestHandler } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import type { ApiError } from '../../../shared/api.js';
import { HttpError } from '../services/errors.js';

function body(code: string, message: string): ApiError {
  return { error: { code, message } };
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json(body('NOT_FOUND', 'Not found'));
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json(body(error.code, error.message));
  } else if (error instanceof ZodError) {
    const message = error.issues
      .map((issue) => (issue.path.length ? `${issue.path.join('.')}: ` : '') + issue.message)
      .join('; ');
    res.status(400).json(body('VALIDATION_ERROR', message));
  } else if (error instanceof multer.MulterError) {
    const tooLarge = error.code === 'LIMIT_FILE_SIZE';
    res
      .status(400)
      .json(body(tooLarge ? 'FILE_TOO_LARGE' : 'INVALID_FILE', tooLarge ? 'File is too large' : 'Invalid file upload'));
  } else if (error?.status >= 400 && error?.status < 500) {
    // Body parser errors, such as malformed JSON.
    res.status(error.status).json(body('BAD_REQUEST', 'The request could not be read'));
  } else {
    console.error(error);
    res.status(500).json(body('INTERNAL_ERROR', 'Something went wrong'));
  }
};
