import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
    CommentatorInfo,
    CommentatorInfoSchema,
} from './commentator-info.schema';
import { LikesInfo, LikesInfoSchema } from './likes-info.schema';
import { HydratedDocument, Model } from 'mongoose';
import { CreateCommentDomainInputDto } from './dto/create-comment.domain.input-dto';
import { LikeStatus } from '../../../../core/enums/like-status.enum';
import { UpdateCommentDomainInputDto } from './dto/update-comment.domain-input-dto';

// export type CommentStorageModel = {
//     _id: ObjectId;
//     id: string;
//     relatedPostId: string;
//     content: string;
//     commentatorInfo: CommentatorInfo;
//     createdAt: Date;
//     likesInfo: LikesInfoViewModel;
// };
//
// export type CommentatorInfo = {
//     userId: string;
//     userLogin: string;
// };
//
// export type LikesInfo = {
//     likesCount: number;
//     dislikesCount: number;
//     myStatus: LikeStatus;
// }

// export enum LikeStatus {
//     None = 'None',
//     Like = 'Like',
//     Dislike = 'Dislike'
// }

@Schema({ timestamps: true })
export class Comment {
    @Prop({ type: String, required: true })
    relatedPostId!: string;

    @Prop({ type: String, required: true })
    content!: string;

    @Prop({ type: CommentatorInfoSchema, required: true })
    commentatorInfo!: CommentatorInfo;

    createdAt!: Date;
    updatedAt!: Date;

    @Prop({ type: Date, nullable: true })
    deletedAt!: Date | null;

    @Prop({ type: LikesInfoSchema })
    likesInfo!: LikesInfo;

    get id(): string {
        // @ts-ignore
        return this._id.toString();
    }

    static createInstance(dto: CreateCommentDomainInputDto): CommentDocument {
        const newComment = new this(); // new this() можно переписать чтобы использовать саму модель Mongoose: this: Model<CommentDocument>,
        newComment.relatedPostId = dto.relatedPostId;
        newComment.content = dto.content;
        newComment.commentatorInfo = {
            userId: dto.commentatorInfo.userId,
            userLogin: dto.commentatorInfo.userLogin,
        };
        newComment.createdAt = new Date();
        newComment.deletedAt = null;
        newComment.likesInfo = {
            likesCount: 0,
            dislikesCount: 0,
            myStatus: LikeStatus.None,
        };

        return newComment as CommentDocument;
    }

    makeDeleted() {
        if (this.deletedAt !== null) {
            return;
        }

        this.deletedAt = new Date();
    }

    updateComment(dto: UpdateCommentDomainInputDto): boolean {
        if (this.content === dto.content) {
            return false;
        }

        this.content = dto.content;
        return true;
    }
}

export const CommentSchema = SchemaFactory.createForClass(Comment);

//регистрирует методы сущности в схеме
CommentSchema.loadClass(Comment);

//Типизация документа
export type CommentDocument = HydratedDocument<Comment>;

//Типизация модели + статические методы
export type CommentModelType = Model<CommentDocument> & typeof Comment;
