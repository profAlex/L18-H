import { Command, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UsersExternalQueryRepository } from '../../../../user-accounts/infrastructure/external-query/users.external-query-repository';
import { InjectModel } from '@nestjs/mongoose';
import { Comment, CommentModelType } from '../../domain/comment.entity';
import { CommentsCommandRepository } from '../../infrastructure/comments.command-repository';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';

export class UpdateCommentById extends Command<void> {
    constructor(
        public readonly commentId: string,
        public readonly userId: string,
        public readonly content: string,
    ) {
        super();
    }
}

@CommandHandler(UpdateCommentById)
export class UpdateCommentByIdHandler implements ICommandHandler<UpdateCommentById> {
    constructor(
        private usersExternalQueryRepository: UsersExternalQueryRepository,
        @InjectModel(Comment.name) private CommentModel: CommentModelType,
        private commentsCommandRepository: CommentsCommandRepository,
    ) {}

    async execute({
        commentId,
        userId,
        content,
    }: UpdateCommentById): Promise<void> {
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
                message: 'Forbidden to update comment',
            });
        }

        const isContentChanged = comment.updateComment({ content });
        if (isContentChanged) {
            await this.commentsCommandRepository.save(comment);
        }
    }
}
