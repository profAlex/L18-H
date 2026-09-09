import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { LikeStatus } from '../../../../core/enums/like-status.enum';
import {
    LikeDetailsModel,
    LikeDetailsModelSchema,
} from './like-details-model.schema';

// export type ExtendedPostViewModel = {
//     likesCount: number;
//     dislikesCount: number;
//     myStatus: LikeStatus;
//     newestLikes: LikeDetailsViewModel[];
// }

@Schema({ _id: false })
export class ExtendedPostModel {
    @Prop({ type: Number })
    likesCount!: number;

    @Prop({ type: Number })
    dislikesCount!: number;

    @Prop({
        type: String,
        enum: LikeStatus,
    })
    myStatus!: LikeStatus;

    @Prop({
        type: [LikeDetailsModelSchema],
        default: [],
    })
    newestLikes!: LikeDetailsModel[];
}

export const ExtendedPostModelSchema =
    SchemaFactory.createForClass(ExtendedPostModel);
