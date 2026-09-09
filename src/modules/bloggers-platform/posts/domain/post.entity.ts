import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import {
    ExtendedPostModel,
    ExtendedPostModelSchema,
} from './extended-post-model.schema';
import { CreatePostDomainDto } from './dto/create-post.domain.dto';
import { HydratedDocument, Model } from 'mongoose';
import { LikeStatus } from '../../../../core/enums/like-status.enum';
import { UpdatePostInputDto } from '../dto/create-post-input.dto';
import { LatestLikeDetailViewDto } from '../dto/view-dto/latest-like-detail.view-dto';

// post entity structure for reference:
// export type PostStorageModel = {
//     _id: ObjectId;
//     id: string;
//     title: string;
//     shortDescription: string;
//     content: string;
//     blogId: string;
//     blogName: string;
//     createdAt: Date;
//     extendedLikesInfo: ExtendedPostViewModel;
// };
//
// export type ExtendedPostViewModel = {
//     likesCount: number;
//     dislikesCount: number;
//     myStatus: LikeStatus;
//     newestLikes: LikeDetailsViewModel[];
// }
//
// export type LikeDetailsViewModel = {
//     addedAt: string;
//     userId: string;
//     login: string;
// };

@Schema({ timestamps: true })
export class Post {
    @ApiProperty({
        example: 'This is my post title!',
        description: "Post's title name",
    })
    @Prop({ type: String, required: true })
    title!: string;

    @ApiProperty({
        example: 'Short description of what is this post all about',
        description: "Post's short desctiption",
    })
    @Prop({ type: String, required: true })
    shortDescription!: string;

    @ApiProperty({
        example: "Post's content...",
        description: "Post's content",
    })
    @Prop({ type: String, required: true })
    content!: string;

    @ApiProperty({
        example: '69e36dfcbb7e3d1be7ac9229',
        description: 'ID of the blog the current post is related/connected to',
    })
    @Prop({ type: String, required: true })
    blogId!: string;

    @Prop({ type: String, required: true })
    @ApiProperty({
        example: "My blog's name!",
        description:
            'Name of the blog the current post is related/connected to',
    })
    blogName!: string;

    createdAt!: Date;
    updatedAt!: Date;

    @Prop({ type: Date, nullable: true })
    deletedAt!: Date | null;

    @Prop({ type: ExtendedPostModelSchema })
    extendedLikesInfo!: ExtendedPostModel;

    get id(): string {
        // @ts-ignore
        return this._id.toString();
    }

    static createInstance(dto: CreatePostDomainDto): PostDocument {
        const { title, shortDescription, content, blogId, blogName } = dto;

        const newPost = new this();
        newPost.shortDescription = shortDescription;
        newPost.content = content;
        newPost.title = title;
        newPost.blogId = blogId;
        newPost.blogName = blogName;
        newPost.createdAt = new Date();
        newPost.deletedAt = null;
        newPost.extendedLikesInfo = {
            likesCount: 0,
            dislikesCount: 0,
            myStatus: LikeStatus.None,
            newestLikes: [],
        };
        // newPost.extendedLikesInfo = {
        //     likesCount: 0,
        //     dislikesCount: 0,
        //     myStatus: LikeStatus.None,
        //     newestLikes: []
        // };

        return newPost as PostDocument;
    }

    makeDeleted() {
        if (this.deletedAt !== null) {
            return;
        }
        this.deletedAt = new Date();
    }

    // "title": "string",
    // "shortDescription": "string",
    // "content": "string",
    // "blogId": "string"
    updatePost(dto: UpdatePostInputDto) {
        if (dto.title !== this.title) {
            this.title = dto.title;
        }
        if (dto.shortDescription !== this.shortDescription) {
            this.shortDescription = dto.shortDescription;
        }
        if (dto.content !== this.content) {
            this.content = dto.content;
        }
        if (dto.blogId !== this.blogId) {
            this.blogId = dto.blogId;
        }
    }

    updateNewestLikes(latestLikes: LatestLikeDetailViewDto[]): void {
        // this.extendedLikesInfo.newestLikes = latestLikes;
        this.extendedLikesInfo.newestLikes = [...latestLikes];
    }
}

export const PostSchema = SchemaFactory.createForClass(Post);

//регистрирует методы сущности в схеме
PostSchema.loadClass(Post);

//Типизация документа
export type PostDocument = HydratedDocument<Post>;

//Типизация модели + статические методы
export type PostModelType = Model<PostDocument> & typeof Post;
