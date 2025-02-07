import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { JsonRpcExceptionFilter } from './json-exception-handler.filter';
import { JsonRpcValidationFilter } from './json-rpc-validation.filter';

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
