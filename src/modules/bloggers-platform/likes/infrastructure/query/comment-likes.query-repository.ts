import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
    CommentLike,
    CommentLikeDocument,
    CommentLikeModelType,
} from '../../domain/comment-like.entity';
import { LikeStatus } from '../../../../../core/enums/like-status.enum';

@Injectable()
export class CommentLikesQueryRepository {
    constructor(
        @InjectModel(CommentLike.name)
        private CommentLikeModel: CommentLikeModelType,
    ) {}

    async findSingleCommentLikeByPostIdAndUserId(
        sentPostId: string,
        sentUserId: string,
    ): Promise<CommentLikeDocument | null> {
        return this.CommentLikeModel.findOne({
            postId: sentPostId,
            userId: sentUserId,
        });
    }

    async checkIfUserAlreadyReactedToComment(
        sentPostId: string,
        sentUserId: string,
    ): Promise<boolean> {
        return !!(await this.CommentLikeModel.exists({
            postId: sentPostId,
            userId: sentUserId,
        }));
    }

    async getReactionForComment(
        commentId: string,
        userId: string,
    ): Promise<LikeStatus> {
        const reaction = await this.CommentLikeModel.findOne({
            commentId: commentId,
            userId: userId,
        }).lean(); // Используем lean для максимальной скорости (получаем чистые JS-объекты)

        return reaction?.likeStatus ?? LikeStatus.None;
    }

    async getReactionListForComments(
        commentIds: string[],
        userId: string,
    ): Promise<Array<{ commentId: string; likeStatus: LikeStatus }>> {
        // ищем в базе документы, где userId совпадает,
        // а также значение поля commentId находится внутри нашего массива commentIds
        const reactions = await this.CommentLikeModel.find({
            userId: userId,
            commentId: { $in: commentIds },
        }).lean(); // Используем lean для максимальной скорости (получаем чистые JS-объекты)

        // приводя ObjectId к строкам, чтобы getCommentsByPostId не спотыкался
        return reactions.map((reaction) => ({
            commentId: reaction.commentId.toString(),
            likeStatus: reaction.likeStatus, // Например: 'Like' или 'Dislike'
        }));
    }

    // async getLatestLikesForComment(
    //     sentPostId: string,
    // ): Promise<LatestLikeDetailViewDto[]> {
    //     const latestLikesArray = await this.PostLikeModel.find({
    //         postId: sentPostId,
    //         likeStatus: LikeStatus.Like,
    //     })
    //         .sort({ createdAt: -1 })
    //         .limit(3)
    //         .lean();
    //
    //     return latestLikesArray.map((likeInfo) => {
    //         return {
    //             addedAt: likeInfo.updatedAt.toISOString(),
    //             userId: likeInfo.userId,
    //             login: likeInfo.userLogin,
    //         };
    //     });
    // }
}
