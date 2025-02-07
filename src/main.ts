import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { JsonRpcExceptionFilter } from '@packages/core/common/exception-filters/json-exception-handler.filter';
import { JsonRpcValidationFilter } from '@packages/core/common/exception-filters/json-rpc-validation.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableVersioning({
    type: VersioningType.URI,
  });

  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalFilters(new JsonRpcExceptionFilter());
  app.useGlobalFilters(new JsonRpcValidationFilter());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
