import { CreatePostInputDto } from '../../dto/create-post-input.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePostApiInputDto extends CreatePostInputDto {
    @ApiProperty({ type: String, required: true })
    @Transform(({ value }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString()
    @IsNotEmpty()
    blogId: string = '';
}
