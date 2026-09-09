import {Post} from "./post.entity";
import {CreatePostDomainDto} from "./dto/create-post.domain.dto";
import {LikeStatus} from "../../../../core/enums/like-status.enum";
import {UpdatePostInputDto} from "../dto/create-post-input.dto";

describe('Post entity', () => {

    it('makeDeleted should create Post entity with correct fields/properties when called', () => {
        const testDto:CreatePostDomainDto = {
            title: 'some-title',
            shortDescription: 'some-short-description',
            content: 'some-content',
            blogId: 'some-blogId',
            blogName: 'some-blogName',
        }

        const testPost = Post.createInstance(testDto);

        expect(testPost.shortDescription).toEqual('some-short-description');
        expect(testPost.content).toEqual('some-content');
        expect(testPost.title).toEqual('some-title');
        expect(testPost.blogId).toEqual('some-blogId');
        expect(testPost.blogName).toEqual('some-blogName');
        expect(testPost.createdAt).toBeInstanceOf(Date);

        expect(testPost.deletedAt).toBeDefined();

        expect(testPost.extendedLikesInfo).toBeDefined();
        expect(testPost.extendedLikesInfo.likesCount).toBeDefined();
        expect(testPost.extendedLikesInfo.dislikesCount).toBeDefined();
        expect(testPost.extendedLikesInfo.myStatus).toEqual(LikeStatus.None);
        expect(testPost.extendedLikesInfo.newestLikes).toBeInstanceOf(Array);
        expect(testPost.extendedLikesInfo.newestLikes.length).toBe(0);
    });


    it('makeDeleted should set deletedAt with a proper Data value when called', () => {
        const testDto: CreatePostDomainDto = {
            title: 'some-title',
            shortDescription: 'some-short-description',
            content: 'some-content',
            blogId: 'some-blogId',
            blogName: 'some-blogName',
        }
        const testPost = Post.createInstance(testDto);

        testPost.makeDeleted();

        expect(testPost.deletedAt).toBeInstanceOf(Date);
    });


    it('updatePost should update title, shortDescription and content', () => {
        const testDto:CreatePostDomainDto = {
            title: 'some-title',
            shortDescription: 'some-short-description',
            content: 'some-content',
            blogId: 'some-blogId',
            blogName: 'some-blogName',
        }
        const testPost = Post.createInstance(testDto);
        const newTitleDto:UpdatePostInputDto ={
            title: 'new-title',
            shortDescription: 'new-description',
            content: 'new-content',
            blogId: 'some-blogId'
        };

        testPost.updatePost(newTitleDto);

        expect(testPost.title).toBe('new-title');
        expect(testPost.shortDescription).toBe('new-description');
        expect(testPost.content).toBe('new-content');
        expect(testPost.blogId).toBe('some-blogId');
    });
});