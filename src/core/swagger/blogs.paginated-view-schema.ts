import { PaginatedViewDto } from '../dto/base.paginated.view-dto';
import { BlogViewDto } from '../../modules/bloggers-platform/blogs/api/view-dto/blogs.view-dto';
import { ApiProperty } from '@nestjs/swagger';

export class SwaggerBlogsPaginatedViewDto extends PaginatedViewDto<BlogViewDto> {
    @ApiProperty({ type: [BlogViewDto], description: 'Список блогов' })
    items!: BlogViewDto[];
}
