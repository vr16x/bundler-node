import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ERROR_CODES } from '../error-handler/error-codes';

type ErrorException = { code: number, message: string };

export class JsonRpcException extends HttpException {
    constructor(code: number, message: string) {
        super(
            {
                code,
                message
            },
            HttpStatus.BAD_REQUEST,
        );
    }
}

@Catch(HttpException)
export class JsonRpcExceptionFilter implements ExceptionFilter {
    catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();

        const status = exception.getStatus();
        const errorResponse = exception.getResponse();

        // @ts-ignore
        const id = request.body?.id ?? null;

        let code = ERROR_CODES.INTERNAL_JSON_RPC_ERROR;
        let message = 'Internal Server Error';

        if (typeof errorResponse === 'object') {
            code = (errorResponse as ErrorException)?.code || code;
            message = (errorResponse as ErrorException)?.message || message;
        } else if (typeof errorResponse === 'string') {
            message = errorResponse;
        }

        let customError = {
            jsonrpc: "2.0",
            error: {
                code,
                message,
            },
            id
        };

        response.status(status).json(customError);
    }
}
