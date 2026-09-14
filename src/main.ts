import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { appSetup } from './setup/app.setup';
import cookieParser from 'cookie-parser';
import { AppConfig } from './core/app.config';
import { INestApplication } from '@nestjs/common';

let app: INestApplication;

async function bootstrap() {
    if (!app) {
        app = await NestFactory.create(AppModule);

        appSetup(app);

        const appConfig = app.get<AppConfig>(AppConfig);
        const PORT = appConfig.PORT || 5005;

        // ВАЖНО: Вызываем listen() ТОЛЬКО если мы НЕ на Vercel
        if (!process.env.VERCEL) {
            await app.listen(PORT, () => {
                console.log('Server is running on port ' + PORT);
            });
        } else {
            // На Vercel только инициализируем приложения без открытия порта
            await app.init();
        }
    }
    return app;
}

// Запускаем локально
if (!process.env.VERCEL) {
    bootstrap();
}

// Экспорт для Vercel
export default async (req: any, res: any) => {
    const instance = await bootstrap();
    const server = instance.getHttpAdapter().getInstance();
    return server(req, res);
};

process.on('unhandledRejection', (reason) => {
    console.error('🔥 UNHANDLED REJECTION:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('💥 UNCAUGHT EXCEPTION:', err);
});