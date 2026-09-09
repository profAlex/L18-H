import { IsDate, IsNotEmpty, IsString } from 'class-validator';

export class UserRefreshTokenContextAndMetaDataDto {
    @IsString()
    @IsNotEmpty()
    userId!: string;

    @IsString()
    @IsNotEmpty()
    deviceId!: string;

    @IsString()
    @IsNotEmpty()
    sessionId!: string;

    @IsDate()
    issuedAt!: Date;

    @IsDate()
    expiresAt!: Date;
}