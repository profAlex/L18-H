import { ICommandHandler, Command, CommandHandler } from '@nestjs/cqrs';
import { SessionsCommandRepository } from '../../../authorisation/infrastructure/session/sessions.command-repository';

export class DeleteAllSessionsButCurrentOne extends Command<void> {
    constructor(
        public readonly userId: string,
        public readonly sessionId: string,
    ) {
        super();
    }
}

@CommandHandler(DeleteAllSessionsButCurrentOne)
export class DeleteAllSessionsButCurrentOneHandler
    implements ICommandHandler<DeleteAllSessionsButCurrentOne>
{
    constructor(
        private readonly sessionsCommandRepository: SessionsCommandRepository,
    ) {}

    async execute({ userId, sessionId }: DeleteAllSessionsButCurrentOne): Promise<void> {
        await this.sessionsCommandRepository.SQLsoftDeleteAllButOneSession({
            sessionId,
            userId,
        });
    }
}


