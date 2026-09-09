//dto для запроса списка юзеров с пагинацией, сортировкой, фильтрами
import { UsersSortBy } from './users-sort-by';
import { BaseQueryParams } from '../../../../core/dto/base.query-params.input-dto';
import {IsOptional, IsString} from "class-validator";
import {ApiProperty} from "@nestjs/swagger";

//наследуемся от класса BaseQueryParams, где уже есть pageNumber, pageSize и т.п., чтобы не дублировать эти свойства
export class GetUsersQueryParams extends BaseQueryParams {
  @ApiProperty({ required: false, default: 'createdAt' })
  @IsOptional()
  @IsString() // Защита от whitelist для sortBy
  sortBy: string = UsersSortBy.CreatedAt;

  @ApiProperty({ required: false, default: null })
  @IsOptional()
  @IsString()
  searchLoginTerm: string | null = null;

  @ApiProperty({ required: false, default: null })
  @IsOptional()
  @IsString()
  searchEmailTerm: string | null = null;
}
