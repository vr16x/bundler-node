import { Module } from '@nestjs/common';
import { ApiService } from './v1/api/api.service';
import { ApiController } from './v1/api/api.controller';
import { SendUserOperationService } from './v1/api/send-user-operation/send-user-operation.service';
import { CoreModule } from '@packages/core';

@Module({
  imports: [CoreModule],
  providers: [ApiService, SendUserOperationService],
  controllers: [ApiController]
})
export class BundlerModule {}
