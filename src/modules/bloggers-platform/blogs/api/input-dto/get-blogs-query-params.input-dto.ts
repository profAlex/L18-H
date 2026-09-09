import { BaseQueryParams } from '../../../../../core/dto/base.query-params.input-dto';
import { BlogsSortBy } from './blogs-sort-by';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
// import { Transform } from 'node:stream';
import { Transform } from 'class-transformer';
import { TransformFnParams } from 'class-transformer';

export class GetBlogsQueryParams extends BaseQueryParams {
    @ApiProperty({
        required: false,
        enum: BlogsSortBy,
        default: BlogsSortBy.CreatedAt,
    })
    @IsOptional()
    @IsEnum(BlogsSortBy)
    // Если sortBy не передан (undefined), принудительно возвращаем дефолт
    @Transform(({ value }) => value ?? BlogsSortBy.CreatedAt)
    sortBy: BlogsSortBy = BlogsSortBy.CreatedAt;

    @ApiProperty({ required: false })
    @IsOptional()
    @Transform(({ value }) => {
        if (typeof value === 'string') {
            return value.trim() ? value.trim() : null;
        }
        return null;
    })
    searchNameTerm: string | null = null;
}
