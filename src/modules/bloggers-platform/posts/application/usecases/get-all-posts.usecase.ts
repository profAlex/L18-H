import { IQueryHandler, Query, QueryHandler } from '@nestjs/cqrs';
import { PaginatedViewDto } from '../../../../../core/dto/base.paginated.view-dto';
import { PostViewDto } from '../../api/view-dto/posts.view-dto';
import { GetPostsQueryParams } from '../../api/input-dto/get-posts-query-params.input-dto';
import { PostsQueryRepository } from '../../infrastructure/query/posts.query-repository';

export class GetAllPosts extends Query<
    PaginatedViewDto<PostViewDto> // This type represents the command execution result
> {
    constructor(
        public readonly query: GetPostsQueryParams,
        public readonly userId: string | undefined,
    ) {
        super();
    }
}

@QueryHandler(GetAllPosts)
export class GetAllPostsHandler implements IQueryHandler<GetAllPosts> {
    constructor(private readonly postsQueryRepository: PostsQueryRepository) {}

    async execute({
        query,
        userId,
    }: GetAllPosts): Promise<PaginatedViewDto<PostViewDto>> {
        return this.postsQueryRepository.getAllPosts({
            sentUserId: userId,
            query,
        });
    }
}
