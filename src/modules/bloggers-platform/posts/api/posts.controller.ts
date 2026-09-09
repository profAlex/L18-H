import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
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
import { PaginatedViewDto } from '../../../../core/dto/base.paginated.view-dto';
import { CommentViewDto } from '../../comments/api/view-dto/comments.view-dto';
import { GetCommentsQueryParams } from '../../comments/api/input-dto/get-comments-query-params.input-dto';
import { CommentsService } from '../../comments/application/comments.service';
import { GetPostsQueryParams } from './input-dto/get-posts-query-params.input-dto';
import { PostViewDto } from './view-dto/posts.view-dto';
import { PostsService } from '../application/posts.service';
import { PostsQueryRepository } from '../infrastructure/query/posts.query-repository';
import { CreatePostApiInputDto } from './input-dto/create-post.api.input-dto';
import { UpdatePostInputDto } from '../dto/create-post-input.dto';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { GetCommentsForSpecificPostId } from '../../comments/application/usecases/get-comments-for-specified-post-id.usecase';
import { GetAllPosts } from '../application/usecases/get-all-posts.usecase';
import { CreatePost } from '../application/usecases/create-post.usecase';
import { GetPostById } from '../application/usecases/get-post-by-id.usecase';
import { UpdatePostById } from '../application/usecases/update-post-by-id.usecase';
import { DeletePostById } from '../application/usecases/delete-post-by-id.usecase';
import { BasicAuthGuard } from '../../../authorisation/guards/basic/basic.auth-guard';
import { CreateCommentApiInputDto } from '../../comments/api/input-dto/create-comment.api.input-dto';
import {
    JwtAuthGuard,
    JwtOptionalAuthGuard,
} from '../../../authorisation/guards/bearer/jwt.auth-guard';
import { CreateNewComment } from '../../comments/application/usecases/create-new-comment.usecase';
import { ExtractUserIfExistsFromRequest } from '../../../authorisation/decorators/extract-user-if-exists.decorator';
import { UserAccessTokenContextDto } from '../../../authorisation/guards/dto/user-access-token-context.dto';
import { ChangePostLikeStatusInputDto } from './input-dto/change-post-like-status.input.dto';
import { ChangePostLikeStatus } from '../application/usecases/change-post-like-status.usecase';

@ApiTags('Posts endpoint')
@Controller('posts')
export class PostsController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {
        console.log('PostsController created');
    }

    // Make like/unlike/dislike/undislike operation
    @ApiOperation({ summary: 'Make like/unlike/dislike/undislike a post' })
    @ApiParam({ name: 'postId' })
    @HttpCode(HttpStatus.NO_CONTENT)
    @UseGuards(JwtAuthGuard)
    @Put(':postId/like-status')
    async changePostLikeStatus(
        @Param('postId') postId: string,
        @Body() body: ChangePostLikeStatusInputDto,
        @ExtractUserIfExistsFromRequest() user: UserAccessTokenContextDto,
    ) {
        return this.commandBus.execute<ChangePostLikeStatus>(
            new ChangePostLikeStatus({
                postId: postId,
                userId: user.userId,
                newLikeStatus: body.likeStatus,
            }),
        );
    }

    // Returns comments for specified post
    @ApiOperation({ summary: 'Returns comments for specified post' })
    @ApiParam({ name: 'postId' }) //для сваггера
    @UseGuards(JwtOptionalAuthGuard)
    @Get(':postId/comments')
    async getCommentsByPostId(
        @Param('postId') postId: string,
        @Query() query: GetCommentsQueryParams,
        @ExtractUserIfExistsFromRequest() user: UserAccessTokenContextDto,
    ): Promise<PaginatedViewDto<CommentViewDto>> {
        return this.queryBus.execute<GetCommentsForSpecificPostId>(
            new GetCommentsForSpecificPostId(postId, query, user?.userId),
        );
    }

    // Create new comment
    @ApiOperation({ summary: 'Create new comment' })
    @ApiParam({ name: 'postId' })
    @UseGuards(JwtAuthGuard)
    @Post(':postId/comments')
    async createNewComment(
        @Param('postId') postId: string,
        @Body() body: CreateCommentApiInputDto,
        @ExtractUserIfExistsFromRequest() user: UserAccessTokenContextDto,
    ): Promise<CommentViewDto> {
        return this.commandBus.execute<CreateNewComment>(
            new CreateNewComment(postId, body, user.userId),
        );
    }

    // Returns all posts
    @ApiOperation({ summary: 'Returns all posts' })
    @UseGuards(JwtOptionalAuthGuard)
    @Get()
    @HttpCode(HttpStatus.OK)
    async getAllPosts(
        @Query() query: GetPostsQueryParams,
        @ExtractUserIfExistsFromRequest() user: UserAccessTokenContextDto,
    ): Promise<PaginatedViewDto<PostViewDto>> {
        return this.queryBus.execute<GetAllPosts>(
            new GetAllPosts(query, user?.userId),
        );
    }

    // Create new post
    @ApiOperation({ summary: 'Create new post' })
    @UseGuards(BasicAuthGuard)
    @Post()
    async createPost(
        @Body() body: CreatePostApiInputDto,
    ): Promise<PostViewDto> {
        return this.commandBus.execute<CreatePost>(new CreatePost(body));
    }

    // Return post by id
    @ApiOperation({ summary: 'Return post by id' })
    @ApiParam({ name: 'id' })
    @UseGuards(JwtOptionalAuthGuard)
    @Get(':id')
    @HttpCode(HttpStatus.OK)
    async getPostById(
        @Param('id') postId: string,
        @ExtractUserIfExistsFromRequest() user: UserAccessTokenContextDto,
    ): Promise<PostViewDto> {
        // console.log('USER ID: ', user?.id);
        // console.log('POST ID: ', postId);

        return this.queryBus.execute<GetPostById>(
            new GetPostById(postId, user?.userId),
        );
    }

    // Update existing post by id with InputModel
    @ApiOperation({ summary: 'Update existing post by id with InputModel' })
    @ApiParam({ name: 'id' })
    @UseGuards(BasicAuthGuard)
    @Put(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async updatePostById(
        @Param('id') id: string,
        @Body() body: UpdatePostInputDto,
    ): Promise<void> {
        return this.commandBus.execute<UpdatePostById>(
            new UpdatePostById(id, body),
        );
    }

    // Delete post specified by id
    @ApiOperation({ summary: 'Delete post specified by id' })
    @ApiParam({ name: 'id' })
    @UseGuards(BasicAuthGuard)
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deletePostId(@Param('id') id: string): Promise<void> {
        return this.commandBus.execute<DeletePostById>(new DeletePostById(id));
    }
}
