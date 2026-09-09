// димыч видео environments configuration 16 lesson
import { Global, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsNotEmpty, IsNumber, IsString, validateSync } from 'class-validator';

@Injectable()
export class AppConfig {
    @IsNumber({}, { message: 'PORT должен быть числом' })
    readonly PORT: number;

    @IsString({ message: 'ACCESS_TOKEN_SECRET должен быть строкой' })
    @IsNotEmpty({ message: 'ACCESS_TOKEN_SECRET не может быть пустым' })
    readonly ACCESS_TOKEN_SECRET: string;

    @IsString({ message: 'REFRESH_TOKEN_SECRET должен быть строкой' })
    @IsNotEmpty({ message: 'REFRESH_TOKEN_SECRET не может быть пустым' })
    readonly REFRESH_TOKEN_SECRET: string;

    @IsNumber({}, { message: 'ACCESS_TOKEN_LIFETIME должен быть числом' })
    @IsNotEmpty({ message: 'ACCESS_TOKEN_LIFETIME не может быть пустым' })
    readonly ACCESS_TOKEN_LIFETIME: number;

    @IsNumber({}, { message: 'REFRESH_TOKEN_LIFETIME должен быть числом' })
    @IsNotEmpty({ message: 'REFRESH_TOKEN_LIFETIME не может быть пустым' })
    readonly REFRESH_TOKEN_LIFETIME: number;

    @IsNumber({}, { message: 'MAIL_PORT должен быть числом' })
    @IsNotEmpty({ message: 'MAIL_PORT не может быть пустым' })
    readonly MAIL_PORT: number;

    @IsString({ message: 'MAIL_HOST должен быть строкой' })
    @IsNotEmpty({ message: 'MAIL_HOST не может быть пустым' })
    readonly MAIL_HOST: string;

    @IsString({ message: 'MAIL_LOGIN должен быть строкой' })
    @IsNotEmpty({ message: 'MAIL_LOGIN не может быть пустым' })
    readonly MAIL_LOGIN: string;

    @IsString({ message: 'MAIL_PASS должен быть строкой' })
    @IsNotEmpty({ message: 'MAIL_PASS не может быть пустым' })
    readonly MAIL_PASS: string;

    @IsString({ message: 'MONGO_URI должен быть строкой' })
    @IsNotEmpty({ message: 'MONGO_URI не может быть пустым' })
    readonly MONGO_URI: string;

    @IsString({ message: 'POSTGRES_URI должен быть строкой' })
    @IsNotEmpty({ message: 'POSTGRES_URI не может быть пустым' })
    readonly POSTGRES_URI: string;

    // @IsString({ message: 'MONGO_URI_LOCAL должен быть строкой' })
    // @IsNotEmpty({ message: 'MONGO_URI_LOCAL не может быть пустым' })
    // readonly MONGO_URI_LOCAL: string;

    @IsNumber({}, { message: 'THROTTLE_TTL должен быть числом' })
    @IsNotEmpty({ message: 'THROTTLE_TTL не может быть пустым' })
    readonly THROTTLE_TTL: number;

    @IsNumber({}, { message: 'THROTTLE_LIMIT должен быть числом' })
    @IsNotEmpty({ message: 'THROTTLE_LIMIT не может быть пустым' })
    readonly THROTTLE_LIMIT: number;



    constructor(private configService: ConfigService) {
        // Вспомогательные функции для защиты от NaN и строки "undefined"
        const getString = (key: string) => this.configService.get<string>(key) ?? '';
        const getNumber = (key: string) => {
            const val = this.configService.get(key);
            return val !== undefined && val !== '' ? Number(val) : (undefined as unknown as number);
        };

        this.PORT = getNumber('PORT');
        this.ACCESS_TOKEN_SECRET = getString('ACCESS_TOKEN_SECRET');
        this.REFRESH_TOKEN_SECRET = getString('REFRESH_TOKEN_SECRET');
        this.ACCESS_TOKEN_LIFETIME = getNumber('ACCESS_TOKEN_LIFETIME');
        this.REFRESH_TOKEN_LIFETIME = getNumber('REFRESH_TOKEN_LIFETIME');
        this.MAIL_PORT = getNumber('MAIL_PORT');
        this.MAIL_HOST = getString('MAIL_HOST');
        this.MAIL_LOGIN = getString('MAIL_LOGIN');
        this.MAIL_PASS = getString('MAIL_PASS');
        this.MONGO_URI = getString('MONGO_URI');
        // this.MONGO_URI_LOCAL = getString('MONGO_URI_LOCAL');
        this.POSTGRES_URI = getString('POSTGRES_URI');
        this.THROTTLE_TTL = getNumber('THROTTLE_TTL');
        this.THROTTLE_LIMIT = getNumber('THROTTLE_LIMIT');

        // 3. Валидация
        const errors = validateSync(this, {
            // stopAtFirstError: false // Проверять ВСЕ правила (декораторы) для каждого свойства, однако некоторые пары декораторов будут срабатывать и без этой опции

        });

        if (errors.length > 0) {
            const messages = errors
                .flatMap((error) => (error.constraints ? Object.values(error.constraints) : []))
                .map((msg) => `- ${msg}`)
                .join('\n');

            throw new Error(`Ошибка конфигурации приложения (.env):\n${messages}`);
        }
    }

    // а можно делать через get
    // get — это встроенное ключевое слово JavaScript / TypeScript
    // Обозначает «Свойство-аксессор» (геттер). Позволяет писать логику
    // (код) внутри, но обращаться к ней снаружи как к простой переменной
    // (без скобок ()).
    get IN_PRODUCTION(): boolean {
        // Защита от 'IN_PRODUCTION=false', которое через Boolean() даст true
        return this.configService.get('IN_PRODUCTION') === 'true';
    }
}
