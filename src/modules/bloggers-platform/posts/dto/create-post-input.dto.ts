import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePostInputDto {
    @ApiProperty({ type: String, required: true })
    @Transform(({ value }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString()
    @IsNotEmpty()
    @MaxLength(30)
    title: string = ''; // Инициализируем пустой строкой

    @ApiProperty({ type: String })
    @Transform(({ value }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    shortDescription: string = '';

    @ApiProperty({ type: String, required: true })
    @Transform(({ value }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString()
    @IsNotEmpty()
    @MaxLength(1000)
    content: string = '';
}

// "title": "string",
// "shortDescription": "string",
// "content": "string",
// "blogId": "string"
export class UpdatePostInputDto {
    @ApiProperty({ type: String, required: true })
    @Transform(({ value }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString()
    @IsNotEmpty()
    @MaxLength(30)
    title: string = '';

    @ApiProperty({ type: String, required: true })
    @Transform(({ value }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    shortDescription: string = '';

    @ApiProperty({ type: String, required: true })
    @Transform(({ value }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString()
    @IsNotEmpty()
    @MaxLength(1000)
    content: string = '';

    @ApiProperty({ type: String, required: true })
    @Transform(({ value }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString()
    @IsNotEmpty()
    blogId: string = '';
}
