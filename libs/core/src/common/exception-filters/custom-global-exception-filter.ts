
import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    BadRequestException,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { JsonRpcException } from './json-exception-handler.filter';
import { ERROR_CODES } from '../error-handler/error-codes';

@Catch()
export class CustomGlobalExceptionFilter implements ExceptionFilter {
    constructor(private readonly httpAdapterHost: HttpAdapterHost) { }

    catch(exception: unknown, host: ArgumentsHost): void {
        // In certain situations `httpAdapter` might not be available in the
        // constructor method, thus we should resolve it here.
        const { httpAdapter } = this.httpAdapterHost;

        const ctx = host.switchToHttp();

        const request = ctx.getRequest();
        const id = request?.body?.id || null;

        let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

        if (exception instanceof HttpException) {
            httpStatus = exception.getStatus()
        } else if (exception instanceof BadRequestException) {
            httpStatus = exception.getStatus()
        } else if (exception instanceof JsonRpcException) {
            httpStatus = exception.getStatus()
        }

        const responseBody = {
            jsonrpc: "2.0",
            error: {
                code: ERROR_CODES.INTERNAL_JSON_RPC_ERROR,
                message: "Internal Server Error",
            },
            id
        };

        httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
    }
}
