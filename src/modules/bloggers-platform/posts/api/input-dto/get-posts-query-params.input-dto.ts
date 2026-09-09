import { BaseQueryParams } from '../../../../../core/dto/base.query-params.input-dto';
import { ApiProperty } from '@nestjs/swagger';
import { PostsSortBy } from './posts-sort-by';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';

export class GetPostsQueryParams extends BaseQueryParams {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsEnum(PostsSortBy)
    // Если sortBy не передан (undefined), принудительно возвращаем дефолт
    @Transform(({ value }) => value ?? PostsSortBy.CreatedAt)
    sortBy = PostsSortBy.CreatedAt;
}
