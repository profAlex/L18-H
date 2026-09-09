import { Command, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UsersService } from '../../../user-accounts/application/users.service';
import { EmailService } from '../../../notifications/email.service';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';
import { UUIDGeneratorUtil } from '../../../../core/uuid-generation/uuid.service';
import { UsersCommandRepository } from '../../../user-accounts/infrastructure/users.command-repository';


export class ResendRegistrationEmailCommand extends Command<void> {
    constructor(public readonly email: string) {
        super();
    }
}

@CommandHandler(ResendRegistrationEmailCommand)
export class ResendRegistrationEmailHandler
    implements ICommandHandler<ResendRegistrationEmailCommand>
{
    constructor(
        private readonly emailService: EmailService,
        private readonly usersCommandRepository: UsersCommandRepository,
    ) {}

    async execute(command: ResendRegistrationEmailCommand): Promise<void> {
        const { email } = command;

        const user = await this.usersCommandRepository.SQLfindNotConfirmedByEmail(email);

        if (!user) {
            throw new DomainException({
                code: DomainExceptionCode.BadRequest,
                message: 'Email is already confirmed or user does not exist',
                extensions: [
                    {
                        message: 'Email is already confirmed or user does not exist',
                        key: 'email',
                    },
                ],
            });
        }

        const confirmationCode = UUIDGeneratorUtil.generateUUID();

        user.generateConfirmationCode(confirmationCode);

        await this.usersCommandRepository.SQLsave(user);

        await this.emailService.sendConfirmationEmail(email, confirmationCode);
    }
}