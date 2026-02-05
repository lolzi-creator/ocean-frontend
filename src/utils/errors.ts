import { AxiosError } from 'axios';

interface ApiErrorResponse {
  message?: string;
  error?: string;
  statusCode?: number;
}

export function getErrorMessage(error: unknown, defaultMessage = 'Ein Fehler ist aufgetreten'): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    return data?.message || data?.error || defaultMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return defaultMessage;
}

export function isNotFoundError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return error.response?.status === 404;
  }
  return false;
}

export function isUnauthorizedError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return error.response?.status === 401;
  }
  return false;
}
