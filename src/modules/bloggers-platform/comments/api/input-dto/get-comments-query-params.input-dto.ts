import {BaseQueryParams} from "../../../../../core/dto/base.query-params.input-dto";
import {ApiProperty} from "@nestjs/swagger";
import {CommentsSortBy} from "./comments-sort-by";

export class GetCommentsQueryParams extends BaseQueryParams{
    @ApiProperty({required: false})
    sortBy = CommentsSortBy.CreatedAt;
}