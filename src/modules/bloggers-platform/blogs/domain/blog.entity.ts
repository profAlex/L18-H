import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { HydratedDocument, Model } from 'mongoose';
import { CreateBlogDomainDto } from './dto/create-blog.domain.dto';
import { UpdateBlogInputDto } from '../dto/create-blog.dto';

// type-fields for reference:
// export type BloggerCollectionStorageModel = {
//     _id: ObjectId;
//     id: string;
//     name: string;
//     description: string;
//     websiteUrl: string;
//     createdAt: Date;
//     isMembership: boolean;
// };

@Schema({ timestamps: true })
export class Blog {
    /**
     * Name of the blog
     * @type {string}
     * @required
     */
    @ApiProperty({
        example: 'This is my super blog!',
        description: "Blog's name",
    })
    @Prop({ type: String, required: true })
    name!: string;

    /**
     *
     */
    @ApiProperty({
        example: 'This is my super blog',
        description: "Blog's description name",
    })
    @Prop({ type: String, required: true })
    description!: string;

    @ApiProperty({
        example: 'www.my_web_site.org',
        description: "Blogger's personal website address",
    })
    @Prop({ type: String, required: true })
    websiteUrl!: string;

    /**
     * Creation timestamp
     * Explicitly defined despite timestamps: true
     * properties without @Prop for typescript so that they are in the class instance (or in instance methods)
     * @type {Date}
     */
    createdAt!: Date;
    updatedAt!: Date;

    /**
     * Deletion timestamp, nullable, if date exist, means entity soft deleted
     * @type {Date | null}
     */
    @Prop({ type: Date, default: null })
    deletedAt!: Date | null;

    @ApiProperty({
        example: false,
        description:
            'True if user has not expired membership subscription to blog',
    })
    @Prop({ type: Boolean, required: true, default: false })
    isMembership!: boolean;

    /**
     * Virtual property to get the stringified ObjectId
     * @returns {string} The string representation of the ID
     */
    get id(): string {
        // @ts-ignore
        return this._id.toString();
    }

    //     _id: ObjectId;
    //     id: string;
    //     name: string;
    //     description: string;
    //     websiteUrl: string;
    //     createdAt: Date;
    //     isMembership: boolean;
    /**
     * Factory method to create a Blog instance
     * @param {CreateBlogDto} dto - The data transfer object for blog creation
     * @returns {BlogDocument} The created blog document
     * DDD started: как создать сущность, чтобы она не нарушала бизнес-правила? Делегируем это создание статическому методу
     */
    static createInstance(dto: CreateBlogDomainDto): BlogDocument {
        const newBlog = new this();
        newBlog.name = dto.name;
        newBlog.description = dto.description;
        newBlog.websiteUrl = dto.websiteUrl;
        newBlog.isMembership = false;
        newBlog.deletedAt = null;

        return newBlog as BlogDocument;
    }

    /**
     * Marks the blog as deleted
     * Throws an error if already deleted
     * @throws {Error} If the entity is already deleted
     * DDD continue: инкапсуляция (вызываем методы, которые меняют состояние\св-ва) объектов согласно правилам этого объекта
     */
    //TODO: надо сделать каскадное makeDelete для постов (как и для комментариев в будущем)
    makeDeleted() {
        if (this.deletedAt !== null) {
            return;
            // throw new Error('Blog entity already deleted');
            // Когда в Service или Domain слое вылетает обычный new Error,
            // NestJS не считает это "запланированной" ошибкой (как NotFoundException).
            // Он расценивает это как критический сбой и автоматически отдает
            // 500 Internal Server Error.
            // можно было бы использовать NotFoundException (в таком случае нест не упадет с 500 ошибкой) -
            // но архитектурно это крайне неправильно, этот слой не должен кидать такие специфические
            // исключения, «Домен» (бизнес-логика) должен быть максимально независим от того, как к нему
            // обращаются.
        }
        this.deletedAt = new Date();
    }

    // name: string;
    // description: string;
    // websiteUrl: string;
    /**
     * Updates the blog instance with new data
     * Resets name, description and websiteUrl
     * @param {UpdateUserDto} dto - The data transfer object for blog updates
     * DDD continue: инкапсуляция (вызываем методы, которые меняют состояние\св-ва) объектов согласно правилам этого объекта
     */
    updateBlog(dto: UpdateBlogInputDto) {
        if (dto.name !== this.name) {
            this.name = dto.name;
        }
        if (dto.description !== this.description) {
            this.description = dto.description;
        }
        if (dto.websiteUrl !== this.websiteUrl) {
            this.websiteUrl = dto.websiteUrl;
        }
    }
}

export const BlogSchema = SchemaFactory.createForClass(Blog);

//регистрирует методы сущности в схеме
BlogSchema.loadClass(Blog);

//Типизация документа
export type BlogDocument = HydratedDocument<Blog>;

//Типизация модели + статические методы
export type BlogModelType = Model<BlogDocument> & typeof Blog;
