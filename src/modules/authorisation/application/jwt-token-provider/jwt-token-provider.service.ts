import { Injectable } from '@nestjs/common';
import { AppConfig } from '../../../../core/app.config';
import { JwtService } from '@nestjs/jwt';

export type JwtPayload = {
    userId: string;
    deviceId: string;
};

@Injectable()
export class JwtTokenProvider {
    constructor(
        private readonly jwtService: JwtService,
        private readonly appConfig: AppConfig,
    ) {}

    async generatePairOfTokens(payload: JwtPayload) {
        {
            // логика для гарантии 100% совпадения того чт будет записано в токене и в сесии миллисекунда а в миллисекунду.
            // изза багов округления при переводе из миллисекунд в Date в секунды внутри JWT (по стандарту) я делаю
            // это самостоятельно заранее и записываю это значение и в токен и в сессию

            // берем теущий iat в секундах и убираем миллисекундные разряды
            const iat = Math.floor(Date.now() / 1000);

            // считаю exp для каждого токена (в секундах)
            const accessTokenExp = iat + Number(this.appConfig.ACCESS_TOKEN_LIFETIME);
            const refreshTokenExp = iat + Number(this.appConfig.REFRESH_TOKEN_LIFETIME);

            // создаем объекты Date без значащих миллисекунд (которые мы выкинули в начале, вместо них будут нули) для записи в базу данных/сессию
            const issuedAt = new Date(iat * 1000);
            const expiresAt = new Date(refreshTokenExp * 1000);

            // console.log("---------->", expiresAt);

            // записываем
            const accessToken = await this.jwtService.signAsync(
                {
                    userId: payload.userId,
                    iat: iat,
                    exp: accessTokenExp,
                },
                {
                    secret: this.appConfig.ACCESS_TOKEN_SECRET,
                },
            );

            const refreshToken = await this.jwtService.signAsync(
                {
                    ...payload,
                    iat: iat,
                    exp: refreshTokenExp,
                },
                {
                    secret: this.appConfig.REFRESH_TOKEN_SECRET,
                },
            );

            // 6. Возвращаем токены и точные Date для сессии
            return {
                accessToken,
                refreshToken,
                issuedAt,
                expiresAt,
            };
        }
    }
}
