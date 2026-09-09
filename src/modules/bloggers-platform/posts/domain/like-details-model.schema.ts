import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

// export type LikeDetailsViewModel = {
//     addedAt: string;
//     userId: string;
//     login: string;
// };

@Schema({ _id: false })
export class LikeDetailsModel {
    @Prop({ type: String })
    addedAt!: string;

    @Prop({ type: String })
    userId!: string;

    @Prop({ type: String })
    login!: string;
}

export const LikeDetailsModelSchema =
    SchemaFactory.createForClass(LikeDetailsModel);
