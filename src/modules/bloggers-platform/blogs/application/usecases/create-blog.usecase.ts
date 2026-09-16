import { Command, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SQLBlogViewDto } from '../../api/view-dto/blogs.view-dto';
import { CreateBlogInputDto } from '../../api/input-dto/blogs.input-dto';
import { CreateUser } from '../../../../user-accounts/application/usecases/create-user.usecase';
import { UsersCommandRepository } from '../../../../user-accounts/infrastructure/users.command-repository';
import { CryptoService } from '../../../../../core/bcrypt/bcrypt.service';
import { InternalServerErrorException } from '@nestjs/common';
import { UUIDGeneratorUtil } from '../../../../../core/uuid-generation/uuid.service';
import { SQLUser } from '../../../../user-accounts/domain/sql-user.entitry';
import { BlogsQueryRepository } from '../../infrastructure/query/blogs.query-repository';
import { BlogsCommandRepository } from '../../infrastructure/blogs.command-repository';
import { SQLBlog } from '../../domain/sql-blog.entity';

export class CreateBlogCommand extends Command<string> {
    constructor (
        public readonly blogInputDto: CreateBlogInputDto,
    ) {
        super();
    }
}

@CommandHandler(CreateBlogCommand)
export class CreateBlogCommandHandler implements ICommandHandler<CreateBlogCommand> {
    constructor(
        private blogsCommandRepository: BlogsCommandRepository,
    ) {}

    async execute(command: CreateBlogCommand): Promise<string> {
        const { name, description, websiteUrl } = command.blogInputDto;


        // создаем чистую доменную сущность (без Mongoose и без DI)
        const newBlog = SQLBlog.createInstance({
            name,
            description,
            websiteUrl
        });

        // сохраняем в PostgreSQL через Command-репозиторий
        await this.blogsCommandRepository.SQLsave(newBlog);

        return newBlog.id;
    }
}
