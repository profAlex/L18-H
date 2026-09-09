import { Command, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdatePostInputDto } from '../../dto/create-post-input.dto';
import { PostsCommandRepository } from '../../infrastructure/posts.command-repository';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';

export class UpdatePostById extends Command<void> {
    constructor(
        public readonly postId: string,
        public readonly updateInputData: UpdatePostInputDto,
    ) {
        super();
    }
}

@CommandHandler(UpdatePostById)
export class UpdatePostByIdHandler implements ICommandHandler<UpdatePostById> {
    constructor(private postsCommandRepository: PostsCommandRepository) {}

    async execute({ postId, updateInputData }: UpdatePostById): Promise<void> {
        const post =
            await this.postsCommandRepository.findSinglePostById(postId);
        if (!post) {
            // throw new NotFoundException("Post not found");
            throw new DomainException({
                code: DomainExceptionCode.PostNotFound,
                message: 'Post not found',
            });
        }

        post.updatePost(updateInputData);
        await this.postsCommandRepository.save(post);
    }
}
