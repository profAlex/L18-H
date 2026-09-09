import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

// export type CommentatorInfo = {
//     userId: string;
//     userLogin: string;
// };

@Schema({
    _id: false,
})
export class CommentatorInfo {
    @Prop({ type: String, required: true })
    userId!: string;

    @Prop({ type: String, required: false })
    userLogin!: string;
}

export const CommentatorInfoSchema =
    SchemaFactory.createForClass(CommentatorInfo);
