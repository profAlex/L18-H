import { ApiProperty } from '@nestjs/swagger';
import { LikeStatus } from '../../../../../core/enums/like-status.enum';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class ChangePostLikeStatusInputDto {
    @ApiProperty({
        enum: LikeStatus,
        description: 'Like reaction from user',
        example: LikeStatus.Like,
    })
    @IsNotEmpty()
    @IsEnum(LikeStatus, {
        message: `Like reaction should be one of the following: ${Object.values(LikeStatus).join(', ')}`,
    })
    likeStatus!: LikeStatus;
}
