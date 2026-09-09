import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
    CommentLike,
    CommentLikeDocument,
    CommentLikeModelType,
} from '../domain/comment-like.entity';
import { PostLikeDocument } from '../domain/post-like.entity';

@Injectable()
export class CommentLikesCommandRepository {
    constructor(
        @InjectModel(CommentLike.name)
        private CommentLikeModel: CommentLikeModelType,
    ) {}

    async save(commentLike: CommentLikeDocument): Promise<void> {
        await commentLike.save();
    }

    async findSingleCommentLikeByCommentIdAndUserId({
        commentId,
        userId,
    }: {
        commentId: string;
        userId: string;
    }): Promise<CommentLikeDocument | null> {
        return this.CommentLikeModel.findOne({
            commentId,
            userId,
        });
    }
}
