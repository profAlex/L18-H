import { AuthGuard } from '@nestjs/passport';
import {
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';

// порядок:
// 1. гвард делает вызов canActivate(context) (или базовый super.canActivate(context) из класса AuthGuard.)
// 2. canActivate вызывает Стратегию Passport (вызов метода .validate() внутри конкретной PassportStrategy)
// 3. canActivate вызывает ваш handleRequest(err, userData, info, context), передает результаты работы стратегии в метод handleRequest.
// 4. если в handleRequest передали не пустой объект -> это объект летит по пайплайну далее в место вызова гварда, иначе броасет исключение вылетает из handleRequest -> из canActivate -> на этом исполнение запроса останавливается

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

