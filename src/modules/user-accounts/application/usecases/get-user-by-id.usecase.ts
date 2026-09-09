import { SQLUser } from '../../domain/sql-user.entitry';
import { IQueryHandler, Query, QueryHandler } from '@nestjs/cqrs';
import { UsersQueryRepository } from '../../infrastructure/query/users.query-repository';
import { SQLUserViewDto } from '../../api/view-dto/users.view-dto';

export class GetUserByIdOrNotFoundFail extends Query<SQLUserViewDto> {
    constructor(public readonly id: string) {
        super();
    }
}

@QueryHandler(GetUserByIdOrNotFoundFail)
export class GetUserByIdOrNotFoundHandler implements IQueryHandler<GetUserByIdOrNotFoundFail> {
    constructor(private usersQueryRepository: UsersQueryRepository) {}

    async execute(query: GetUserByIdOrNotFoundFail): Promise<SQLUserViewDto> {
        const {id} = query;

        return this.usersQueryRepository.SQLgetByIdOrNotFoundFail(id);
    }
}
