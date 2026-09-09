import { Global, Module } from '@nestjs/common';
import { AppConfig } from './app.config';

//глобальный модуль для провайдеров и модулей необходимых во всех частях приложения (например LoggerService, CqrsModule, etc...)
@Global()
@Module({
    providers: [AppConfig],
    exports: [AppConfig],
})
export class CoreModule {}
