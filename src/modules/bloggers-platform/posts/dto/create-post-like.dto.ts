import { LikeStatus } from '../../../../core/enums/like-status.enum';

export type CreatePostLikeDto = {
    postId: string;
    userId: string;
    newLikeStatus: LikeStatus;
};
