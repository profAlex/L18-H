import { ICommandHandler, Command, CommandHandler } from '@nestjs/cqrs';
import { SessionsCommandRepository } from '../../../authorisation/infrastructure/session/sessions.command-repository';
import { ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';

export class DeleteSessionByDeviceId extends Command<void> {
    constructor(
        public readonly userId: string,
        public readonly deviceId: string,
    ) {
        super();
    }
}

@CommandHandler(DeleteSessionByDeviceId)
export class DeleteSessionByDeviceIdHandler implements ICommandHandler<DeleteSessionByDeviceId> {
    constructor(
        private readonly sessionsCommandRepository: SessionsCommandRepository,
    ) {}

    async execute({
        userId,
        deviceId,
    }: DeleteSessionByDeviceId): Promise<void> {
        const session =
            await this.sessionsCommandRepository.SQLfindSessionByDeviceId(
                deviceId,
            );

        if (!session) {
            // throw new NotFoundException(`Session with deviceId ${deviceId} not found`);
            throw new DomainException({
                code: DomainExceptionCode.NotFound,
                message: `Session with deviceId ${deviceId} not found`,
            });
        }

        if (userId !== session.userId) {
            // throw new ForbiddenException(
            //     `Cannot delete session which doesn't belong to user: ${userId}`,
            // );

            throw new DomainException({
                code: DomainExceptionCode.Forbidden,
                message: `Cannot delete session which doesn't belong to user: ${userId}`,
            });
        }

        session.makeDeleted();
        await this.sessionsCommandRepository.SQLsave(session);
    }
}
