import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { UserAccessTokenContextDto } from '../dto/user-access-token-context.dto';
import { envConfig } from '../../../../config_old';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../../../core/app.config';


// стратегия для проверки эксесс-токена
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(appConfig: AppConfig) {

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: appConfig.ACCESS_TOKEN_SECRET,
            // secretOrKey: envConfig.accessTokenSecret, //TODO: move to env. will be in the following lessons
        })
    }

    async validate(userData: UserAccessTokenContextDto): Promise<UserAccessTokenContextDto> {
        console.log("USER_ID: ", userData.userId);
        return userData;
    }
}
