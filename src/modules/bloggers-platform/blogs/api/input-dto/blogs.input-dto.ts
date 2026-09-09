import { ApiProperty } from '@nestjs/swagger';
import {
    IsEmail,
    IsNotEmpty,
    IsString,
    Matches,
    MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateBlogInputDto {
    @ApiProperty()
    @IsString()
    @Transform(({ value }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsNotEmpty()
    @MaxLength(15)
    name: string = '';

    @ApiProperty()
    @IsString()
    @Transform(({ value }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsNotEmpty()
    @MaxLength(500)
    description: string = '';

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    @Matches(
        /^https:\/\/([a-zA-Z0-9_-]+\.)+[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)*\/?$/,
        {
            message: 'websiteUrl must be a valid https URL',
        },
    )
    websiteUrl: string = '';
}
