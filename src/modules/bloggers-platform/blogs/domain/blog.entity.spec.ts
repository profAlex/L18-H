import {Blog} from "./blog.entity";
import {CreateBlogDomainDto} from "./dto/create-blog.domain.dto";

describe('Blog Entity', () => {
    it('should create a blog instance with correct fields and default values', () => {
        const dto: CreateBlogDomainDto = {
            name: 'Test Blog',
            description: 'Test Description',
            websiteUrl: 'https://test.com'
        };

        const blog = Blog.createInstance(dto);

        expect(blog.name).toBe(dto.name);
        expect(blog.description).toBe(dto.description);
        expect(blog.websiteUrl).toBe(dto.websiteUrl);
        expect(blog.isMembership).toBe(false);
        expect(blog.deletedAt).toBeNull();
    });

    it('should set deletedAt when makeDeleted is called', () => {
        // 1. Arrange
        const blog = new Blog();
        blog.deletedAt = null;

        // 2. Act
        blog.makeDeleted();

        // 3. Assert
        expect(blog.deletedAt).toBeInstanceOf(Date);
    });

    it('should update name and description', () => {
        const blog = new Blog();
        blog.name = 'Old';

        blog.updateBlog({ name: 'New', description: 'Desc', websiteUrl: 'http://..' });

        expect(blog.name).toBe('New');
    });
});