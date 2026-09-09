import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Comment, CommentModelType } from '../domain/comment.entity';
import { CommentViewDto } from '../api/view-dto/comments.view-dto';
import { GetCommentsQueryParams } from '../api/input-dto/get-comments-query-params.input-dto';
import { PaginatedViewDto } from '../../../../core/dto/base.paginated.view-dto';
import { PostsQueryRepository } from '../../posts/infrastructure/query/posts.query-repository';
import { CommentsQueryRepository } from '../infrastructure/query/comments.query-repository';
import { CommentsCommandRepository } from '../infrastructure/comments.command-repository';
import { CreateCommentApiInputDto } from '../api/input-dto/create-comment.api.input-dto';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';

@Injectable()
export class CommentsService {
    constructor(
        private postsQueryRepository: PostsQueryRepository,
        private commentsQueryRepository: CommentsQueryRepository,
        private commentsCommandRepository: CommentsCommandRepository,
        @InjectModel(Comment.name) private CommentModel: CommentModelType,
    ) {
        console.log('CommentsService created');
    }

    // async getCommentsForSpecificPostId({
    //     userId,
    //     postId,
    //     query,
    // }: {
    //     userId?: string | null; // параметр на будущее, когда появится вариант делать анонимные запросы и неанонимные с конкретным юзером
    //     postId: string;
    //     query: GetCommentsQueryParams;
    // }): Promise<PaginatedViewDto<CommentViewDto>> {
    //     if (!(await this.postsQueryRepository.ifPostExists(postId))) {
    //         // throw new NotFoundException("Post not found");
    //         throw new DomainException({
    //             code: DomainExceptionCode.PostNotFound,
    //             message: 'Post not found',
    //         });
    //     }
    //
    //     return await this.commentsQueryRepository.getCommentsByPostId({
    //         userId,
    //         postId,
    //         query,
    //     });
    // }

    // async createNewComment(dto: CreateCommentApiInputDto): Promise<string> {
    //     const comment = this.CommentModel.createInstance({
    //         relatedPostId: dto.relatedPostId,
    //         content: dto.content,
    //         commentatorInfo: dto.commentatorInfo,
    //     });
    //
    //     await this.commentsCommandRepository.save(comment);
    //
    //     return comment.id;
    // }
}
