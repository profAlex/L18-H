import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';
import { Command, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PostsCommandRepository } from '../../infrastructure/posts.command-repository';

export class DeletePostById extends Command<void> {
    constructor(public readonly postId: string) {
        super();
    }
}

@CommandHandler(DeletePostById)
export class DeletePostByIdHandler implements ICommandHandler<DeletePostById> {
    constructor(private postsCommandRepository: PostsCommandRepository) {}

    async execute({ postId }: DeletePostById): Promise<void> {
        const post =
            await this.postsCommandRepository.findSinglePostById(postId);
        if (!post) {
            // throw new NotFoundException("Post not found");
            throw new DomainException({
                code: DomainExceptionCode.PostNotFound,
                message: 'Post not found',
            });
        }

        post.makeDeleted();
        await this.postsCommandRepository.save(post);
    }
}
