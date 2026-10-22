import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleSecureExamApiRequest } from '../../server/secureExamApi.ts';

export default function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  return handleSecureExamApiRequest(req, res, process.env);
}
