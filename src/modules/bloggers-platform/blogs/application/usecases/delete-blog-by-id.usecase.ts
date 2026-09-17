import { Command, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BlogsCommandRepository } from '../../infrastructure/blogs.command-repository';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';

export class DeleteBlogByIdCommand extends Command<void>{
    constructor(
        public readonly blogId: string,
    ) {
        super();
    }
}

@CommandHandler(DeleteBlogByIdCommand)
export class DeleteBlogByIdCommandHandler implements ICommandHandler<DeleteBlogByIdCommand>
{
    constructor(
        private readonly blogsCommandRepository: BlogsCommandRepository,
    ) {}

    async execute(command: DeleteBlogByIdCommand): Promise<void> {
        const { blogId } = command;

        // 1. Находим доменную сущность в CommandRepository
        const blog = await this.blogsCommandRepository.SQLfindBlogById(blogId);

        if (!blog) {
            throw new DomainException({
                code: DomainExceptionCode.BlogNotFound,
                message: `Blog with id ${blogId} not found`,
            });
        }

        // вызываем доменный метод у самой сущности (изменяет поля deletedAt)
        blog.makeDeleted();

        // 3. Сохраняем измененную сущность обратно в БД
        await this.blogsCommandRepository.SQLsaveUpdate(blog);
    }
}