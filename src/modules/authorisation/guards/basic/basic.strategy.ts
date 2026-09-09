import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { BasicStrategy } from 'passport-http';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';

@Injectable()
export class BasicAuthStrategy extends PassportStrategy(
    BasicStrategy,
    'basic'
) {
    constructor() {
        super();
    }

    async validate(username: string, password: string): Promise<boolean> {
        const adminUser = 'admin';
        const adminPass = 'qwerty';

        if (username !== adminUser || password !== adminPass) {
            throw new DomainException({
                code: DomainExceptionCode.Unauthorized,
                message: 'Invalid basic auth credentials!',
            });
        }

        return true;
    }
}