import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';

@Injectable()
export class JwtRefreshAuthGuard extends AuthGuard('jwt-refresh-token') {
    handleRequest<TUser = any>(err: any, userData: TUser) {
        if (err || !userData) {
            throw new DomainException({
                code: DomainExceptionCode.Unauthorized,
                message: 'Invalid or expired refresh token',
            });
        }
        return userData;
    }
}