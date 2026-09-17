import { Command, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SQLUpdatePostInputDto } from '../../../posts/dto/create-post-input.dto';
import { PostsCommandRepository } from '../../../posts/infrastructure/posts.command-repository';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';

export class DeletePostByBlogIdPostIdCommand extends Command<void> {
    constructor(
        public readonly blogId: string,
        public readonly postId: string,
    ) {
        super();
    }
}

@CommandHandler(DeletePostByBlogIdPostIdCommand)
export class DeletePostByBlogIdPostIdCommandHandler implements ICommandHandler<DeletePostByBlogIdPostIdCommand> {
    constructor(private postsCommandRepository: PostsCommandRepository) {}

    async execute({ blogId, postId }: DeletePostByBlogIdPostIdCommand): Promise<void> {
        const post =
            await this.postsCommandRepository.SQLfindSinglePostById({blogId, postId});

        if (!post) {
            // throw new NotFoundException("Post not found");
            throw new DomainException({
                code: DomainExceptionCode.PostNotFound,
                message: 'Post not found',
            });
        }

        post.makeDeleted();
        await this.postsCommandRepository.SQLsave(post);
    }
}