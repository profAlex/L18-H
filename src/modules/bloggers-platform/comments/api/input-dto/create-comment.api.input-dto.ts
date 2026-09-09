import { ApiProperty } from '@nestjs/swagger';
import { CommentatorInfo } from '../../domain/commentator-info.schema';
import { LikesInfo } from '../../domain/likes-info.schema';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCommentApiInputDto {
    // @ApiProperty()
    // relatedPostId: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @MaxLength(300)
    @MinLength(20)
    content: string = '';

    // @ApiProperty()
    // commentatorInfo: CommentatorInfo;
}
