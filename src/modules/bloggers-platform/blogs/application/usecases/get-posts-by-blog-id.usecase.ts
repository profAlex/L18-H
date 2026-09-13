import { GetPostsQueryParams } from '../../../posts/api/input-dto/get-posts-query-params.input-dto';
import { IQueryHandler, Query, QueryHandler } from '@nestjs/cqrs';
import { PaginatedViewDto } from '../../../../../core/dto/base.paginated.view-dto';
import { PostViewDto } from '../../../posts/api/view-dto/posts.view-dto';
import { BlogsQueryRepository } from '../../infrastructure/query/blogs.query-repository';
import { PostsQueryRepository } from '../../../posts/infrastructure/query/posts.query-repository';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';

export class GetPostsByBlogIdQuery extends Query<PaginatedViewDto<PostViewDto>> {
    constructor(
        public readonly blogId: string,
        public readonly queryParams: GetPostsQueryParams,
        public readonly userId?: string | null,
    ) {
        super();
    }
}

@QueryHandler(GetPostsByBlogIdQuery)
export class GetPostsByBlogIdQueryHandler
    implements IQueryHandler<GetPostsByBlogIdQuery>
{
    constructor(
        private readonly blogsQueryRepository: BlogsQueryRepository,
        private readonly postsQueryRepository: PostsQueryRepository,
    ) {}

    async execute(
        query: GetPostsByBlogIdQuery,
    ): Promise<PaginatedViewDto<PostViewDto>> {
        const { blogId, queryParams, userId } = query;

        const blogExists = await this.blogsQueryRepository.SQLifBlogExists(blogId);
        if (!blogExists) {
            throw new DomainException({
                code: DomainExceptionCode.BlogNotFound,
                message: 'Blog not found',
            });
        }

        return this.postsQueryRepository.SQLgetPostsByBlogId({
            userId,
            blogId,
            query: queryParams,
        });
    }
}