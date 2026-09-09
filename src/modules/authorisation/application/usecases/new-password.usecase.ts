import { Command, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CryptoService } from '../../../../core/bcrypt/bcrypt.service';
import { UsersCommandRepository } from '../../../user-accounts/infrastructure/users.command-repository';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';
import { InternalServerErrorException } from '@nestjs/common';

export class NewPasswordCommand extends Command<void> {
    constructor(
        public readonly newPassword: string,
        public readonly recoveryCode: string,
    ) {
        super();
    }
}

@CommandHandler(NewPasswordCommand)
export class NewPasswordHandler implements ICommandHandler<NewPasswordCommand> {
    constructor(
        private readonly usersCommandRepository: UsersCommandRepository,
        private readonly cryptoService: CryptoService,
    ) {}

    async execute({ newPassword, recoveryCode }: NewPasswordCommand): Promise<void> {
        // Ищем пользователя по коду восстановления с проверкой срока годности
        const user = await this.usersCommandRepository.SQLfindUserByRecoveryCode(recoveryCode);

        if (!user) {
            throw new DomainException({
                code: DomainExceptionCode.PasswordRecoveryCodeExpired,
                message: 'Recovery code is wrong or expired',
            });
        }

        // Генерируем новый хэш пароля
        const newPasswordHash = await this.cryptoService.generateHash(newPassword);
        if (!newPasswordHash) {
            throw new InternalServerErrorException("Password hash wasn't generated!");
        }

        // Обновляем хэш пароля в доменной модели
        user.updatePasswordHash(newPasswordHash);

        // Сохраняем обновленного пользователя
        await this.usersCommandRepository.SQLsave(user);
    }
}