import { User, UserModelType } from '../../domain/user.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable, NotFoundException } from '@nestjs/common';
import { UserExternalDto } from './external-dto/users.external-dto';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';

@Injectable()
export class UsersExternalQueryRepository {
    constructor(
        @InjectModel(User.name)
        private UserModel: UserModelType,
    ) {}

    async getByIdOrNotFoundFail(id: string): Promise<UserExternalDto> {
        const user = await this.UserModel.findOne({
            _id: id,
            deletedAt: null,
        });

        if (!user) {
            // throw new NotFoundException('user not found');
            throw new DomainException({
                code: DomainExceptionCode.UserNotFound,
                message: 'User not found',
            });
        }

        return UserExternalDto.mapToView(user);
    }
}
