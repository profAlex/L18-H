import { Command, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UsersCommandRepository } from '../../../user-accounts/infrastructure/users.command-repository';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';

export class ConfirmRegistrationCommand extends Command<void> {
    constructor(public readonly code: string) {
        super();
    }
}

@CommandHandler(ConfirmRegistrationCommand)
export class ConfirmRegistrationHandler implements ICommandHandler<ConfirmRegistrationCommand> {
    constructor(
        private readonly usersCommandRepository: UsersCommandRepository,
    ) {}

    async execute({ code }: ConfirmRegistrationCommand): Promise<void> {
        const userToBeConfirmed =
            await this.usersCommandRepository.SQLfindUserByConfirmationCode(
                code,
            );
        // console.warn("...name:", userToBeConfirmed?.name);
        // console.warn("...confirmation code received:", code);
        // console.warn("...for user:", userToBeConfirmed?.id);

        if (!userToBeConfirmed) {
            throw new DomainException({
                code: DomainExceptionCode.ConfirmationCodeExpired,
                message:
                    'Email confirmation code is wrong, outdated or not found.',
                extensions: [
                    {
                        message:
                            'Email confirmation code is wrong, outdated or not found.',
                        key: 'code',
                    },
                ],
            });
        }

        userToBeConfirmed.confirmEmail();

        // console.warn("...confirmation marked successfully");

        await this.usersCommandRepository.SQLsave(userToBeConfirmed);
    }
}
