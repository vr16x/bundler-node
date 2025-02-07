import {
    ArgumentsHost,
    BadRequestException,
    Catch,
    ExceptionFilter
} from '@nestjs/common';
import { Response } from 'express';
import { ERROR_CODES } from '../error-handler/error-codes';

@Catch(BadRequestException)
export class JsonRpcValidationFilter implements ExceptionFilter {
    catch(exception: BadRequestException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();

        // @ts-ignore
        const id = request.body?.id ?? null;

        const status = exception.getStatus();
        const exceptionResponse = exception.getResponse();

        let message = 'Internal Server Error';

        if (typeof exceptionResponse === 'object' && 'message' in exceptionResponse) {
            const [error] = Array.isArray(exceptionResponse.message)
                ? exceptionResponse.message.map(msg => ({ message: msg }))
                : [{ message: exceptionResponse.message }];

            message = error?.message || message;
        }

        let customError = {
            jsonrpc: "2.1",
            error: {
                code: ERROR_CODES.INTERNAL_JSON_RPC_ERROR,
                message,
            },
            id
        };

        response.status(status).json(customError);
    }
}
