import {
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Put,
    Query,
    UseGuards,
} from '@nestjs/common';
import { GetBlogsQueryParams } from './input-dto/get-blogs-query-params.input-dto';
import { PaginatedViewDto } from '../../../../core/dto/base.paginated.view-dto';
import { BlogViewDto, SQLBlogViewDto } from './view-dto/blogs.view-dto';
import { SwaggerBlogsPaginatedViewDto } from '../../../../core/swagger/blogs.paginated-view-schema';
import { CreateBlogInputDto } from './input-dto/blogs.input-dto';
import { GetPostsQueryParams } from '../../posts/api/input-dto/get-posts-query-params.input-dto';
import { PostViewDto } from '../../posts/api/view-dto/posts.view-dto';

import { BlogsService } from '../application/blogs.service';
import { PostsService } from '../../posts/application/posts.service';

import { BlogsQueryRepository } from '../infrastructure/query/blogs.query-repository';
import { CreateBlogPostInputDto } from './input-dto/create-blog-post.input-dto';
import { UpdateBlogInputDto } from '../dto/create-blog.dto';
import { BasicAuthGuard } from '../../../authorisation/guards/basic/basic.auth-guard';
import { JwtOptionalAuthGuard } from '../../../authorisation/guards/bearer/jwt.auth-guard';
import { ExtractUserIfExistsFromRequest } from '../../../authorisation/decorators/extract-user-if-exists.decorator';
import { UserAccessTokenContextDto } from '../../../authorisation/guards/dto/user-access-token-context.dto';
import {
    GetPostsByBlogIdQuery,
    GetPostsByBlogIdQueryHandler,
} from '../application/usecases/get-posts-by-blog-id.usecase';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { GetBlogByIdQuery } from '../application/usecases/get-blog-by-id.usecase';

// const insertQuery = `
//             INSERT INTO public.post_likes (post_id, user_id, status, added_at)
//             VALUES ($1, $2, $3, NOW())
//             ON CONFLICT (post_id, user_id)
//             DO UPDATE SET
//                status = EXCLUDED.status,
//                added_at = NOW();
//
//
//         `;


@ApiTags('Blogs endpoint')
@Controller('blogs')
export class BlogsController {
    constructor(
        private blogsQueryRepository: BlogsQueryRepository,
        private blogsService: BlogsService,
        private postsService: PostsService,
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {
        console.log('BlogsController created');
    }

    // Returns blogs with paging
    @ApiOperation({
        summary: 'Получить все блоги',
        description:
            'Возвращает список блогов с поддержкой пагинации, поиска по имени и сортировки',
    })
    @ApiOkResponse({
        description: 'Успех',
        type: SwaggerBlogsPaginatedViewDto, // Используем специальный класс для вывода в сваггер с "плоской" структурой, потмоу что PaginatedViewDto<T> сваггер не подхватит красиво и то что внутри items не отобразит
    })
    @Get()
    @HttpCode(HttpStatus.OK)
    async getALlBlogs(
        @Query() query: GetBlogsQueryParams,
    ): Promise<PaginatedViewDto<SQLBlogViewDto>> {

        // тут все-таки не делать USEcase?
        // Query (Запросы) — только читают данные (SELECT). Их НЕ оборачивают в Use Cases,
        // а вызывают напрямую через Query Repository из контроллера.

        return this.blogsQueryRepository.SQLgetAllBlogs(query);
    }


    // Returns all posts for specified blog
    @ApiOperation({
        summary: 'Получить посты',
        description: 'Получить все посты, относящиеся к ID блоггера',
    })
    @ApiParam({ name: 'blogId' }) //для сваггера
    // TODO: надо сделать плоский класс чтобы swagger подхватил то тчо внутри items[] находится, по аналогии с SwaggerBlogsPaginatedViewDto
    @ApiOkResponse({ type: PaginatedViewDto<PostViewDto> })
    // @UseGuards(JwtOptionalAuthGuard)
    @Get(':blogId/posts')
    @HttpCode(HttpStatus.OK)
    async getPostsByBlogId(
        @Param('blogId') blogId: string,
        @Query() query: GetPostsQueryParams,
        @ExtractUserIfExistsFromRequest() user: UserAccessTokenContextDto,
    ): Promise<PaginatedViewDto<PostViewDto>> {
        return this.queryBus.execute<PaginatedViewDto<PostViewDto>>(
            new GetPostsByBlogIdQuery(blogId, query, user?.userId),
        );
    }


    // Returns blog by id
    @Get(':id')
    @HttpCode(HttpStatus.OK)
    async getBlogById(@Param('id') id: string): Promise<SQLBlogViewDto> {
        return this.queryBus.execute<SQLBlogViewDto>(new GetBlogByIdQuery(id));
    }


    //**************************************************************************
    //**************************************************************************








    // Create new blog
    @UseGuards(BasicAuthGuard)
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async createNewBlog(
        @Body() body: CreateBlogInputDto,
    ): Promise<BlogViewDto> {
        const blogId = await this.blogsService.createNewBlog(body);

        return this.blogsQueryRepository.getBlogByIdOrNotFoundFail(blogId);
    }


    // Create new post for specific blog
    @UseGuards(BasicAuthGuard)
    @Post(':blogId/posts')
    @HttpCode(HttpStatus.CREATED)
    async createPostByBlogId(
        @Param('blogId') blogId: string,
        @Body() body: CreateBlogPostInputDto,
    ): Promise<PostViewDto> {
        return this.postsService.createPostByBlogId({ blogId, body });
    }



    // Update existing Blog by id with InputModel
    @UseGuards(BasicAuthGuard)
    @Put(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async updateBlogById(
        @Param('id') id: string,
        @Body() body: UpdateBlogInputDto,
    ): Promise<void> {
        return this.blogsService.updateBlogById({
            blogId: id,
            ...body,
        });
    }

    // Delete blog specified by id
    @UseGuards(BasicAuthGuard)
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteBlogById(@Param('id') id: string): Promise<void> {
        return this.blogsService.deleteBlogById(id);
    }
}
