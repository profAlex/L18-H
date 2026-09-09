import { Command, CommandHandler, ICommandHandler, IQueryHandler, Query, QueryHandler } from '@nestjs/cqrs';
import { PostsQueryRepository } from '../../../bloggers-platform/posts/infrastructure/query/posts.query-repository';
import { GetAllPosts } from '../../../bloggers-platform/posts/application/usecases/get-all-posts.usecase';
import { PaginatedViewDto } from '../../../../core/dto/base.paginated.view-dto';
import { PostViewDto } from '../../../bloggers-platform/posts/api/view-dto/posts.view-dto';
import { SessionsQueryRepository } from '../../infrastructure/session/query/sessions.query-repository';
import { SessionsCommandRepository } from '../../infrastructure/session/sessions.command-repository';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';

export class Logout extends Command<void> { // This type represents the command execution result
    constructor(
        public readonly sessionId: string,
    ) {
        super();
    }
}

@CommandHandler(Logout)
export class LogoutHandler implements ICommandHandler<Logout> {
    constructor(private readonly sessionsCommandRepository: SessionsCommandRepository) {}

    async execute({
                      sessionId
    }: Logout): Promise<void> {
        const session = await this.sessionsCommandRepository.SQLfindSessionBySessionId(sessionId);
        if (!session) {
            throw new DomainException({
                code: DomainExceptionCode.Unauthorized,
                message: 'No such session',
            });
        }

        session.makeDeleted();
        await this.sessionsCommandRepository.SQLsave(session);
    }
}
