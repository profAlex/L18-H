import { PostViewDto } from '../../api/view-dto/posts.view-dto';
import { IQueryHandler, Query, QueryHandler } from '@nestjs/cqrs';
import { PostsQueryRepository } from '../../infrastructure/query/posts.query-repository';
import { PostLikesQueryRepository } from '../../../likes/infrastructure/query/post-likes.query-repository';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';

export class GetPostById extends Query<PostViewDto> {
    constructor(
        public readonly postId: string,
        public readonly userId: string | undefined,
    ) {
        super();
    }
}

@QueryHandler(GetPostById)
export class GetPostByIdHandler implements IQueryHandler<GetPostById> {
    constructor(
        private postsQueryRepository: PostsQueryRepository,
        private postLikesQueryRepository: PostLikesQueryRepository,
    ) {}

    // тут обрабатываем два сценария - аноноимный (user = undefined) и неанонимный запрос
    async execute({ postId, userId }: GetPostById): Promise<PostViewDto> {
        const postView = await this.postsQueryRepository.SQLgetPostById({
            postId,
            userId,
        });

        if (!postView) {
            // throw new NotFoundException("Post not found");
            throw new DomainException({
                code: DomainExceptionCode.PostNotFound,
                message: `Post not found`,
            });
        }

        return postView;
    }
}
