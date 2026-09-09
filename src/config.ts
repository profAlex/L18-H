import { ConfigModule } from '@nestjs/config';
import {join} from 'path';

const nodeEnv = process.env.NODE_ENV;

export const configModule = ConfigModule.forRoot({
    envFilePath: [
        ...(process.env.ENV_FILE_PATH ? [process.env.ENV_FILE_PATH.trim()] : []),
        nodeEnv ? join(__dirname, `env`,`.env.${nodeEnv}.local`) : null,
        nodeEnv ? join(__dirname, `env`,`.env.${nodeEnv}`) : null,
        '.env.production',
    ].filter(Boolean) as string[],
    // здесь as string[] — это Type Assertion (утверждение типа) в TypeScript.
    // Она буквально говорит компилятору:
    // "TypeScript, поверь мне на слово, после метода .filter(Boolean) в этом массиве
    // гарантированно остались ТОЛЬКО строки, никаких null или undefined там больше нет.
    // Считай этот массив как string[]."
    isGlobal: true,
});
