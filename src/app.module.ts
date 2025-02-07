import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BundlerModule } from './bundler/bundler.module';
import { CoreModule } from '@packages/core';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    CoreModule,
    BundlerModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
