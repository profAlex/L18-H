import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { envConfig } from '../../config_old';
import { EmailService } from './email.service';
import { AppConfig } from '../../core/app.config';

@Module({
    imports: [
        MailerModule.forRootAsync({
            inject: [AppConfig],
            useFactory: async (appConfig: AppConfig) => {
                return {
                    transport: {
                        // jsonTransport: true,
                        host: appConfig.MAIL_HOST, // smtp.yandex.ru
                        port: Number(appConfig.MAIL_PORT), // 465 (обязательно числом!)
                        secure: true, // true для порта 465 (SSL)
                        auth: {
                            user: appConfig.MAIL_LOGIN, // geniusb198
                            pass: appConfig.MAIL_PASS, // ТУТ ДОЛЖЕН БЫТЬ ПАРОЛЬ ПРИЛОЖЕНИЯ
                        },
                        tls: { rejectUnauthorized: false },
                    },
                    defaults: {
                        from: '"test-notification" <geniusb198@yandex.ru>',
                        subject: 'Подтверждение регистрации',
                    },
                };
            },
        }),
    ],
    providers: [EmailService],
    exports: [EmailService],
})
export class NotificationsModule {}
