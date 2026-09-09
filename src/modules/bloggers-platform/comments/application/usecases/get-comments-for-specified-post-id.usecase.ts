import {
    Query,
    CommandHandler,
    ICommandHandler,
    QueryHandler,
    IQueryHandler,
} from '@nestjs/cqrs';
import { GetCommentsQueryParams } from '../../api/input-dto/get-comments-query-params.input-dto';
import { PaginatedViewDto } from '../../../../../core/dto/base.paginated.view-dto';
import { CommentViewDto } from '../../api/view-dto/comments.view-dto';
import { PostsQueryRepository } from '../../../posts/infrastructure/query/posts.query-repository';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';
import { CommentsQueryRepository } from '../../infrastructure/query/comments.query-repository';

export class GetCommentsForSpecificPostId extends Query<
    PaginatedViewDto<CommentViewDto> // This type represents the command execution result
> {
    constructor(
        public readonly postId: string,
        public readonly query: GetCommentsQueryParams,
        public readonly userId?: string | undefined,
    ) {
        super();
    }
}

@QueryHandler(GetCommentsForSpecificPostId)
export class GetCommentsForSpecificPostIdHandler implements IQueryHandler<GetCommentsForSpecificPostId> {
    constructor(
        private readonly postsQueryRepository: PostsQueryRepository,
        private readonly commentsQueryRepository: CommentsQueryRepository,
    ) {}

    async execute({ postId, query, userId }: GetCommentsForSpecificPostId) {
        // const { postId, query, userId } = busQueryDto;
        if (!(await this.postsQueryRepository.ifPostExists(postId))) {
            throw new DomainException({
                code: DomainExceptionCode.CommentNotFound,
                message: 'Post not found',
            });
        }
        return await this.commentsQueryRepository.getCommentsByPostId({
            postId,
            query,
            userId,
        });
    }
}
