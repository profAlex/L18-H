import { Command, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SQLUpdatePostInputDto } from '../../../posts/dto/create-post-input.dto';
import { PostsCommandRepository } from '../../../posts/infrastructure/posts.command-repository';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';

export class UpdatePostByBlogIdPostIdCommand extends Command<void> {
    constructor(
        public readonly blogId: string,
        public readonly postId: string,
        public readonly updateInputData: SQLUpdatePostInputDto,
    ) {
        super();
    }
}

@CommandHandler(UpdatePostByBlogIdPostIdCommand)
export class UpdatePostByBlogIdPostIdHandler implements ICommandHandler<UpdatePostByBlogIdPostIdCommand> {
    constructor(private postsCommandRepository: PostsCommandRepository) {}

    async execute({ blogId, postId, updateInputData }: UpdatePostByBlogIdPostIdCommand): Promise<void> {
        const post =
            await this.postsCommandRepository.SQLfindSinglePostById({blogId, postId});

        if (!post) {
            // throw new NotFoundException("Post not found");
            throw new DomainException({
                code: DomainExceptionCode.PostNotFound,
                message: 'Post not found',
            });
        }

        post.updatePost(updateInputData);
        await this.postsCommandRepository.SQLsave(post);
    }
}
