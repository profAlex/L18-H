import { AuthGuard } from '@nestjs/passport';
import {
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    handleRequest<TUser = any>(
        err: any,
        userData: TUser,
        info: any,
        context: ExecutionContext,
    ) {
        // if (err || !userData) {
        //     throw new UnauthorizedException({
        //         message: 'Wrong or expired jwt-token',
        //     });
        // }
        //
        // return userData;

        if (err || !userData) {
            throw new DomainException({
                code: DomainExceptionCode.Unauthorized,
                message: 'Wrong or expired jwt-token.',
            });
            // return null;
        } else {
            return userData;
        }
    }
}

@Injectable()
export class JwtOptionalAuthGuard extends AuthGuard('jwt') {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        try {
            // 1. Обязательно ждем (await) и оборачиваем в try-catch!
            // Если handleRequest вернет null, super.canActivate выбросит ошибку,
            // но мы её поймаем в блоке catch.
            return (await super.canActivate(context)) as boolean;
        } catch (error) {
            // 2. Гасим ошибку Passport/NestJS и говорим: "Все ок, пускай анонима!"
            return true;
        }
    }

    handleRequest(err: any, userData: any) {
        // 3. Если токен валидный — возвращаем юзера (он запишется в req.user)
        // Если токена нет или он протух — возвращаем null (в req.user запишется null)

        if (err || !userData) {
            return null;
        }
        return userData;
    }
}
