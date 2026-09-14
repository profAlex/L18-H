import { Injectable } from '@nestjs/common';
import { GetPostsQueryParams } from '../../api/input-dto/get-posts-query-params.input-dto';
import { PostViewDto } from '../../api/view-dto/posts.view-dto';
import { PaginatedViewDto } from '../../../../../core/dto/base.paginated.view-dto';
import { InjectModel } from '@nestjs/mongoose';
import { Post, PostModelType } from '../../domain/post.entity';
import {
    BaseQueryParams,
    SortDirection,
} from '../../../../../core/dto/base.query-params.input-dto';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';
import { PostLikesQueryRepository } from '../../../likes/infrastructure/query/post-likes.query-repository';
import { LikeStatus } from '../../../../../core/enums/like-status.enum';
import { DataSource } from 'typeorm';

export interface postQueryRawDto {
    id: string;
    title: string;
    shortDescription: string;
    content: string;
    blogId: string;
    blogName: string;
    createdAt: string;
    likesCount: number;
    dislikesCount: number;
    myStatus: string;
}

export interface likeInfoQueryRawDto {
    postId: string;
    userId: string;
    addedAt: string;
    login: string;
}

@Injectable()
export class PostsQueryRepository {
    constructor(
        @InjectModel(Post.name) private PostModel: PostModelType,
        private readonly postLikesQueryRepository: PostLikesQueryRepository,
        private readonly dataSource: DataSource,
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

    async SQLgetPostsByBlogId({
        userId,
        blogId,
        query,
    }: {
        userId?: string | null;
        blogId: string;
        query: GetPostsQueryParams;
    }): Promise<PaginatedViewDto<PostViewDto>> {
        const { sortBy, sortDirection, pageNumber, pageSize } = query;

        const sortingMap: Record<string, string> = {
            title: 'title',
            shortDescription: 'short_description',
            content: 'content',
            blogId: 'blog_id',
            blogName: 'b.name',
            createdAt: 'p.created_at',
        };

        const sortingClause = sortingMap[sortBy] || 'p.created_at';
        const directionClause =
            sortDirection?.trim().toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        const limit = pageSize;
        const offset = query.calculateSkip();

        /* ITEMS STRUCTURE
        "items":
        [
            {
                "id": "string",
                "title": "string",
                "shortDescription": "string",
                "content": "string",
                "blogId": "string",
                "blogName": "string",
                "createdAt": "2026-09-11T16:25:24.289Z",
                "extendedLikesInfo":
                {
                    "likesCount": 0,
                    "dislikesCount": 0,
                    "myStatus": "None",
                    "newestLikes":
                    [
                        {
                            "addedAt": "2026-09-11T16:25:24.289Z",
                            "userId": "string",
                            "login": "string"
                        }
                    ]
                }
            }
        ]
        * */

        const postInfoQuery = `
            SELECT p.id,
                   p.title,
                   p.short_description        as "shortDescription",
                   p.content,
                   p.blog_id                  as "blogId",
                   b.name                     as "blogName",
                   p.created_at               as "createdAt",
                   p.likes_count              as "likesCount",
                   p.dislikes_count           as "dislikesCount",
                   COALESCE(l.status, 'None') AS "myStatus"
            FROM public.posts p
                     LEFT JOIN public.blogs b ON p.blog_id = b.id
                     LEFT JOIN public.post_likes l ON l.post_id = p.id AND l.user_id = $1
            WHERE p.deleted_at IS NULL
              AND p.blog_id = $2
            ORDER BY ${sortingClause} ${directionClause}
            LIMIT $3 OFFSET $4;
        `;

        const countQuery = `
            SELECT COUNT(*)::int AS "totalCount"
            FROM public.posts p
            WHERE p.deleted_at IS NULL
              AND p.blog_id = $1;
        `;

        const [postRows, countResult] = await Promise.all([
            this.dataSource.query<postQueryRawDto[]>(postInfoQuery, [
                userId ?? null,
                blogId,
                limit,
                offset,
            ]),
            this.dataSource.query<{ totalCount: number }[]>(countQuery, [
                blogId,
            ]),
        ]);

        const totalCount = countResult[0]?.totalCount ?? 0;

        // сразу возвращаем пустой результат и не делаем 2-й запрос если постов нет
        if (!postRows.length) {
            return PaginatedViewDto.mapToView<PostViewDto>({
                items: [],
                page: pageNumber,
                size: pageSize,
                totalCount: totalCount,
            });
        }

        const postIdArray = postRows.map((postRow) => postRow.id);

        const likesInfoQuery = `
            SELECT sub.post_id  AS "postId",
                   sub.user_id  AS "userId",
                   sub.added_at AS "addedAt",
                   u.login      AS "login"
            FROM (SELECT l.post_id,
                         l.user_id,
                         l.added_at,
                         ROW_NUMBER() OVER (PARTITION BY l.post_id ORDER BY l.added_at DESC ) as rn
                  FROM public.post_likes l
                  WHERE l.post_id = ANY ($1::uuid[])
                    AND l.status = 'Like') sub
                     JOIN public.users u ON sub.user_id = u.id
            WHERE sub.rn <= 3
            ORDER BY sub.post_id ASC, sub.added_at DESC;
        `;

        const likeInfoRows = await this.dataSource.query<likeInfoQueryRawDto[]>(
            likesInfoQuery,
            [postIdArray],
        );

        return PaginatedViewDto.mapToView<PostViewDto>({
            items: postRows.map((post) =>
                PostViewDto.mapToViewFromFlatSQL(post, likeInfoRows),
            ),
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

    async SQLgetAllPosts({
        sentUserId,
        query,
    }: {
        sentUserId?: string | undefined;
        query: GetPostsQueryParams;
    }): Promise<PaginatedViewDto<PostViewDto>> {
        const { sortBy, sortDirection, pageNumber, pageSize } = query;

        const sortingMap: Record<string, string> = {
            title: 'title',
            shortDescription: 'short_description',
            content: 'content',
            blogId: 'blog_id',
            blogName: 'b.name',
            createdAt: 'p.created_at',
        };

        const sortingClause = sortingMap[sortBy] || 'p.created_at';
        const directionClause =
            sortDirection?.trim().toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        const limit = pageSize;
        const offset = query.calculateSkip();

        const postInfoQuery = `
            SELECT p.id,
                   p.title,
                   p.short_description        as "shortDescription",
                   p.content,
                   p.blog_id                  as "blogId",
                   b.name                     as "blogName",
                   p.created_at               as "createdAt",
                   p.likes_count              as "likesCount",
                   p.dislikes_count           as "dislikesCount",
                   COALESCE(l.status, 'None') AS "myStatus"
            FROM public.posts p
                     LEFT JOIN public.blogs b ON p.blog_id = b.id
                     LEFT JOIN public.post_likes l ON l.post_id = p.id AND l.user_id = $1
            WHERE p.deleted_at IS NULL
            ORDER BY ${sortingClause} ${directionClause}
            LIMIT $2 OFFSET $3;
        `;

        const countQuery = `
            SELECT COUNT(*)::int AS "totalCount"
            FROM public.posts p
                     LEFT JOIN public.blogs b ON p.blog_id = b.id
            WHERE p.deleted_at IS NULL
              AND b.deleted_at IS NULL;
        `;

        const [postRows, countResult] = await Promise.all([
            this.dataSource.query<postQueryRawDto[]>(postInfoQuery, [
                sentUserId ?? null,
                limit,
                offset,
            ]),
            this.dataSource.query<{ totalCount: number }[]>(countQuery),
        ]);

        const totalCount = countResult[0]?.totalCount ?? 0;

        // сразу возвращаем пустой результат и не делаем 2-й запрос если постов нет
        if (!postRows.length) {
            return PaginatedViewDto.mapToView<PostViewDto>({
                items: [],
                page: pageNumber,
                size: pageSize,
                totalCount: totalCount,
            });
        }

        const postIdArray = postRows.map((postRow) => postRow.id);

        const likesInfoQuery = `
            SELECT sub.post_id  AS "postId",
                   sub.user_id  AS "userId",
                   sub.added_at AS "addedAt",
                   u.login      AS "login"
            FROM (SELECT l.post_id,
                         l.user_id,
                         l.added_at,
                         ROW_NUMBER() OVER (PARTITION BY l.post_id ORDER BY l.added_at DESC ) as rn
                  FROM public.post_likes l
                  WHERE l.post_id = ANY ($1::uuid[])
                    AND l.status = 'Like') sub
                     JOIN public.users u ON sub.user_id = u.id
            WHERE sub.rn <= 3
            ORDER BY sub.post_id ASC, sub.added_at DESC;
        `;

        const likeInfoRows = await this.dataSource.query<likeInfoQueryRawDto[]>(
            likesInfoQuery,
            [postIdArray],
        );

        return PaginatedViewDto.mapToView<PostViewDto>({
            items: postRows.map((post) =>
                PostViewDto.mapToViewFromFlatSQL(post, likeInfoRows),
            ),
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

    async SQLgetPostById({
        postId,
        userId,
    }: {
        postId: string;
        userId: string | undefined;
    }): Promise<PostViewDto | null> {

        /*
        {
          "id": "string",
          "title": "string",
          "shortDescription": "string",
          "content": "string",
          "blogId": "string",
          "blogName": "string",
          "createdAt": "2026-09-14T13:20:15.374Z",
          "extendedLikesInfo": {
            "likesCount": 0,
            "dislikesCount": 0,
            "myStatus": "None",
            "newestLikes": [
              {
                "addedAt": "2026-09-14T13:20:15.374Z",
                "userId": "string",
                "login": "string"
              }
            ]
          }
        }

        */

        const postQuery = `
            SELECT
                p.id                       AS "id",
                p.title                    AS "title",
                p.short_description        AS "shortDescription",
                p.content                  AS "content",
                p.blog_id                  AS "blogId",
                b.name                     AS "blogName",
                p.created_at               AS "createdAt",
                p.likes_count              AS "likesCount",
                p.dislikes_count           AS "dislikesCount",
                COALESCE(l.status, 'None') AS "myStatus"
            FROM public.posts p
                     JOIN public.blogs b ON p.blog_id = b.id AND b.deleted_at IS NULL
                     LEFT JOIN public.post_likes l ON l.post_id = p.id AND l.user_id = $2
            WHERE p.id = $1 AND p.deleted_at IS NULL
            LIMIT 1;
        `;

        const [postRow] = await this.dataSource.query<postQueryRawDto[]>(postQuery, [postId, userId ?? null]);
        if(!postRow){
            return null;
        }

        const likesInfoQuery = `
            SELECT l.post_id  AS "postId",
                   l.user_id  AS "userId",
                   l.added_at AS "addedAt",
                   u.login    AS "login"
            FROM public.post_likes l
                     JOIN public.users u ON l.user_id = u.id
            WHERE l.post_id = $1 AND l.status = 'Like'
            ORDER BY l.added_at DESC
            LIMIT 3;
        `;

        const likeInfoRow = await this.dataSource.query<likeInfoQueryRawDto[]>(likesInfoQuery, [postId]);

        return PostViewDto.mapToViewFromFlatSQL(postRow, likeInfoRow);
    }
}
