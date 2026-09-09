import { Injectable } from '@nestjs/common';
import { GetPostsQueryParams } from '../../api/input-dto/get-posts-query-params.input-dto';
import { PostViewDto } from '../../api/view-dto/posts.view-dto';
import { PaginatedViewDto } from '../../../../../core/dto/base.paginated.view-dto';
import { InjectModel } from '@nestjs/mongoose';
import { Post, PostModelType } from '../../domain/post.entity';
import { SortDirection } from '../../../../../core/dto/base.query-params.input-dto';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';
import { PostLikesQueryRepository } from '../../../likes/infrastructure/query/post-likes.query-repository';
import { LikeStatus } from '../../../../../core/enums/like-status.enum';

@Injectable()
export class PostsQueryRepository {
    constructor(
        @InjectModel(Post.name) private PostModel: PostModelType,
        private readonly postLikesQueryRepository: PostLikesQueryRepository,
    ) {}

    async ifPostExists(id: string): Promise<boolean> {
        const count = await this.PostModel.countDocuments({
            _id: id,
            deletedAt: null,
        });

        return count > 0;
    }

    async getPostsByBlogId({
        userId,
        blogId,
        query,
    }: {
        userId?: string | null;
        blogId: string;
        query: GetPostsQueryParams;
    }): Promise<PaginatedViewDto<PostViewDto>> {
        const { sortBy, sortDirection, pageNumber, pageSize } = query;
        const sentBlogId = blogId;
        const sentUserId = userId;

        const skip = query.calculateSkip();
        // const skip = (pageNumber - 1) * pageSize;
        const filter = {
            deletedAt: null,
            ...(sentBlogId ? { blogId: sentBlogId } : {}),
        };

        const [postsList, totalCount] = await Promise.all([
            this.PostModel.find(filter)
                .sort({
                    [sortBy]: sortDirection === SortDirection.Asc ? 1 : -1,
                })
                .skip(skip)
                .limit(pageSize)
                .lean(),

            this.PostModel.countDocuments(filter),
        ]);

        const likesMap = new Map<string, LikeStatus>(); // Ключ: postId, Значение: likeStatus

        if (sentUserId && postsList.length > 0) {
            const postIdsList = postsList.map((post) => post._id.toString());

            const userReactions =
                await this.postLikesQueryRepository.getReactionListForPosts(
                    postIdsList,
                    sentUserId,
                );

            userReactions.forEach((reaction) => {
                likesMap.set(reaction.postId.toString(), reaction.likeStatus);
            });
        }

        return PaginatedViewDto.mapToView<PostViewDto>({
            items: postsList.map((item) => {
                const postIdStr = item._id.toString();
                const myStatus = likesMap.get(postIdStr) || LikeStatus.None;
                return PostViewDto.mapToView(item, myStatus);
            }),
            page: pageNumber,
            size: pageSize,
            totalCount: totalCount,
        });
    }

    // задача - в каждый отдельный пост в общей выдаче, вставить статус лайка
    // выданного (или не выданного) юзером, который запросил саму выдачу.
    // то есть найти как лайкнул или не лайкнул пост в выдаче юзер

    // для этого:
    // 1) находим все посты по заданным параметрам сортировки
    // 2) отдельно выдираем только адишники постов которые были сформированы
    // выдачей в массив и идем в репозиторий харнящий лайки постов и находим
    // по фильтру юзера все посты которые были им лайкнуты одним запросом find;
    // формируем массив содержащий postId и likeStatus
    // 3) далее сформированный массив переделываем в словарь map в котором каждому
    // postId соответствует likeStatus
    // 4) методами mapToView последовательно маппим результат
    async getAllPosts({
        sentUserId,
        query,
    }: {
        sentUserId?: string | undefined;
        query: GetPostsQueryParams;
    }): Promise<PaginatedViewDto<PostViewDto>> {
        const { sortBy, sortDirection, pageNumber, pageSize } = query;
        const skip = query.calculateSkip();
        const filter = {
            deletedAt: null,
        };
        const [postsList, totalCount] = await Promise.all([
            this.PostModel.find(filter)
                .sort({
                    [sortBy]: sortDirection === SortDirection.Asc ? 1 : -1,
                })
                .skip(skip)
                .limit(pageSize)
                .lean(),
            this.PostModel.countDocuments(filter),
        ]);

        const likesMap = new Map<string, LikeStatus>(); // Ключ: postId, Значение: likeStatus

        if (sentUserId && postsList.length > 0) {
            const postIdsList = postsList.map((post) => post._id.toString());

            const userReactions =
                await this.postLikesQueryRepository.getReactionListForPosts(
                    postIdsList,
                    sentUserId,
                );

            userReactions.forEach((reaction) => {
                likesMap.set(reaction.postId.toString(), reaction.likeStatus);
            });
        }

        return PaginatedViewDto.mapToView<PostViewDto>({
            items: postsList.map((item) => {
                const postIdStr = item._id.toString();
                const myStatus = likesMap.get(postIdStr) || LikeStatus.None;
                return PostViewDto.mapToView(item, myStatus);
            }),
            page: pageNumber,
            size: pageSize,
            totalCount: totalCount,
        });
    }

    async getPostByIdOrNotFoundFail(sentPostId: string): Promise<PostViewDto> {
        const post = await this.PostModel.findOne({
            deletedAt: null,
            _id: sentPostId,
        });
        if (!post) {
            // throw new NotFoundException("Post not found");
            throw new DomainException({
                code: DomainExceptionCode.PostNotFound,
                message: `Post not found`,
            });
        }

        return PostViewDto.mapToView(post);
    }
}
