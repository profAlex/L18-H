import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCommentInputDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @MaxLength(300)
    @MinLength(20)
    content: string = '';
}
