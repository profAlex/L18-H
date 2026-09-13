import { IQueryHandler, Query, QueryHandler } from '@nestjs/cqrs';
import { BlogViewDto, SQLBlogViewDto } from '../../api/view-dto/blogs.view-dto';
import { BlogsQueryRepository } from '../../infrastructure/query/blogs.query-repository';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';

export class GetBlogByIdQuery extends Query<BlogViewDto> {
    constructor(public readonly blogId: string) {
        super();
    }
}

@QueryHandler(GetBlogByIdQuery)
export class GetBlogByIdQueryHandler
    implements IQueryHandler<GetBlogByIdQuery>
{
    constructor(
        private readonly blogsQueryRepository: BlogsQueryRepository,
    ) {}

    async execute(query: GetBlogByIdQuery): Promise<SQLBlogViewDto> {

        const blog = await this.blogsQueryRepository.SQLgetBlogById(query.blogId);

        if (!blog) {
            throw new DomainException({
                code: DomainExceptionCode.BlogNotFound,
                message: 'Blog not found',
            });
        }

        return blog;
    }
}