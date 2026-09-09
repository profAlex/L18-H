import { Command, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CommentViewDto } from '../../api/view-dto/comments.view-dto';
import { CreateCommentApiInputDto } from '../../api/input-dto/create-comment.api.input-dto';
import { UsersExternalQueryRepository } from '../../../../user-accounts/infrastructure/external-query/users.external-query-repository';
import { InjectModel } from '@nestjs/mongoose';
import { Comment, CommentModelType } from '../../domain/comment.entity';
import { CommentsCommandRepository } from '../../infrastructure/comments.command-repository';
import { UserAccessTokenContextDto } from '../../../../authorisation/guards/dto/user-access-token-context.dto';
import { PostsQueryRepository } from '../../../posts/infrastructure/query/posts.query-repository';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';

export class CreateNewComment extends Command<CommentViewDto> {
    constructor(
        public readonly postId: string,
        public readonly body: CreateCommentApiInputDto,
        public readonly userId: string,
    ) {
        super();
    }
}

@CommandHandler(CreateNewComment)
export class CreateNewCommentHandler implements ICommandHandler<CreateNewComment> {
    constructor(
        private usersExternalQueryRepository: UsersExternalQueryRepository,
        private postsQueryRepository: PostsQueryRepository,
        @InjectModel(Comment.name) private CommentModel: CommentModelType,
        private commentsCommandRepository: CommentsCommandRepository,
    ) {}

    async execute({
        postId,
        body,
        userId,
    }: CreateNewComment): Promise<CommentViewDto> {
        const user =
            await this.usersExternalQueryRepository.getByIdOrNotFoundFail(
                userId,
            );

        if (!(await this.postsQueryRepository.ifPostExists(postId))) {
            throw new DomainException({
                code: DomainExceptionCode.PostNotFound,
                message: 'Post not found',
            });
        }

        const comment = this.CommentModel.createInstance({
            relatedPostId: postId,
            content: body.content,
            commentatorInfo: { userId: user.id, userLogin: user.login },
        });

        await this.commentsCommandRepository.save(comment);

        return CommentViewDto.mapToView(comment);
    }
}
