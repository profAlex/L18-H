import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

// emailConfirmationInfo = {
//     confirmationCode: UUIDGeneratorUtil.generateUUID(),
//     expirationDate: new Date(new Date().setMinutes(new Date().getMinutes() + 30),)
// };

@Schema({ _id: false })
export class EmailConfirmationInfo {
    @Prop({ type: String, unique: true, sparse: true })
    confirmationCode: string | null = null;

    @Prop({ type: Date, required: true })
    expirationDate!: Date;
}

export const EmailConfirmationInfoSchema = SchemaFactory.createForClass(
    EmailConfirmationInfo,
);
