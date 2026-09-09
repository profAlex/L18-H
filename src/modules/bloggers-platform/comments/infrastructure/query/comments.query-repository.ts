import {
    Comment,
    CommentDocument,
    CommentModelType,
} from '../../domain/comment.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CommentViewDto } from '../../api/view-dto/comments.view-dto';
import { GetCommentsQueryParams } from '../../api/input-dto/get-comments-query-params.input-dto';
import { PaginatedViewDto } from '../../../../../core/dto/base.paginated.view-dto';
import { SortDirection } from '../../../../../core/dto/base.query-params.input-dto';
import { FlattenMaps, Types } from 'mongoose';
import { LikeStatus } from '../../../../../core/enums/like-status.enum';
import { CommentLikesQueryRepository } from '../../../likes/infrastructure/query/comment-likes.query-repository';

@Injectable()
export class CommentsQueryRepository {
    constructor(
        @InjectModel(Comment.name) private CommentModel: CommentModelType,
        private readonly commentLikesQueryRepository: CommentLikesQueryRepository,
    ) {}

    async getCommentById(
        commentId: string,
        userId?: string | undefined,
    ): Promise<CommentViewDto | null> {
        const comment = await this.CommentModel.findOne({
            _id: commentId,
            deletedAt: null,
        }).lean<FlattenMaps<CommentDocument> & { _id: Types.ObjectId }>();

        if (!comment) {
            return null;
        }

        let userReaction: LikeStatus = LikeStatus.None;
        if (userId) {
            userReaction =
                await this.commentLikesQueryRepository.getReactionForComment(
                    commentId,
                    userId,
                );
        }

        return CommentViewDto.mapToView(comment, userReaction);
    }

    async getCommentsByPostId({
        postId,
        query,
        userId,
    }: {
        postId: string;
        query: GetCommentsQueryParams;
        userId?: string | undefined;
    }): Promise<PaginatedViewDto<CommentViewDto>> {
        // 1. ЖЕСТКАЯ ЗАЩИТА: Проверяем, что sortBy существует и это не пустая строка
        const sortByField =
            query.sortBy && query.sortBy.trim() !== ''
                ? query.sortBy
                : 'createdAt';

        // 2. Страхуем направление сортировки
        const sortDirectionMultiplier =
            query.sortDirection === SortDirection.Asc ? 1 : -1;

        // 3. Страхуем пагинацию (на случай, если платформа пришлет NaN или 0)
        const pageSize =
            query.pageSize && query.pageSize > 0 ? query.pageSize : 10;
        const pageNumber =
            query.pageNumber && query.pageNumber > 0 ? query.pageNumber : 1;

        // Используем метод класса, но если он выдаст NaN/0, берем безопасный расчет
        const skip =
            query.calculateSkip() >= 0
                ? query.calculateSkip()
                : (pageNumber - 1) * pageSize;

        const sentPostId = postId;
        const sentUserId = userId;

        const filter = {
            deletedAt: null,
            ...(sentPostId ? { relatedPostId: sentPostId } : {}),
        };

        const [commentsList, totalCount] = await Promise.all([
            this.CommentModel.find(filter)
                // 4. Передаем гарантированно чистые и валидные данные в sort
                .sort({
                    [sortByField]: sortDirectionMultiplier,
                })
                .skip(skip)
                .limit(pageSize)
                .lean<
                    (FlattenMaps<CommentDocument> & { _id: Types.ObjectId })[]
                >(),

            this.CommentModel.countDocuments(filter),
        ]);

        const likesMap = new Map<string, LikeStatus>(); // Ключ: postId, Значение: likeStatus

        if (sentUserId && commentsList.length > 0) {
            const commentIdsList = commentsList.map((comment) =>
                comment._id.toString(),
            );

            const userReactions =
                await this.commentLikesQueryRepository.getReactionListForComments(
                    commentIdsList,
                    sentUserId,
                );

            userReactions.forEach((reaction) => {
                likesMap.set(
                    reaction.commentId.toString(),
                    reaction.likeStatus,
                );
            });
        }

        return PaginatedViewDto.mapToView<CommentViewDto>({
            items: commentsList.map((item) => {
                const commentIdStr = item._id.toString();
                const myStatus = likesMap.get(commentIdStr) || LikeStatus.None;
                return CommentViewDto.mapToView(item, myStatus);
            }),
            page: pageNumber,
            size: pageSize,
            totalCount: totalCount,
        });
    }
}
