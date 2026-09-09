// {
//     // Мы не объявляем _id явно, Mongoose создаст его сам
//     postId: { type: String, required: true },
//     userId: { type: String, required: true },
//     userLogin: { type: String, required: true },
//     createdAt: {
//         type: Date,
//     default: Date.now,
//         // просто {type: Date, default: new Date()} нельзя!
//         // когда пишем код схемы, Node.js выполняет его один раз при старте приложения,
//         // чтобы создать объект Schema
//         // ВЫЗОВ ПРОИСХОДИТ ЗДЕСЬ И СЕЙЧАС, в момент старта приложения и запоминается как дефолтный
//         // нужно передавать ссылку на функцию либо Date.now либо () => new Date()
//     },
//     likeStatus: {
//         type: String,
//         enum: Object.values(LikeStatus),
//         required: true,
//         default: LikeStatus.None,
//     },
// },

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { LikeStatus } from '../../../../core/enums/like-status.enum';
import { HydratedDocument, Model } from 'mongoose';
import { CreatePostLikeDomainDto } from './dto/create-post-like.domain.dto';
import { UpdatePostLikeDomainDto } from './dto/update-post-like.domain.dto';

@Schema({ timestamps: true })
export class PostLike {
    @Prop({ type: String, required: true })
    postId!: string;

    @Prop({ type: String, required: true })
    userId!: string;

    @Prop({ type: String, required: true })
    userLogin!: string;

    createdAt!: Date;
    updatedAt!: Date;

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
        postId,
        userId,
        userLogin,
    }: CreatePostLikeDomainDto): PostLikeDocument {
        const newPostLike = new this(); // this: Model<PostLikeDocument> в аргументы для того чтобы можно было обращаться к _id до того как
        // const newPostLike = new this({
        //             postId,
        //             userId,
        //             userLogin,
        //             deletedAt: null,
        //             likeStatus: LikeStatus.None,
        //         });
        newPostLike.postId = postId;
        newPostLike.userId = userId;
        newPostLike.userLogin = userLogin;

        newPostLike.createdAt = new Date();
        newPostLike.likeStatus = LikeStatus.None;

        return newPostLike as PostLikeDocument;
    }

    // makeAsNone() {
    //     if (this.likeStatus !== LikeStatus.None) {
    //         this.likeStatus = LikeStatus.None;
    //     }
    // }

    updateLikeStatus(dto: UpdatePostLikeDomainDto): boolean {
        if (this.likeStatus === dto.likeStatus) {
            return false;
        }

        this.likeStatus = dto.likeStatus;
        return true;
    }
}

export const PostLikeSchema = SchemaFactory.createForClass(PostLike);

//регистрирует методы сущности в схеме
PostLikeSchema.loadClass(PostLike);

// составной индекс для поиска конкретного лайка от конкретного юзера
// индекс уникальный
PostLikeSchema.index({ postId: 1, userId: 1 }, { unique: true });
// для быстрого поиска крайних трех лайков
PostLikeSchema.index({ postId: 1, likeStatus: 1, createdAt: -1 });
//Типизация документа
export type PostLikeDocument = HydratedDocument<PostLike>;

//Типизация модели + статические методы
export type PostLikeModelType = Model<PostLikeDocument> & typeof PostLike;
