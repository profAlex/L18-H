import { Command, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UsersExternalQueryRepository } from '../../../../user-accounts/infrastructure/external-query/users.external-query-repository';
import { InjectModel } from '@nestjs/mongoose';
import { Comment, CommentModelType } from '../../domain/comment.entity';
import { CommentsCommandRepository } from '../../infrastructure/comments.command-repository';
import { CreateNewComment } from './create-new-comment.usecase';
import { CommentViewDto } from '../../api/view-dto/comments.view-dto';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';

export class DeleteCommentById extends Command<void> {
    constructor(
        public readonly commentId: string,
        public readonly userId: string,
    ) {
        super();
    }
}

@CommandHandler(DeleteCommentById)
export class DeleteCommentByIdHandler implements ICommandHandler<DeleteCommentById> {
    constructor(
        private usersExternalQueryRepository: UsersExternalQueryRepository,
        @InjectModel(Comment.name) private CommentModel: CommentModelType,
        private commentsCommandRepository: CommentsCommandRepository,
    ) {}

    async execute({ commentId, userId }: DeleteCommentById): Promise<void> {
        const comment =
            await this.commentsCommandRepository.getCommentById(commentId);

        if (!comment) {
            throw new DomainException({
                code: DomainExceptionCode.CommentNotFound,
                message: 'Comment not found',
            });
        }

        if (userId !== comment.commentatorInfo.userId) {
            throw new DomainException({
                code: DomainExceptionCode.Forbidden,
                message: 'Forbidden to delete comment',
            });
        }

        comment.makeDeleted();
        await this.commentsCommandRepository.save(comment);
    }
}
