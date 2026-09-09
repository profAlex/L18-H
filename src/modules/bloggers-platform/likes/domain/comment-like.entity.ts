// commentId: { type: String, required: true },
// userId: { type: String, required: true },
// likeStatus: {
//     type: String,
//     enum: Object.values(LikeStatus),
//         required: true,
// default: LikeStatus.None
// },
// createdAt: {
//     type: Date,
// default: Date.now
//     // просто {type: Date, default: new Date()} нельзя!
//     // когда пишем код схемы, Node.js выполняет его один раз при старте приложения,
//     // чтобы создать объект Schema
//     // ВЫЗОВ ПРОИСХОДИТ ЗДЕСЬ И СЕЙЧАС, в момент старта приложения и запоминается как дефолтный
//     // нужно передавать ссылку на функцию либо Date.now либо () => new Date()
// },

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { LikeStatus } from '../../../../core/enums/like-status.enum';
import { HydratedDocument, Model } from 'mongoose';
import { CreateCommentLikeDomainDto } from './dto/create-comment-like.domain.dto';
import { UpdateCommentLikeDomainDto } from './dto/update-comment-like.domain.dto';

@Schema({ timestamps: true })
export class CommentLike {
    @Prop({ type: String, required: true })
    commentId!: string;

    @Prop({ type: String, required: true })
    userId!: string;

    createdAt!: Date;
    updatedAt!: Date;

    @Prop({ type: Date, nullable: true })
    deletedAt!: Date | null;

    @Prop({
        type: String,
        enum: LikeStatus,
    })
    likeStatus!: LikeStatus;

    get id(): string {
        // @ts-ignore
        return this._id.toString();
    }

    static createInstance({
        commentId,
        userId,
    }: CreateCommentLikeDomainDto): CommentLikeDocument {
        const newPostLike = new this(); // this: Model<CommentLikeDocument> в аргументы для того чтобы можно было обращаться к _id до того как
        // const newPostLike = new this({
        //             postId,
        //             userId,
        //             deletedAt: null,
        //             likeStatus: LikeStatus.None,
        //         });
        newPostLike.commentId = commentId;
        newPostLike.userId = userId;

        newPostLike.createdAt = new Date();
        newPostLike.deletedAt = null;
        newPostLike.likeStatus = LikeStatus.None;

        return newPostLike as CommentLikeDocument;
    }

    // makeDeleted() {
    //     if (this.deletedAt !== null) {
    //         return;
    //     }
    //     this.deletedAt = new Date();
    // }

    updateLikeStatus(dto: UpdateCommentLikeDomainDto): boolean {
        if (this.likeStatus === dto.likeStatus) {
            return false;
        }

        this.likeStatus = dto.likeStatus;
        return true;
    }
}

export const CommentLikeSchema = SchemaFactory.createForClass(CommentLike);

//регистрирует методы сущности в схеме
CommentLikeSchema.loadClass(CommentLike);

// составной индекс для поиска конкретного лайка от конкретного юзера
// индекс уникальный
CommentLikeSchema.index({ commentId: 1, userId: 1 }, { unique: true });

//Типизация документа
export type CommentLikeDocument = HydratedDocument<CommentLike>;

//Типизация модели + статические методы
export type CommentLikeModelType = Model<CommentLikeDocument> &
    typeof CommentLike;
