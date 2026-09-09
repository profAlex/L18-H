import { IQueryHandler, Query, QueryHandler } from '@nestjs/cqrs';
import { SQLMeViewDto } from '../../api/view-dto/me.view-dto';
import { UsersQueryRepository } from '../../../user-accounts/infrastructure/query/users.query-repository';

export class GetMeInfoQuery extends Query<SQLMeViewDto> {
    constructor(public readonly userId: string) {
        super();
    }
}

@QueryHandler(GetMeInfoQuery)
export class GetMeInfoQueryHandler implements IQueryHandler<GetMeInfoQuery> {
    constructor(
        // Обязательно используем QueryRepository для операций чтения
        private readonly usersQueryRepository: UsersQueryRepository,
    ) {}

    async execute(query: GetMeInfoQuery): Promise<SQLMeViewDto> {
        return this.usersQueryRepository.SQLgetMeByIdOrNotFoundFail(query.userId);
    }
}