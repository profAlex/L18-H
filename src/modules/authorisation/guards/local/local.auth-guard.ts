import { AuthGuard } from '@nestjs/passport';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';

export class LocalAuthGuard extends AuthGuard('local') {
    handleRequest<TUser = any>(
        err: any,
        userData: TUser,
        info: any,
        context: ExecutionContext,
    ) {
        // Если стратегия выбросила ошибку или юзер не был найден/пароль не подошел
        // console.log("TEST_STOP");
        if (err || !userData) {
            // throw new UnauthorizedException({ message: 'Wrong login or password' });
            throw new DomainException({
                code: DomainExceptionCode.Unauthorized,
                message: 'Wrong login or password!',
            });
        }

        // обязательно возвращаем userData
        // то, что вернет этот метод, в итоге и запишется в req.user
        return userData;
    }
}
