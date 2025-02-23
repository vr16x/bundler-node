import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { JsonRpcExceptionFilter } from '@packages/core/common/exception-filters/json-exception-handler.filter';
import { JsonRpcValidationFilter } from '@packages/core/common/exception-filters/json-rpc-validation.filter';
import { CustomGlobalExceptionFilter } from '@packages/core/common/exception-filters/custom-global-exception-filter';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.use(helmet());

  app.enableVersioning({
    type: VersioningType.URI,
  });

  app.useGlobalPipes(new ValidationPipe());

  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(new CustomGlobalExceptionFilter(httpAdapter));
  app.useGlobalFilters(new JsonRpcExceptionFilter());
  app.useGlobalFilters(new JsonRpcValidationFilter());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
