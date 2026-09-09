import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    NotFoundException,
    Param,
    Post,
    Put,
    UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CommentViewDto } from './view-dto/comments.view-dto';
import { CommentsQueryRepository } from '../infrastructure/query/comments.query-repository';
import { CreatePostApiInputDto } from '../../posts/api/input-dto/create-post.api.input-dto';
import { PostViewDto } from '../../posts/api/view-dto/posts.view-dto';
import { CreateCommentApiInputDto } from './input-dto/create-comment.api.input-dto';
import { CommentsCommandRepository } from '../infrastructure/comments.command-repository';
import { CommentsService } from '../application/comments.service';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';
import { UserAccessTokenContextDto } from '../../../authorisation/guards/dto/user-access-token-context.dto';
import { BasicAuthGuard } from '../../../authorisation/guards/basic/basic.auth-guard';
import { ExtractUserIfExistsFromRequest } from '../../../authorisation/decorators/extract-user-if-exists.decorator';
import { DeletePostById } from '../../posts/application/usecases/delete-post-by-id.usecase';
import { DeleteCommentById } from '../application/usecases/delete-comment-by-id.usecase';
import { CommandBus } from '@nestjs/cqrs';
import { UpdateCommentById } from '../application/usecases/update-comment-by-id.usecase';
import { UpdateCommentInputDto } from './input-dto/update-comment.input-dto';
import {
    JwtAuthGuard,
    JwtOptionalAuthGuard,
} from '../../../authorisation/guards/bearer/jwt.auth-guard';
import { ChangePostLikeStatusInputDto } from '../../posts/api/input-dto/change-post-like-status.input.dto';
import { ChangePostLikeStatus } from '../../posts/application/usecases/change-post-like-status.usecase';
import { ChangeCommentLikeStatusInputDto } from './input-dto/change-comment-like-status.input.dto';
import { ChangeCommentLikeStatus } from '../application/usecases/change-comment-like-status.usecase';

@ApiTags('Comments endpoint')
@Controller('comments')
export class CommentsController {
    constructor(
        private commentsQueryRepository: CommentsQueryRepository,
        private commentsCommandRepository: CommentsCommandRepository,
        private commentsService: CommentsService,
        private readonly commandBus: CommandBus,
    ) {
        console.log('CommentsController created');
    }

    @ApiOperation({ summary: 'Make like/unlike/dislike/undislike a comment' })
    @ApiParam({ name: 'commentId' })
    @HttpCode(HttpStatus.NO_CONTENT)
    @UseGuards(JwtAuthGuard)
    @Put(':commentId/like-status')
    async changeCommentLikeStatus(
        @Param('commentId') commentId: string,
        @Body() body: ChangeCommentLikeStatusInputDto,
        @ExtractUserIfExistsFromRequest() user: UserAccessTokenContextDto,
    ) {
        return this.commandBus.execute<ChangeCommentLikeStatus>(
            new ChangeCommentLikeStatus({
                commentId: commentId,
                userId: user.userId,
                newLikeStatus: body.likeStatus,
            }),
        );
    }

    @ApiOperation({ summary: 'Get comment specified by id' })
    @ApiParam({ name: 'id' })
    @UseGuards(JwtOptionalAuthGuard)
    @Get(':id')
    async getCommentById(
        @Param('id') commentId: string,
        @ExtractUserIfExistsFromRequest() user: UserAccessTokenContextDto,
    ): Promise<CommentViewDto> {
        const comment = await this.commentsQueryRepository.getCommentById(
            commentId,
            user.userId,
        );

        if (!comment) {
            // throw new NotFoundException("Comment not found!");
            throw new DomainException({
                code: DomainExceptionCode.CommentNotFound,
                message: 'Comment not found!',
            });
        }

        return comment;
    }

    @ApiOperation({ summary: 'Update comment specified by id' })
    @ApiParam({ name: 'commentId' })
    @UseGuards(JwtAuthGuard)
    @Put(':commentId')
    @HttpCode(HttpStatus.NO_CONTENT)
    async updateCommentById(
        @Param('commentId') commentId: string,
        @Body() body: UpdateCommentInputDto,
        @ExtractUserIfExistsFromRequest() user: UserAccessTokenContextDto,
    ): Promise<void> {
        return this.commandBus.execute<UpdateCommentById>(
            new UpdateCommentById(commentId, user.userId, body.content),
        );
    }

    @ApiOperation({ summary: 'Delete comment specified by id' })
    @ApiParam({ name: 'commentId' })
    @UseGuards(JwtAuthGuard)
    @Delete(':commentId')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteCommentById(
        @Param('commentId') commentId: string,
        @ExtractUserIfExistsFromRequest() user: UserAccessTokenContextDto,
    ): Promise<void> {
        return this.commandBus.execute<DeleteCommentById>(
            new DeleteCommentById(commentId, user.userId),
        );
    }
}
