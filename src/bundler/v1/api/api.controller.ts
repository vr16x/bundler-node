import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiHandlerDto } from './dto/api-handler.dto';
import { ApiService } from './api.service';

@Controller({
    path: 'api',
    version: '1'
})
export class ApiController {
    constructor(private readonly apiService: ApiService) {}

    @Post(':chainId')
    async apiHandler(
        @Param('chainId', ParseIntPipe) chainId: number,
        @Body() body: ApiHandlerDto
    ) {
        return this.apiService.apiHandler(body, chainId);
    }
}
