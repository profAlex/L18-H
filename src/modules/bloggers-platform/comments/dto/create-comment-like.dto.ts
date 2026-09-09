import { LikeStatus } from '../../../../core/enums/like-status.enum';

export type CreateCommentLikeDto = {
    commentId: string;
    userId: string;
    newLikeStatus: LikeStatus;
};
