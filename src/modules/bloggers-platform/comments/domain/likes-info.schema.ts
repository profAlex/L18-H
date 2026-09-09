import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { LikeStatus } from '../../../../core/enums/like-status.enum';

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

@Schema({ _id: false })
export class LikesInfo {
    @Prop({ type: Number, required: true })
    likesCount!: number;

    @Prop({ type: Number, required: true })
    dislikesCount!: number;

    @Prop({
        type: String,
        enum: LikeStatus,
        default: LikeStatus.None,
    })
    myStatus!: LikeStatus;
}

export const LikesInfoSchema = SchemaFactory.createForClass(LikesInfo);
