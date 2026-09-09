import {Injectable} from "@nestjs/common";
import {Blog, BlogDocument, BlogModelType} from "../domain/blog.entity";
import {InjectModel} from "@nestjs/mongoose";

@Injectable()
export class BlogsCommandRepository {
    constructor(@InjectModel(Blog.name)
                private BlogModel: BlogModelType,){}

    async save(blog: BlogDocument): Promise<void> {
        await blog.save();
    }

    // async delete(blogId: string): Promise<boolean> {
    //     const result = await this.BlogModel.deleteOne({ _id: blogId });
    //     return result.deletedCount === 1;
    // }

    async getBlogDocumentById(blogId: string): Promise<BlogDocument | null> {
        return this.BlogModel.findOne({_id: blogId, deletedAt: null});
    }
}