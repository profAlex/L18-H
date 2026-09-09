import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserAccessTokenContextDto } from '../dto/user-access-token-context.dto';
import { AppConfig } from '../../../../core/app.config';
import { Request } from 'express';
import { SessionParameters } from '../../infrastructure/session/sessions.command-repository';
import { SessionsQueryRepository } from '../../infrastructure/session/query/sessions.query-repository';

// export type RefreshTokenPayload = {
//     userId: string;
//     deviceUUID: string;
//     exp: number;
//     iat: number;
// };

@Injectable()
export class JwtRefreshTokenStrategy extends PassportStrategy(
    Strategy,
    'jwt-refresh-token',
) {
    constructor(
        private readonly appConfig: AppConfig,
        private readonly sessionsQueryRepository: SessionsQueryRepository,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (request: Request) => {
                    // return request?.cookies?.refreshToken ?? null;
                    // для диагностики
                    const token = request?.cookies?.refreshToken;
                    console.warn('--- DEBUG STRATEGY ---');
                    console.warn('[1] Extracting cookie:');
                    console.warn('  - All cookies in req:', request?.cookies);
                    console.warn('  - Extracted refreshToken:', token ? `${token.substring(0, 20)}...` : null);
                    return token ?? null;
                },
            ]),
            ignoreExpiration: false,
            secretOrKey: appConfig.REFRESH_TOKEN_SECRET,
        });

    }

    async validate(
        payload: any,
    ): Promise<SessionParameters & { sessionId: string }> {
        if (
            !payload ||
            typeof payload.userId !== 'string' ||
            typeof payload.deviceId !== 'string' ||
            typeof payload.iat !== 'number' ||
            typeof payload.exp !== 'number'
        ) {
            // В выбросе UnauthorizedException Passport сформирует 401 Unauthorized
            throw new UnauthorizedException('Improper refresh token structure');
        }

        // в JWT спецификации (RFC 7519) поля iat (Issued At) и exp (Expiration Time) всегда хранятся в секундах
        // для корректного преобразования значение из JWT нужно умножить на 1000, т.к. класс Date принимают метку времени в миллисекундах
        const issuedAt = new Date(payload.iat * 1000);
        const expiresAt = new Date(payload.exp * 1000);

        const sessionId =
            await this.sessionsQueryRepository.SQLcheckIfSessionExists({
                userId: payload.userId,
                deviceId: payload.deviceId,
                expiresAt: expiresAt,
                issuedAt: issuedAt,
            });

        if (sessionId === null) {
            throw new UnauthorizedException('Session not found');
        }

        return {
            userId: payload.userId,
            deviceId: payload.deviceId,
            expiresAt: expiresAt,
            issuedAt: issuedAt,
            sessionId: sessionId,
        };
    }
}
