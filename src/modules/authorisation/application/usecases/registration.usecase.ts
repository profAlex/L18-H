import { Command, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CryptoService } from '../../../../core/bcrypt/bcrypt.service';
import { UsersCommandRepository } from '../../../user-accounts/infrastructure/users.command-repository';
import { EmailService } from '../../../notifications/email.service';
import { SQLUser } from '../../../user-accounts/domain/sql-user.entitry';
import { InternalServerErrorException } from '@nestjs/common';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';
import { UUIDGeneratorUtil } from '../../../../core/uuid-generation/uuid.service';

export class RegisterUserCommand extends Command<void> {
    constructor(
        public readonly login: string,
        public readonly password: string,
        public readonly email: string,
    ) {
        super();
    }
}

@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler implements ICommandHandler<RegisterUserCommand> {
    constructor(
        private readonly usersCommandRepository: UsersCommandRepository,
        private readonly cryptoService: CryptoService,
        private readonly emailService: EmailService,
    ) {}

    async execute({ login, password, email }: RegisterUserCommand): Promise<void> {
        // 1. Проверяем уникальность login и email
        const takenField = await this.usersCommandRepository.SQLcheckIfUserExists(
            login,
            email,
        );

        if (takenField) {
            throw new DomainException({
                code: DomainExceptionCode.UserBadRequest,
                message: `User with this ${takenField} already exists`,
                extensions: [
                    {
                        message: `${takenField === 'login' ? 'Login' : 'Email'} is already taken`,
                        key: takenField,
                    },
                ],
            });
        }

        // 2. Генерируем хэш пароля
        const passwordHash = await this.cryptoService.generateHash(password);
        if (!passwordHash) {
            throw new InternalServerErrorException("Couldn't generate password hash");
        }

        // 3. Генерируем код подтверждения
        const confirmationCode = UUIDGeneratorUtil.generateUUID();

        // 4. Инстанцируем доменный объект через ваш фабричный метод
        const newUser = SQLUser.createInstance({
            login,
            email,
            passwordHash,
            confirmationCode,
        });

        // 5. Сохраняем в PostgreSQL
        await this.usersCommandRepository.SQLsave(newUser);

        const codeToSend = newUser.emailConfirmationInfo?.confirmationCode;
        if (!codeToSend) {
            throw new InternalServerErrorException(
                'Email confirmation code was not generated!',
            );
        }

        // console.warn("...about to send email... code:", codeToSend );
        // 6. Отправляем подтверждение на почту
        await this.emailService.sendConfirmationEmail(
            newUser.email,
            codeToSend,
        );
    }
}