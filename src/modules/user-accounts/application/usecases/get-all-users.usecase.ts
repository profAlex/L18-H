import { IQueryHandler, Query, QueryHandler } from '@nestjs/cqrs';
import { PaginatedViewDto } from '../../../../core/dto/base.paginated.view-dto';
import { SQLUserViewDto, UserViewDto } from '../../api/view-dto/users.view-dto';
import { TestQuery } from '../../../authorisation/application/usecases/test-query.usecase';
import { SessionsCommandRepository } from '../../../authorisation/infrastructure/session/sessions.command-repository';
import { UsersCommandRepository } from '../../infrastructure/users.command-repository';
import { UsersQueryRepository } from '../../infrastructure/query/users.query-repository';
import { GetUsersQueryParams } from '../../api/input-dto/get-users-query-params.input-dto';

export class GetAllUsers extends Query<PaginatedViewDto<SQLUserViewDto>> {
    constructor(
        public readonly query: GetUsersQueryParams,
        // public readonly req: Request,
    ) {
        super();
    }
}

@QueryHandler(GetAllUsers)
export class GetAllUsersQueryHandler implements IQueryHandler<GetAllUsers> {
    constructor(
        // private usersExternalQueryRepository: UsersExternalQueryRepository,
        // private postsQueryRepository: PostsQueryRepository,
        // @InjectModel(Session.name) private SessionModel: SessionModelType,
        // private sessionsCommandRepository: SessionsCommandRepository,
        // private usersCommandRepository: UsersCommandRepository,
        private usersQueryRepository: UsersQueryRepository,
        // private jwtTokenProvider: JwtTokenProvider,
    ) {}

    async execute({query}: GetAllUsers): Promise<PaginatedViewDto<SQLUserViewDto>> {

        return this.usersQueryRepository.getAllUsers(query);

    }
}