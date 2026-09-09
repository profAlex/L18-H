import { Command, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UUIDGeneratorUtil } from '../../../../core/uuid-generation/uuid.service';
import { EmailService } from '../../../notifications/email.service';
import { UsersCommandRepository } from '../../../user-accounts/infrastructure/users.command-repository';

export class PasswordRecoveryCommand extends Command<void> {
    constructor(public readonly email: string) {
        super();
    }
}

@CommandHandler(PasswordRecoveryCommand)
export class PasswordRecoveryHandler implements ICommandHandler<PasswordRecoveryCommand> {
    constructor(
        private readonly usersCommandRepository: UsersCommandRepository,
        private emailService: EmailService,
    ) {}

    async execute({ email }: PasswordRecoveryCommand): Promise<void> {
        // Ищем подтвержденного пользователя в БД
        const user =
            await this.usersCommandRepository.SQLfindConfirmedUserByEmail(
                email,
            );

        if (!user) {
            // Возвращаем успех даже если email не найден (защита от перечисления пользователей)
            return;
        }

        // Генерируем код восстановления и обновляем доменную модель пользователя
        const recoveryCode = UUIDGeneratorUtil.generateUUID();
        user.generateRecoveryCode(recoveryCode);

        // Сохраняем обновленного пользователя
        await this.usersCommandRepository.SQLsave(user);

        // Отправляем письмо с кодом
        await this.emailService.sendRecoveryEmail(email, recoveryCode);
    }
}
