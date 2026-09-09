import { PostViewDto } from '../../api/view-dto/posts.view-dto';
import { IQueryHandler, Query, QueryHandler } from '@nestjs/cqrs';
import { PostsQueryRepository } from '../../infrastructure/query/posts.query-repository';
import { PostLikesQueryRepository } from '../../../likes/infrastructure/query/post-likes.query-repository';

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
        // проверяем есть ли пост и получаем его экземпляр для дальнейшей работы
        const postView =
            await this.postsQueryRepository.getPostByIdOrNotFoundFail(postId);

        // если пользователя нет, нам нечего проверять, возвращаем пост
        if (!userId) {
            return postView;
        }

        // если же юзер есть, то ищем лайк
        const userLikeReaction =
            await this.postLikesQueryRepository.findSinglePostLikeByPostIdAndUserId(
                postId,
                userId,
            );

        // если лайк нашли — меняем статус прямо в нашем свежем объекте
        if (userLikeReaction) {
            postView.extendedLikesInfo.myStatus = userLikeReaction.likeStatus;
        }

        // возвращаем пост
        return postView;
    }
}
