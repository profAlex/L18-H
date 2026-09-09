//
// //     _id: ObjectId;
// //     id: string;
// //     name: string;
// //     description: string;
// //     websiteUrl: string;
// //     createdAt: Date;
// //     isMembership: boolean;
// import {BlogDocument} from "../../domain/blog.entity";
//
// export class BlogViewDto {
//     id: string;
//     name: string;
//     description: string;
//     websiteUrl: string;
//     createdAt: Date;
//     isMembership: boolean;
//
//     static mapToView(blog: any): BlogViewDto {
//         return {
//             id: blog._id ? blog._id.toString() : blog.id,
//             name: blog.name,
//             description: blog.description,
//             websiteUrl: blog.websiteUrl,
//             createdAt: blog.createdAt instanceof Date
//                 ? blog.createdAt.toISOString()
//                 : blog.createdAt,
//             isMembership: blog.isMembership
//         };
//     }
// }

//     _id: ObjectId;
//     id: string;
//     name: string;
//     description: string;
//     websiteUrl: string;
//     createdAt: Date;
//     isMembership: boolean;
import { Blog, BlogDocument } from '../../domain/blog.entity';
import { Types } from 'mongoose';

export class BlogViewDto {
    id: string;
    name: string;
    description: string;
    websiteUrl: string;
    createdAt: string;
    isMembership: boolean;

    constructor(blog: Blog & { _id: Types.ObjectId }) {
        this.id = blog.id || blog._id.toString();
        this.name = blog.name;
        this.description = blog.description;
        this.websiteUrl = blog.websiteUrl;
        this.createdAt =
            blog.createdAt instanceof Date
                ? blog.createdAt.toISOString()
                : new Date(blog.createdAt).toISOString();
        // if (
        //     blog.createdAt instanceof Date &&
        //     !isNaN(blog.createdAt.getTime())
        // ) {
        //     this.createdAt = blog.createdAt.toISOString();
        // } else {
        //     // Если прилетела строка, пробуем её распарсить
        //     const parsedDate = new Date(blog.createdAt);
        //     this.createdAt = !isNaN(parsedDate.getTime())
        //         ? parsedDate.toISOString()
        //         : new Date().toISOString(); // <-- Спасительный парашют: если дата битая/undefined, берем текущую
        // }
        this.isMembership = blog.isMembership;
    }

    static mapToView(blog: Blog & { _id: Types.ObjectId }): BlogViewDto {
        return new BlogViewDto(blog);
    }
}
