import {
    PostLike,
    PostLikeDocument,
    PostLikeModelType,
} from '../../domain/post-like.entity';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { userInfo } from 'node:os';
import { LikeStatus } from '../../../../../core/enums/like-status.enum';
import { LatestLikeDetailViewDto } from '../../../posts/dto/view-dto/latest-like-detail.view-dto';

@Injectable()
export class PostLikesQueryRepository {
    constructor(
        @InjectModel(PostLike.name) private PostLikeModel: PostLikeModelType,
    ) {}

    async findSinglePostLikeByPostIdAndUserId(
        sentPostId: string,
        sentUserId: string,
    ): Promise<PostLikeDocument | null> {
        return this.PostLikeModel.findOne({
            postId: sentPostId,
            userId: sentUserId,
        });
    }

    async checkIfUserAlreadyReactedToPost(
        sentPostId: string,
        sentUserId: string,
    ): Promise<boolean> {
        return !!(await this.PostLikeModel.exists({
            postId: sentPostId,
            userId: sentUserId,
        }));
    }

    async getLatestLikesForPost(
        sentPostId: string,
    ): Promise<LatestLikeDetailViewDto[]> {
        const latestLikesArray = await this.PostLikeModel.find({
            postId: sentPostId,
            likeStatus: LikeStatus.Like,
        })
            .sort({ createdAt: -1 })
            .limit(3)
            .lean();

        return latestLikesArray.map((likeInfo) => {
            return {
                addedAt: likeInfo.updatedAt.toISOString(),
                userId: likeInfo.userId,
                login: likeInfo.userLogin,
            };
        });
    }

    async getReactionListForPosts(
        postIds: string[],
        userId: string,
    ): Promise<Array<{ postId: string; likeStatus: LikeStatus }>> {
        // 1. Ищем в базе документы, где userId совпадает,
        // а также значение поля postId находится внутри нашего массива postIds
        const reactions = await this.PostLikeModel.find({
            userId: userId,
            postId: { $in: postIds },
        }).lean(); // Используем lean для максимальной скорости (получаем чистые JS-объекты)

        // 2. Мапим результат к простому и понятному контракту,
        // приводя ObjectId к строкам, чтобы getAllPosts не спотыкался
        return reactions.map((reaction) => ({
            postId: reaction.postId.toString(),
            likeStatus: reaction.likeStatus, // Например: 'Like' или 'Dislike'
        }));
    }
}
