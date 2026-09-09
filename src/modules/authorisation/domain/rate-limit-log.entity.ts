import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Model } from 'mongoose';
import { CreateRateLimitSessionPayload } from './payload/create-rate-limit-session.domain.payload';

@Schema()
export class RateLimitLog {
    @Prop({ type: String, required: true })
    deviceIP!: string;

    @Prop({ type: String, required: true })
    deviceName!: string;

    @Prop({ type: String, required: true })
    calledURL!: string;

    @Prop({ type: Date, required: true, expires: '30s' })
    dateOfRequest!: Date;

    get id() {
        // @ts-ignore
        return this._id.toString();
    }

    static createInstance(
        sessionPayload: CreateRateLimitSessionPayload,
    ): RateLimitLogDocument {
        const newRateLimitSession = new this();

        newRateLimitSession.deviceIP = sessionPayload.deviceIP;
        newRateLimitSession.deviceName = sessionPayload.deviceName;
        newRateLimitSession.calledURL = sessionPayload.calledURL;

        newRateLimitSession.dateOfRequest = new Date();

        return newRateLimitSession as RateLimitLogDocument;
    }
}

export const RateLimitLogSchema = SchemaFactory.createForClass(RateLimitLog);

RateLimitLogSchema.loadClass(RateLimitLog);

RateLimitLogSchema.index({ deviceIP: 1, deviceName: 1, calledURL: 1 });

export type RateLimitLogDocument = HydratedDocument<RateLimitLog>;

export type RateLimitLogModelType = Model<RateLimitLogDocument> &
    typeof RateLimitLog;
