import { ThrottlerGuard } from '@nestjs/throttler';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
    protected async getTracker(req: Record<string, any>): Promise<string> {
        // 1. Безопасно извлекаем IP
        const ip = req.ip || req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';

        // 2. Извлекаем URL
        const url = req.originalUrl || req.url || '';

        // 3. Извлекаем User-Agent
        const deviceName = req.headers?.['user-agent'] || 'unknown-device';

        // Формируем составной ключ: IP + URL + User-Agent
        return `${ip}-${url}-${deviceName}`;
    }
}


// @Injectable()
// export class CustomThrottlerGuard extends ThrottlerGuard {
//     protected async getTracker(req: Record<string, any>): Promise<string> {
//         const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
//         const url = req.originalUrl || req.url;
//         // Считаем лимит 5 попыток строго для комбинации "IP + конкретный URL"
//         return `${ip}-${url}`;
//     }
// }