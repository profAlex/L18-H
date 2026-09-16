import { BlogsQueryRepository } from '../infrastructure/query/blogs.query-repository';
import { ApiTags } from '@nestjs/swagger';
import { BlogsService } from '../application/blogs.service';
import { PostsService } from '../../posts/application/posts.service';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { GetBlogsQueryParams } from './input-dto/get-blogs-query-params.input-dto';
import { PaginatedViewDto } from '../../../../core/dto/base.paginated.view-dto';
import { BlogViewDto, SQLBlogViewDto } from './view-dto/blogs.view-dto';
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
import { BasicAuthGuard } from '../../../authorisation/guards/basic/basic.auth-guard';
import { GetPostsQueryParams } from '../../posts/api/input-dto/get-posts-query-params.input-dto';
import { ExtractUserIfExistsFromRequest } from '../../../authorisation/decorators/extract-user-if-exists.decorator';
import { UserAccessTokenContextDto } from '../../../authorisation/guards/dto/user-access-token-context.dto';
import { PostViewDto } from '../../posts/api/view-dto/posts.view-dto';
import { GetPostsByBlogIdQuery } from '../application/usecases/get-posts-by-blog-id.usecase';
import { CreateBlogInputDto } from './input-dto/blogs.input-dto';
import { GetBlogByIdQuery } from '../application/usecases/get-blog-by-id.usecase';
import { CreateBlogCommand } from '../application/usecases/create-blog.usecase';
import { CreateBlogPostInputDto } from './input-dto/create-blog-post.input-dto';
import { GetPostById } from '../../posts/application/usecases/get-post-by-id.usecase';
import { CreatePostForBlogCommand } from '../application/usecases/create-post.usecase';

@ApiTags('SA Blogs endpoint')
@Controller('sa/blogs')
export class SaBlogsController {
    constructor(
        private blogsQueryRepository: BlogsQueryRepository,
        private blogsService: BlogsService,
        private postsService: PostsService,
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {
        console.log('SuperAdmin BlogsController created');
    }

    // Returns blogs with paging
    @UseGuards(BasicAuthGuard)
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

    // Create new blog
    @UseGuards(BasicAuthGuard)
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async createNewBlog(
        @Body() body: CreateBlogInputDto,
    ): Promise<SQLBlogViewDto> {
        const blogId = await this.commandBus.execute<string>(
            new CreateBlogCommand(body),
        );

        return this.queryBus.execute<SQLBlogViewDto>(
            new GetBlogByIdQuery(blogId),
        );
    }


    // Create new post for specific blog
    @UseGuards(BasicAuthGuard)
    @Post(':blogId/posts')
    @HttpCode(HttpStatus.CREATED)
    async createPostByBlogId(
        @Param('blogId') blogId: string,
        @Body() body: CreateBlogPostInputDto,
    ): Promise<PostViewDto> {
        // 1. Вызываем команду создания поста и получаем его ID
        const postId = await this.commandBus.execute<string>(
            new CreatePostForBlogCommand(blogId, body),
        );

        // 2. Вызываем query-хэндлер для получения готового PostViewDto
        return this.queryBus.execute<PostViewDto>(
            new GetPostById(postId, undefined),
        );
    }




    // Returns all posts for specified blog
    @UseGuards(BasicAuthGuard)
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
}
